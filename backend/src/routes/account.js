const { Router } = require("express");
const validate = require("../middleware/validate");
const { createAccountSchema, updateAccountSchema } = require("../validators/account");
const accountService = require("../services/account");

const router = Router();

/**
 * POST /api/accounts
 * Create a new account.
 */
router.post("/", validate(createAccountSchema), async (req, res, next) => {
  try {
    const account = await accountService.createAccount(req.user.id, req.body);
    res.status(201).json({
      message: "Account created successfully.",
      data: { account },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/accounts
 * List all accounts for the user.
 */
router.get("/", async (req, res, next) => {
  try {
    const accounts = await accountService.listAccounts(req.user.id);
    res.status(200).json({
      message: "Accounts retrieved successfully.",
      data: { accounts },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/accounts/:id
 * Update an account (rename, change type).
 */
router.put("/:id", validate(updateAccountSchema), async (req, res, next) => {
  try {
    const account = await accountService.updateAccount(req.params.id, req.user.id, req.body);
    res.status(200).json({
      message: "Account updated successfully.",
      data: { account },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/accounts/:id
 * Delete an account (only if no active expenses).
 */
router.delete("/:id", async (req, res, next) => {
  try {
    await accountService.deleteAccount(req.params.id, req.user.id);
    res.status(200).json({
      message: "Account deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
