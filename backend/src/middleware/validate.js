const AppError = require("../utils/AppError");

/**
 * Zod validation middleware factory.
 *
 * Creates an Express middleware that validates the request body
 * against a Zod schema BEFORE it reaches any business logic.
 *
 * On success: replaces req.body with the parsed (typed, coerced) data.
 * On failure: passes a 400 AppError with field-level details.
 *
 * Usage:
 *   router.post("/register", validate(registerSchema), authController)
 *
 * @param {import("zod").ZodSchema} schema — A Zod schema
 * @param {"body" | "query" | "params"} source — Which part of req to validate
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fieldErrors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      const message = fieldErrors
        .map((e) => `${e.field}: ${e.message}`)
        .join("; ");

      return next(new AppError(message, 400, "VALIDATION_ERROR"));
    }

    // Replace with parsed data (coerced types, stripped unknowns)
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
