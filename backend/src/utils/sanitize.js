/**
 * Input sanitization for user-supplied text fields.
 * Applied to vendor names, descriptions, and any other free-text
 * before storage — prevents XSS and removes control characters.
 *
 * This is NOT a replacement for Zod validation; it runs *after*
 * Zod confirms the field exists and has the right type.
 */

/**
 * Sanitize a single string value:
 * 1. Trim whitespace
 * 2. Strip HTML tags (basic XSS prevention)
 * 3. Remove control characters (except newlines in descriptions)
 * 4. Collapse multiple spaces into one
 *
 * @param {string} input — Raw user/AI input
 * @param {{ allowNewlines?: boolean }} options
 * @returns {string} Sanitized string
 */
function sanitizeString(input, options = {}) {
  if (typeof input !== "string") return input;

  let sanitized = input.trim();

  // Strip HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, "");

  // Remove control characters (keep newlines if allowed)
  if (options.allowNewlines) {
    sanitized = sanitized.replace(/[^\P{Cc}\n\r\t]/gu, "");
  } else {
    sanitized = sanitized.replace(/\p{Cc}/gu, "");
  }

  // Collapse multiple spaces
  sanitized = sanitized.replace(/ {2,}/g, " ");

  return sanitized;
}

/**
 * Sanitize all string fields on an object (shallow, one level deep).
 * Non-string fields are left untouched.
 *
 * @param {Record<string, any>} obj
 * @param {{ descriptionFields?: string[] }} options — Fields that allow newlines
 * @returns {Record<string, any>} New object with sanitized string values
 */
function sanitizeObject(obj, options = {}) {
  const descriptionFields = new Set(options.descriptionFields || ["description"]);
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeString(value, {
        allowNewlines: descriptionFields.has(key),
      });
    } else {
      result[key] = value;
    }
  }

  return result;
}

module.exports = { sanitizeString, sanitizeObject };
