/**
 * Custom application error class.
 * Carries an HTTP status code and a machine-readable error code
 * so the central error handler can produce structured JSON responses.
 */
class AppError extends Error {
  /**
   * @param {string} message — Human-readable error message
   * @param {number} statusCode — HTTP status code (400, 401, 403, 404, 409, 429, 500)
   * @param {string} [code] — Machine-readable error code (e.g. "VALIDATION_ERROR")
   */
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this._defaultCode(statusCode);
    this.isOperational = true; // Distinguishes expected errors from bugs

    Error.captureStackTrace(this, this.constructor);
  }

  _defaultCode(statusCode) {
    const map = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "RATE_LIMIT_EXCEEDED",
      500: "INTERNAL_SERVER_ERROR",
    };
    return map[statusCode] || "UNKNOWN_ERROR";
  }
}

module.exports = AppError;
