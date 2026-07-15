const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");

/**
 * Budget Service
 * Handles CRUD for user budgets.
 */

/**
 * Set or update a monthly budget for a category.
 * @param {string} userId
 * @param {{ category: string, amount: number }} data
 * @returns {Promise<object>}
 */
async function setBudget(userId, { category, amount, accountId = null }) {
  const existing = await prisma.budget.findFirst({
    where: {
      userId,
      category,
      accountId
    }
  });

  if (existing) {
    return prisma.budget.update({
      where: { id: existing.id },
      data: { amount },
    });
  } else {
    return prisma.budget.create({
      data: {
        userId,
        category,
        amount,
        accountId
      }
    });
  }
}

/**
 * Get all budgets for a user.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getBudgets(userId) {
  return prisma.budget.findMany({
    where: { userId },
    include: {
      account: {
        select: { id: true, name: true }
      }
    }
  });
}

/**
 * Delete a budget for a category.
 * @param {string} userId
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteBudget(userId, id) {
  try {
    const existing = await prisma.budget.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      throw new AppError("Budget not found.", 404);
    }
    
    await prisma.budget.delete({
      where: { id },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Get all active budget alerts for a user.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getAlerts(userId) {
  return prisma.budgetAlert.findMany({
    where: { userId },
    orderBy: { triggeredAt: "desc" },
    take: 50,
  });
}

/**
 * Check if the new expense crosses any budget thresholds.
 * Called in the background after an expense is created.
 * 
 * @param {string} userId 
 * @param {object} expense 
 */
async function checkBudgetThresholds(userId, expense) {
  // 1. Get the budget for this category
  const budget = await prisma.budget.findUnique({
    where: { userId_category: { userId, category: expense.category } },
  });

  if (!budget) return; // No budget set

  // 2. Calculate total spent this month deterministically
  const d = new Date(expense.date);
  const startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

  const aggregation = await prisma.expense.aggregate({
    where: {
      userId,
      category: expense.category,
      deletedAt: null,
      date: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  });

  const totalSpent = parseFloat(aggregation._sum.amount?.toString() || "0");
  const budgetAmount = parseFloat(budget.amount.toString());
  const percentUsed = (totalSpent / budgetAmount) * 100;

  // 3. Determine highest threshold crossed
  let thresholdCrossed = null;
  if (percentUsed >= 100) thresholdCrossed = 100;
  else if (percentUsed >= 90) thresholdCrossed = 90;
  else if (percentUsed >= 50) thresholdCrossed = 50;

  if (!thresholdCrossed) return;

  // 4. Check if we already alerted for this threshold this month
  const existingAlert = await prisma.budgetAlert.findFirst({
    where: {
      userId,
      category: expense.category,
      threshold: thresholdCrossed,
      triggeredAt: { gte: startDate, lt: endDate },
    },
  });

  if (existingAlert) return; // Already alerted

  // 5. Generate AI message (narrating the deterministic numbers)
  let message = `You have reached ${Math.round(percentUsed)}% of your ${expense.category} budget.`;
  
  try {
    const { getGroqClient } = require("./ai/groq");
    const client = getGroqClient();

    const prompt = `You are a helpful financial assistant. 
The user just spent $${expense.amount} at ${expense.vendor}, bringing their total ${expense.category} spending this month to $${totalSpent}. 
Their monthly budget for ${expense.category} is $${budgetAmount} (which means they have used ${Math.round(percentUsed)}%).
Write a single, friendly, helpful 1-sentence notification alerting them to this threshold. Do not invent any numbers.`;

    const chatCompletion = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_completion_tokens: 60,
    });

    const text = chatCompletion.choices[0]?.message?.content?.trim();
    if (text) {
      message = text;
    }
  } catch (error) {
    console.warn("[BUDGET] AI alert generation failed, falling back to default message.", error.message);
  }

  // 6. Save the alert
  await prisma.budgetAlert.create({
    data: {
      userId,
      category: expense.category,
      threshold: thresholdCrossed,
      message,
    },
  });
}

/**
 * Get progress for all budgets in the current month.
 * @param {string} userId
 * @param {string} accountId
 * @returns {Promise<object[]>}
 */
async function getBudgetProgress(userId, accountId = null) {
  const whereBudgets = { userId };
  if (accountId) {
    whereBudgets.OR = [{ accountId }, { accountId: null }];
  }
  const budgets = await prisma.budget.findMany({ where: whereBudgets });
  if (!budgets.length) return [];

  // Aggregate limits by category (to handle multiple account budgets for the same category)
  const categoryLimits = {};
  for (const b of budgets) {
    categoryLimits[b.category] = (categoryLimits[b.category] || 0) + parseFloat(b.amount.toString());
  }

  const d = new Date();
  const startDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

  const aggregation = await prisma.expense.groupBy({
    by: ['category'],
    where: {
      userId,
      deletedAt: null,
      ...(accountId ? { accountId } : {}),
      date: { gte: startDate, lt: endDate },
      category: { in: Object.keys(categoryLimits) },
    },
    _sum: { amount: true },
  });

  const spentMap = {};
  for (const group of aggregation) {
    spentMap[group.category] = parseFloat(group._sum.amount?.toString() || "0");
  }

  return Object.entries(categoryLimits).map(([category, limit]) => {
    const spent = spentMap[category] || 0;
    return {
      category,
      limit,
      spent,
      percentUsed: Math.min(100, Math.round((spent / limit) * 100))
    };
  }).sort((a, b) => b.percentUsed - a.percentUsed);
}

module.exports = { setBudget, getBudgets, deleteBudget, getAlerts, checkBudgetThresholds, getBudgetProgress };
