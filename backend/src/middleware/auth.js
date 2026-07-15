const jwt = require("jsonwebtoken");
const config = require("../config");
const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");

/**
 * JWT authentication middleware.
 *
 * Expects: Authorization: Bearer <token>
 * On success: attaches req.user = { id, email, role }
 * On failure: passes a 401 AppError to the error handler
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Authentication required. Provide a Bearer token.",
        401
      );
    }

    const token = authHeader.split(" ")[1];

    // Verify + decode the JWT
    const decoded = jwt.verify(token, config.jwtSecret);

    // Confirm the user still exists (token might be valid but user deleted)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      throw new AppError("User associated with this token no longer exists.", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    // Let JWT-specific errors bubble to the central error handler
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(error);
    }
    next(error);
  }
}

/**
 * Role-based authorization middleware factory.
 * Usage: router.get("/admin/audit", authenticate, authorize("ADMIN"), handler)
 *
 * @param  {...string} roles — Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required before authorization.", 401)
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${roles.join(" or ")}`,
          403,
          "FORBIDDEN"
        )
      );
    }

    next();
  };
}

module.exports = { authenticate, authorize };
