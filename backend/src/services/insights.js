const prisma = require("../lib/prisma");
const { getGroqClient } = require("./ai/groq");
const config = require("../config");
const { getOrSetCache } = require("../lib/redis");

/**
 * Insights Service
 * Handles aggregation queries (totals, category breakdowns, MoM deltas)
 * and natural-language insight generation.
 */

/**
 * Fetch raw summary metrics deterministically via Prisma/SQL.
 * Cached in Redis to prevent re-querying on every dashboard load.
 *
 * @param {string} userId
 * @param {string} range ('7d', '1m', '3m', '6m', '1y')
 * @param {string} accountId
 * @returns {Promise<object>}
 */
async function getSummaryMetrics(userId, range = '1m', accountId = null) {
  const endDate = new Date();
  const startDate = new Date();
  
  let days = 30;
  if (range === '7d') days = 7;
  else if (range === '1m') days = 30;
  else if (range === '3m') days = 90;
  else if (range === '6m') days = 180;
  else if (range === '1y') days = 365;
  
  startDate.setDate(startDate.getDate() - days);

  // Previous period dates for comparison (e.g. previous 30 days)
  const prevEndDate = new Date(startDate);
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);

  const cacheKey = `summary:${userId}:${range}${accountId ? `:${accountId}` : ''}`;

  return getOrSetCache(cacheKey, 60 * 60, async () => {
    
    const baseWhere = {
      userId,
      deletedAt: null,
      ...(accountId ? { accountId } : {})
    };

    // 1. Current period total & category breakdown
    const dateFilter = range === 'all' ? {} : { date: { gte: startDate, lte: endDate } };
    
    const currentPeriodExpenses = await prisma.expense.groupBy({
      by: ["category"],
      where: {
        ...baseWhere,
        ...dateFilter
      },
      _sum: { amount: true },
    });

    // 2. Previous period total for comparison
    const previousPeriodTotal = range === 'all' ? { _sum: { amount: 0 } } : await prisma.expense.aggregate({
      where: {
        ...baseWhere,
        date: { gte: prevStartDate, lt: prevEndDate },
      },
      _sum: { amount: true },
    });

    // 3. Format the data
    let totalSpend = 0;
    const categoryBreakdown = {};

    for (const group of currentPeriodExpenses) {
      const amount = parseFloat(group._sum.amount?.toString() || "0");
      totalSpend += amount;
      categoryBreakdown[group.category] = amount;
    }

    const prevTotal = parseFloat(previousPeriodTotal._sum.amount?.toString() || "0");
    const delta = prevTotal > 0 ? ((totalSpend - prevTotal) / prevTotal) * 100 : 0;

    return {
      range,
      totalSpend,
      previousPeriodTotal: prevTotal,
      periodOverPeriodDeltaPercent: Math.round(delta * 100) / 100,
      categoryBreakdown,
    };
  });
}

/**
 * Generate a natural language insight using Gemini based on pre-computed data.
 * Architecture Plan, Section 5: "AI is not allowed to invent numbers — it only narrates numbers your code already computed."
 *
 * @param {string} userId
 * @param {string} range
 * @param {string} accountId
 * @returns {Promise<string>}
 */
async function generateInsights(userId, range = '1m', accountId = null) {
  const cacheKey = `insights:${userId}:${range}${accountId ? `:${accountId}` : ''}`;

  return getOrSetCache(cacheKey, 24 * 60 * 60, async () => {
    // 1. Get the deterministic numbers first
    const data = await getSummaryMetrics(userId, range, accountId);

    // If no spending, return early
    if (data.totalSpend === 0) {
      return "No expenses recorded for this period yet. Start tracking to see insights.";
    }

    // 2. Construct prompt forcing AI to only narrate
    const prompt = `You are a helpful financial assistant for ExpenseIQ.
I will give you pre-computed spending data for this period (last ${range}).
Your job is ONLY to narrate this data in a short, friendly, 2-3 sentence paragraph.
DO NOT invent any numbers. DO NOT offer financial advice. Just summarize what happened.

Data:
- Total spent this period: $${data.totalSpend}
- Previous period total: $${data.previousPeriodTotal}
- Period-over-period change: ${data.periodOverPeriodDeltaPercent > 0 ? '+' : ''}${data.periodOverPeriodDeltaPercent}%
- Breakdown: ${JSON.stringify(data.categoryBreakdown)}

Write the short paragraph now:`;

    // 3. Call AI with graceful fallback
    try {
      const client = getGroqClient();

      const chatCompletion = await client.chat.completions.create({
        messages: [
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_completion_tokens: 150,
      });

      const text = chatCompletion.choices[0]?.message?.content?.trim();
      return text || "Unable to generate insights at this time.";
    } catch (error) {
      console.warn("[INSIGHTS] Groq AI call failed, returning fallback:", error.message);
      // Graceful deterministic fallback — narrate the numbers ourselves
      const topCategory = Object.entries(data.categoryBreakdown)
        .sort(([, a], [, b]) => b - a)[0];
      const delta = data.periodOverPeriodDeltaPercent;
      let fallback = `This period you've spent $${data.totalSpend.toFixed(2)} total.`;
      if (topCategory) {
        fallback += ` Your highest category is ${topCategory[0]} at $${topCategory[1].toFixed(2)}.`;
      }
      if (delta !== 0) {
        fallback += ` That's ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)}% from the previous period.`;
      }
      return fallback;
    }
  });
}

module.exports = { getSummaryMetrics, generateInsights };
