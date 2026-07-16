const { Router } = require("express");
const validate = require("../middleware/validate");
const { setBudgetSchema } = require("../validators/budget");
const budgetService = require("../services/budget");

const router = Router();

/**
 * POST /api/budget
 * Set or update a budget for a category.
 */
router.post("/", validate(setBudgetSchema), async (req, res, next) => {
  try {
    const budget = await budgetService.setBudget(req.user.id, req.body);
    res.status(200).json({
      message: "Budget set successfully.",
      data: { budget },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/budget
 * Get all budgets for the user.
 */
router.get("/", async (req, res, next) => {
  try {
    const budgets = await budgetService.getBudgets(req.user.id);
    res.status(200).json({
      message: "Budgets retrieved successfully.",
      data: { budgets },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/budget/:id
 * Remove a budget by ID.
 */
router.delete("/:id", async (req, res, next) => {
  try {
    await budgetService.deleteBudget(req.user.id, req.params.id);
    res.status(200).json({
      message: "Budget removed successfully.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/budget/alerts
 * Get active budget alerts for the user.
 */
router.get("/alerts", async (req, res, next) => {
  try {
    const alerts = await budgetService.getAlerts(req.user.id);
    res.status(200).json({
      message: "Alerts retrieved successfully.",
      data: { alerts },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/budget/progress
 * Get progress for all budgets in the current month.
 */
router.get("/progress", async (req, res, next) => {
  try {
    const accountId = req.query.accountId || null;
    const { progress, totalProgress } = await budgetService.getBudgetProgress(req.user.id, accountId);
    res.status(200).json({
      message: "Budget progress retrieved successfully.",
      data: { progress, totalProgress },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
