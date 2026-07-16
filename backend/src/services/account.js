const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");

/**
 * Account Service — manages user accounts for multi-context expense tracking.
 */

async function createAccount(userId, { name, type = "BANK", isDefault = false, totalBudget = null }) {
  // Check for duplicate name
  const existing = await prisma.account.findUnique({
    where: { userId_name: { userId, name } },
  });
  if (existing) {
    throw new AppError(`An account named "${name}" already exists.`, 409);
  }

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.account.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return tx.account.create({
      data: { userId, name, type, isDefault, totalBudget },
    });
  });
}

async function listAccounts(userId) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { expenses: { where: { deletedAt: null } } } },
    },
  });
}

async function updateAccount(accountId, userId, data) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!existing) {
    throw new AppError("Account not found.", 404);
  }

  // Check name uniqueness if renaming
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.account.findUnique({
      where: { userId_name: { userId, name: data.name } },
    });
    if (duplicate) {
      throw new AppError(`An account named "${data.name}" already exists.`, 409);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.account.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return tx.account.update({
      where: { id: accountId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.totalBudget !== undefined && { totalBudget: data.totalBudget }),
      },
    });
  });
}

async function deleteAccount(accountId, userId) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
    include: { _count: { select: { expenses: { where: { deletedAt: null } } } } },
  });
  if (!existing) {
    throw new AppError("Account not found.", 404);
  }

  if (existing._count.expenses > 0) {
    throw new AppError(
      `Cannot delete account "${existing.name}" — it has ${existing._count.expenses} active expense(s). Reassign or delete them first.`,
      409
    );
  }

  await prisma.account.delete({ where: { id: accountId } });
  return { success: true };
}

/**
 * Ensure a user has at least one default "Personal" account.
 * Called during signup or first login.
 */
async function ensureDefaultAccount(userId) {
  const existing = await prisma.account.findFirst({ where: { userId } });
  if (existing) return existing;

  return prisma.account.create({
    data: { userId, name: "Personal", type: "BANK", isDefault: true },
  });
}

module.exports = { createAccount, listAccounts, updateAccount, deleteAccount, ensureDefaultAccount };
