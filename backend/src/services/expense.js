const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const { computeSourceHash } = require("../utils/hash");
const { sanitizeObject } = require("../utils/sanitize");
const { logAudit } = require("./audit");
const { invalidateCachePattern } = require("../lib/redis");
const { checkBudgetThresholds } = require("./budget");

/**
 * Expense service — the shared write/read layer.
 *
 * CRITICAL DESIGN DECISION (Architecture Plan, Section 4, Step 6):
 * createExpense() is THE SINGLE write function for both manual entry
 * AND AI-confirmed proposals. There is no separate, less-scrutinized
 * write path for AI output.
 *
 * "AI proposes, deterministic code decides."
 */

/**
 * Create an expense — the SINGLE shared write path.
 */
async function createExpense(data, userId, meta = {}) {
  // ─── Step 1: Sanitize text fields ───
  const sanitized = sanitizeObject(
    { vendor: data.vendor, description: data.description || "" },
    { descriptionFields: ["description"] }
  );

  // ─── Step 2: Compute sourceHash (deterministic dedup key) ───
  const sourceHash = computeSourceHash(sanitized.vendor, data.amount, data.date);

  // ─── Step 3: Check for duplicate ───
  const existingExpense = await prisma.expense.findFirst({
    where: {
      userId,
      sourceHash,
      deletedAt: null,
    },
    select: {
      id: true,
      vendor: true,
      amount: true,
      date: true,
      category: true,
      createdBy: true,
      createdAt: true,
    },
  });

  // ─── Step 4: Handle duplicate ───
  if (existingExpense && !data.force) {
    await logAudit({
      expenseId: existingExpense.id,
      userId,
      action: "FLAGGED_DUPLICATE",
      rawAiOutput: meta.rawAiOutput || null,
      validationResult: `DUPLICATE: Matches existing expense ${existingExpense.id} ` +
        `(${existingExpense.vendor}, ${existingExpense.amount}, ${existingExpense.date.toISOString().split("T")[0]})`,
    });

    throw new AppError(
      `This looks like a duplicate of an expense you already added on ` +
        `${existingExpense.date.toISOString().split("T")[0]} ` +
        `(${existingExpense.vendor}, $${existingExpense.amount}). ` +
        `Set "force": true to add it anyway.`,
      409,
      "DUPLICATE_EXPENSE"
    );
  }

  // ─── Step 5: Create the expense ───
  const expense = await prisma.expense.create({
    data: {
      userId,
      accountId: data.accountId || null,
      amount: data.amount,
      category: data.category,
      vendor: sanitized.vendor,
      date: new Date(data.date),
      description: sanitized.description || null,
      receiptUrl: data.receiptUrl || null,
      sourceHash,
      createdBy: data.createdBy,
      aiConfidence: data.aiConfidence || null,
    },
  });

  // ─── Step 6: Audit log — success ───
  await logAudit({
    expenseId: expense.id,
    userId,
    action: "CREATED",
    rawAiOutput: meta.rawAiOutput || null,
    validationResult: existingExpense
      ? "PASSED (force-created despite duplicate)"
      : "PASSED",
  });

  // ─── Step 7: Post-creation hooks (Cache & Alerts) ───
  await invalidateCachePattern(`summary:${userId}:*`);
  await invalidateCachePattern(`insights:${userId}:*`);

  checkBudgetThresholds(userId, expense).catch(err => {
    console.error("[BUDGET] Background check failed:", err.message);
  });

  return {
    expense,
    isDuplicate: !!existingExpense,
    existingExpense: existingExpense || undefined,
  };
}

/**
 * Update an expense — writes an EDITED audit log with previousValues.
 * The expense row is updated, but the audit trail preserves what changed.
 */
async function updateExpense(expenseId, userId, data) {
  // 1. Fetch existing expense (must belong to user and not deleted)
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, userId, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Expense not found.", 404);
  }

  // 2. Build the update data and record previous values
  const previousValues = {};
  const updateData = {};

  if (data.amount !== undefined && parseFloat(data.amount) !== parseFloat(existing.amount.toString())) {
    previousValues.amount = parseFloat(existing.amount.toString());
    updateData.amount = data.amount;
  }
  if (data.category !== undefined && data.category !== existing.category) {
    previousValues.category = existing.category;
    updateData.category = data.category;
  }
  if (data.vendor !== undefined && data.vendor !== existing.vendor) {
    const sanitized = sanitizeObject({ vendor: data.vendor }, {});
    previousValues.vendor = existing.vendor;
    updateData.vendor = sanitized.vendor;
  }
  if (data.date !== undefined) {
    const newDate = new Date(data.date);
    if (newDate.getTime() !== existing.date.getTime()) {
      previousValues.date = existing.date.toISOString();
      updateData.date = newDate;
    }
  }
  if (data.description !== undefined && data.description !== existing.description) {
    previousValues.description = existing.description;
    const sanitized = sanitizeObject({ description: data.description || "" }, { descriptionFields: ["description"] });
    updateData.description = sanitized.description || null;
  }
  if (data.accountId !== undefined && data.accountId !== existing.accountId) {
    previousValues.accountId = existing.accountId;
    updateData.accountId = data.accountId;
  }

  if (Object.keys(updateData).length === 0) {
    return existing; // No actual changes
  }

  // 3. Recompute sourceHash if vendor/amount/date changed
  if (updateData.vendor || updateData.amount || updateData.date) {
    const newVendor = updateData.vendor || existing.vendor;
    const newAmount = updateData.amount || parseFloat(existing.amount.toString());
    const newDate = updateData.date ? updateData.date.toISOString() : existing.date.toISOString();
    updateData.sourceHash = computeSourceHash(newVendor, newAmount, newDate);
  }

  // 4. Update the expense
  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: updateData,
  });

  // 5. Write audit log with previousValues
  await logAudit({
    expenseId,
    userId,
    action: "EDITED",
    previousValues,
    validationResult: `EDITED: Changed fields: ${Object.keys(previousValues).join(", ")}`,
  });

  // 6. Invalidate caches
  await invalidateCachePattern(`summary:${userId}:*`);
  await invalidateCachePattern(`insights:${userId}:*`);

  return updated;
}

/**
 * Soft-delete an expense — sets deletedAt, writes DELETED audit log.
 * The expense row is NOT hard-deleted; it stays for audit integrity.
 */
async function softDeleteExpense(expenseId, userId) {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, userId, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Expense not found.", 404);
  }

  // Soft-delete
  await prisma.expense.update({
    where: { id: expenseId },
    data: { deletedAt: new Date() },
  });

  // Audit log
  await logAudit({
    expenseId,
    userId,
    action: "DELETED",
    previousValues: {
      amount: parseFloat(existing.amount.toString()),
      category: existing.category,
      vendor: existing.vendor,
      date: existing.date.toISOString(),
    },
    validationResult: `DELETED: Soft-deleted expense ${expenseId} (${existing.vendor}, $${existing.amount})`,
  });

  // Invalidate caches
  await invalidateCachePattern(`summary:${userId}:*`);
  await invalidateCachePattern(`insights:${userId}:*`);

  return { success: true };
}

/**
 * List expenses for a user with pagination and filters.
 * Now supports multi-category, source, and accountId filters.
 * Excludes soft-deleted expenses.
 */
async function listExpenses(userId, options) {
  const { page, limit, category, source, accountId, startDate, endDate, sortBy, order, search } = options;
  const skip = (page - 1) * limit;

  // Build where clause — always exclude soft-deleted
  const where = { userId, deletedAt: null };

  // Multi-category filter (array of category keys)
  if (category && Array.isArray(category) && category.length > 0) {
    where.category = { in: category };
  }

  // Source filter
  if (source) {
    where.createdBy = source;
  }

  // Account filter
  if (accountId && Array.isArray(accountId) && accountId.length > 0) {
    where.accountId = { in: accountId };
  } else if (accountId && typeof accountId === 'string') {
    where.accountId = accountId;
  }

  if (search) {
    where.OR = [
      { vendor: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  // Execute query + count in parallel
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
      select: {
        id: true,
        amount: true,
        category: true,
        vendor: true,
        date: true,
        description: true,
        receiptUrl: true,
        createdBy: true,
        aiConfidence: true,
        sourceHash: true,
        accountId: true,
        account: {
          select: { id: true, name: true, type: true }
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single expense by ID (must belong to the requesting user).
 */
async function getExpenseById(expenseId, userId) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, userId, deletedAt: null },
    include: {
      auditLogs: {
        orderBy: { timestamp: "desc" },
        select: {
          id: true,
          action: true,
          previousValues: true,
          validationResult: true,
          timestamp: true,
        },
      },
    },
  });

  if (!expense) {
    throw new AppError("Expense not found.", 404);
  }

  return expense;
}

module.exports = { createExpense, updateExpense, softDeleteExpense, listExpenses, getExpenseById };
