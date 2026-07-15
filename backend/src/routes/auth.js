const { Router } = require("express");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/auth");
const authService = require("../services/auth");

const router = Router();

/**
 * POST /auth/register
 * Create a new account.
 * Body: { email, password, name } — validated by Zod before handler runs.
 */
router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.body);

    res.status(201).json({
      message: "Account created successfully.",
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login
 * Authenticate and receive a JWT.
 * Body: { email, password } — validated by Zod before handler runs.
 */
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.body);

    res.status(200).json({
      message: "Login successful.",
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
