const { Router } = require("express");
const { authenticate } = require("../middleware/auth");
const authRoutes = require("./auth");
const expenseRoutes = require("./expenses");
const scanRoutes = require("./scan");
const budgetRoutes = require("./budget");
const insightsRoutes = require("./insights");
const accountRoutes = require("./account");

const router = Router();

// ─── Public routes ───
router.use("/auth", authRoutes);

// ─── Protected routes (require JWT) ───
router.use("/api/expenses/scan", authenticate, scanRoutes);
router.use("/api/expenses", authenticate, expenseRoutes);
router.use("/api/budget", authenticate, budgetRoutes);
router.use("/api/insights", authenticate, insightsRoutes);
router.use("/api/accounts", authenticate, accountRoutes);

module.exports = router;
