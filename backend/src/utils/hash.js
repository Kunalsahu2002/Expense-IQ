const crypto = require("crypto");

/**
 * Compute a deterministic deduplication hash for an expense.
 *
 * sourceHash = SHA256(normalized_vendor | normalized_amount | normalized_date)
 *
 * This is the core of duplicate detection (Architecture Plan, Step 5).
 * Hash comparison is O(1) and never hallucinates — unlike asking an AI
 * "is this a duplicate?".
 *
 * Normalization rules:
 *   - vendor: lowercase, trimmed, whitespace collapsed
 *   - amount: fixed to 2 decimal places (49.9 → "49.90")
 *   - date: ISO date only, no time (2026-07-14T15:30:00Z → "2026-07-14")
 *
 * @param {string} vendor
 * @param {number|string} amount
 * @param {string|Date} date
 * @returns {string} 64-char hex SHA-256 hash
 */
function computeSourceHash(vendor, amount, date) {
  const normalizedVendor = vendor.toLowerCase().trim().replace(/\s+/g, " ");
  const normalizedAmount = parseFloat(amount).toFixed(2);
  const normalizedDate = new Date(date).toISOString().split("T")[0];

  const input = [normalizedVendor, normalizedAmount, normalizedDate].join("|");

  return crypto.createHash("sha256").update(input).digest("hex");
}

module.exports = { computeSourceHash };
