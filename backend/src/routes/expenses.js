const { Router } = require("express");
const validate = require("../middleware/validate");
const {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
} = require("../validators/expense");
const expenseService = require("../services/expense");

const router = Router();

/**
 * POST /api/expenses
 * Create an expense — the SINGLE shared write endpoint.
 */
router.post("/", validate(createExpenseSchema), async (req, res, next) => {
  try {
    const result = await expenseService.createExpense(req.body, req.user.id);

    res.status(201).json({
      message: result.isDuplicate
        ? "Expense created (duplicate was force-confirmed by user)."
        : "Expense created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/expenses
 * List user's expenses with pagination and filters.
 */
router.get("/", validate(listExpensesSchema, "query"), async (req, res, next) => {
  try {
    const result = await expenseService.listExpenses(req.user.id, req.query);

    res.status(200).json({
      message: "Expenses retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/expenses/:id
 * Get a single expense by ID (must belong to the requesting user).
 * Includes audit log history for that expense.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      message: "Expense retrieved successfully.",
      data: { expense },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/expenses/:id
 * Update an expense. Writes an EDITED audit log with previousValues.
 */
router.put("/:id", validate(updateExpenseSchema), async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(
      req.params.id,
      req.user.id,
      req.body
    );

    res.status(200).json({
      message: "Expense updated successfully.",
      data: { expense },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/expenses/:id
 * Soft-delete an expense. Writes a DELETED audit log.
 */
router.delete("/:id", async (req, res, next) => {
  try {
    await expenseService.softDeleteExpense(req.params.id, req.user.id);

    res.status(200).json({
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
