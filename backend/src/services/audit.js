const prisma = require("../lib/prisma");

/**
 * Audit service — writes to ExpenseAuditLog.
 *
 * Every write attempt (success, validation failure, duplicate flag)
 * gets a row here. This table is append-only and immutable —
 * it's the "tamper-evident" financial history trail.
 *
 * Architecture Plan, Step 7:
 * "Every attempt (success, validation failure, duplicate flag)
 *  is written to ExpenseAuditLog"
 */

/**
 * Log an audit entry for an expense-related action.
 *
 * @param {{
 *   expenseId?: string | null,
 *   userId: string,
 *   action: "CREATED" | "FLAGGED_DUPLICATE" | "REJECTED",
 *   rawAiOutput?: object | null,
 *   validationResult: string,
 * }} entry
 * @returns {Promise<object>} The created audit log entry
 */
async function logAudit({
  expenseId = null,
  userId,
  action,
  rawAiOutput = null,
  previousValues = null,
  validationResult,
}) {
  try {
    const auditEntry = await prisma.expenseAuditLog.create({
      data: {
        expenseId,
        userId,
        action,
        rawAiOutput,
        previousValues,
        validationResult,
      },
    });

    return auditEntry;
  } catch (error) {
    // Audit logging should never crash the main operation.
    // Log the failure but don't throw — the expense write is more important.
    console.error("[AUDIT] Failed to write audit log:", error);
    return null;
  }
}

/**
 * Get audit logs for a specific expense.
 * @param {string} expenseId
 * @returns {Promise<object[]>}
 */
async function getAuditLogsByExpenseId(expenseId) {
  return prisma.expenseAuditLog.findMany({
    where: { expenseId },
    orderBy: { timestamp: "desc" },
  });
}

/**
 * Get all audit logs for a user (admin or self-service).
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} options
 * @returns {Promise<{ logs: object[], total: number }>}
 */
async function getAuditLogsByUserId(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.expenseAuditLog.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
      include: {
        expense: {
          select: { id: true, vendor: true, amount: true, date: true },
        },
      },
    }),
    prisma.expenseAuditLog.count({ where: { userId } }),
  ]);

  return { logs, total };
}

module.exports = { logAudit, getAuditLogsByExpenseId, getAuditLogsByUserId };
