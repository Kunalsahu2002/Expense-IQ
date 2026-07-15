const config = require("../config");

/**
 * Central error-handling middleware.
 *
 * Every error in the app funnels through here — no bare try/catch
 * with inconsistent responses scattered across routes.
 *
 * Response shape is always:
 *   { error: { code: string, message: string } }
 *
 * Status codes:
 *   400 — Validation / bad request
 *   401 — Unauthorized (missing/invalid JWT)
 *   403 — Forbidden (wrong role)
 *   404 — Not found
 *   409 — Conflict (duplicate)
 *   429 — Rate limit exceeded
 *   500 — Server error (details hidden in production)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ─── Determine status and code ───
  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "Something went wrong";

  // ─── Prisma known errors ───
  if (err.code === "P2002") {
    // Unique constraint violation
    statusCode = 409;
    code = "CONFLICT";
    const target = err.meta?.target;
    message = target
      ? `A record with that ${target.join(", ")} already exists.`
      : "A duplicate record was detected.";
  } else if (err.code === "P2025") {
    // Record not found
    statusCode = 404;
    code = "NOT_FOUND";
    message = "The requested record was not found.";
  }

  // ─── Zod validation errors (fallback — should be caught by validate middleware) ───
  if (err.name === "ZodError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = err.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
  }

  // ─── JWT errors ───
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    code = "UNAUTHORIZED";
    message = "Invalid or malformed authentication token.";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    code = "TOKEN_EXPIRED";
    message = "Authentication token has expired.";
  }

  // ─── Hide internal details in production ───
  if (statusCode === 500 && config.nodeEnv === "production") {
    message = "An internal server error occurred.";
  }

  // ─── Log the full error in non-production ───
  if (config.nodeEnv !== "production" || statusCode === 500) {
    console.error(`[ERROR] ${statusCode} ${code}:`, err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}

module.exports = errorHandler;
