const { Router } = require("express");
const insightsService = require("../services/insights");

const router = Router();

/**
 * GET /api/insights/summary
 * Fetch deterministic aggregation metrics.
 */
router.get("/summary", async (req, res, next) => {
  try {
    const range = req.query.range || '1m';
    const accountId = req.query.accountId || null;
    const data = await insightsService.getSummaryMetrics(req.user.id, range, accountId);

    res.status(200).json({
      message: "Summary retrieved successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/insights/narrative
 * Fetch AI-generated natural language insights based on the summary data.
 */
router.get("/narrative", async (req, res, next) => {
  try {
    const range = req.query.range || '1m';
    const accountId = req.query.accountId || null;
    const narrative = await insightsService.generateInsights(req.user.id, range, accountId);

    res.status(200).json({
      message: "Insights retrieved successfully.",
      data: { narrative },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
