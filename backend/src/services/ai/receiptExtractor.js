const { extractFromImage, extractFromText } = require("./groq");
const { aiOutputSchema } = require("../../validators/aiOutput");
const { computeSourceHash } = require("../../utils/hash");
const { sanitizeObject } = require("../../utils/sanitize");
const { logAudit } = require("../audit");
const prisma = require("../../lib/prisma");

/**
 * Receipt Extraction Pipeline — the heart of ExpenseIQ.
 *
 * This is the 7-step guardrail pipeline from Section 4 of the Architecture Plan.
 * "AI proposes, deterministic code decides."
 *
 * Steps:
 *   1. Receive image/text           (handled by route + Multer)
 *   2. Rate limit check             (Phase 6 — Redis)
 *   3. AI extraction                (Gemini)
 *   4. Deterministic validation:
 *      a. JSON.parse                (reject + audit if fails)
 *      b. Zod schema validation     (reject + audit if fails)
 *      c. Category mapping          (unknown → OTHER)
 *   5. Hash-based duplicate check   (deterministic, never AI-judged)
 *   6. Return PROPOSAL              (nothing saved — user must confirm)
 *   7. Audit log every attempt      (success, failure, duplicate flag)
 *
 * The result is a PROPOSAL — it is NOT saved to the database.
 * The user reviews it on screen and confirms via POST /api/expenses
 * (the same shared write path used for manual entry).
 */

/**
 * Process a receipt and return an expense proposal.
 *
 * @param {{ imagePath?: string, receiptText?: string }} input
 * @param {string} userId
 * @returns {Promise<{
 *   proposal: object,
 *   duplicate: { found: boolean, existingExpense?: object },
 *   rawAiOutput: string,
 *   validationPassed: boolean,
 * }>}
 */
async function processReceipt({ imagePath, receiptText }, userId) {
  let rawAiOutput = null;

  try {
    // ─── STEP 3: AI Extraction ───
    if (imagePath) {
      rawAiOutput = await extractFromImage(imagePath);
    } else if (receiptText) {
      rawAiOutput = await extractFromText(receiptText);
    } else {
      // Log rejection — no input provided
      await logAudit({
        userId,
        action: "REJECTED",
        rawAiOutput: null,
        validationResult: "FAILED: No receipt image or text provided",
      });

      const error = new Error("No receipt image or text provided.");
      error.statusCode = 400;
      error.code = "BAD_REQUEST";
      throw error;
    }

    // ─── STEP 4a: JSON Parse ───
    let parsedJson;
    try {
      // AI might wrap JSON in markdown code blocks — strip them
      let cleanedOutput = rawAiOutput.trim();
      if (cleanedOutput.startsWith("```json")) {
        cleanedOutput = cleanedOutput.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedOutput.startsWith("```")) {
        cleanedOutput = cleanedOutput.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      parsedJson = JSON.parse(cleanedOutput);
    } catch (parseError) {
      // JSON parse failed — reject and log to audit
      await logAudit({
        userId,
        action: "REJECTED",
        rawAiOutput: { raw: rawAiOutput },
        validationResult: `FAILED: JSON parse error — ${parseError.message}`,
      });

      const error = new Error(
        "AI returned invalid JSON. The receipt could not be parsed. Please enter the expense manually."
      );
      error.statusCode = 422;
      error.code = "AI_PARSE_FAILED";
      throw error;
    }

    // ─── STEP 4b: Zod Schema Validation ───
    // This is the deterministic gate — AI output must survive this
    const validation = aiOutputSchema.safeParse(parsedJson);

    if (!validation.success) {
      const reasons = validation.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");

      // Log the validation failure to audit
      await logAudit({
        userId,
        action: "REJECTED",
        rawAiOutput: parsedJson,
        validationResult: `FAILED: Zod validation — ${reasons}`,
      });

      const error = new Error(
        `AI extraction failed validation: ${reasons}. Please enter the expense manually.`
      );
      error.statusCode = 422;
      error.code = "AI_VALIDATION_FAILED";
      error.partialData = parsedJson;
      throw error;
    }

    // Validated data (coerced types, mapped category)
    const validatedData = validation.data;

    // ─── STEP 4c: Sanitize text fields ───
    const sanitized = sanitizeObject(
      { vendor: validatedData.vendor, description: validatedData.description || "" },
      { descriptionFields: ["description"] }
    );

    // ─── STEP 5: Duplicate Detection (deterministic, not AI-judged) ───
    const sourceHash = computeSourceHash(
      sanitized.vendor,
      validatedData.amount,
      validatedData.date
    );

    const existingExpense = await prisma.expense.findFirst({
      where: { userId, sourceHash },
      select: {
        id: true,
        vendor: true,
        amount: true,
        date: true,
        category: true,
        createdBy: true,
        createdAt: true,
      },
    });

    const duplicate = {
      found: !!existingExpense,
      existingExpense: existingExpense || undefined,
    };

    // ─── Build the proposal ───
    const proposal = {
      amount: validatedData.amount,
      category: validatedData.category,
      vendor: sanitized.vendor,
      date: validatedData.date,
      description: sanitized.description || null,
      createdBy: "AI",
      aiConfidence: _estimateConfidence(parsedJson, validatedData),
    };

    // ─── STEP 7: Audit log — success (proposal generated) ───
    let auditAction = "CREATED";
    let validationResult = "PASSED — proposal generated (not yet saved)";

    if (duplicate.found) {
      auditAction = "FLAGGED_DUPLICATE";
      validationResult = `PASSED with DUPLICATE FLAG — matches existing expense ${existingExpense.id}`;
    }

    await logAudit({
      expenseId: existingExpense?.id || null,
      userId,
      action: auditAction,
      rawAiOutput: parsedJson,
      validationResult,
    });

    // ─── STEP 6: Return PROPOSAL (nothing saved yet) ───
    return {
      proposal,
      duplicate,
      rawAiOutput: parsedJson,
      validationPassed: true,
      sourceHash,
    };
  } catch (error) {
    // Re-throw known errors (already audited above)
    if (error.statusCode) throw error;

    // Unknown errors — log and throw
    await logAudit({
      userId,
      action: "REJECTED",
      rawAiOutput: rawAiOutput ? { raw: rawAiOutput } : null,
      validationResult: `FAILED: Unexpected error — ${error.message}`,
    });

    const wrappedError = new Error(
      "An unexpected error occurred during receipt processing. Please try again or enter the expense manually."
    );
    wrappedError.statusCode = 500;
    wrappedError.code = "INTERNAL_SERVER_ERROR";
    throw wrappedError;
  }
}

/**
 * Estimate a confidence score for the AI extraction.
 *
 * This is a simple heuristic — not a probabilistic model.
 * Higher score = more fields matched expectations without transformation.
 *
 * @param {object} rawParsed — What the AI originally returned (before Zod coercion)
 * @param {object} validated — After Zod coercion
 * @returns {number} 0.0 – 1.0
 */
function _estimateConfidence(rawParsed, validated) {
  let score = 1.0;

  // Penalize if amount needed string-to-number coercion
  if (typeof rawParsed.amount === "string") score -= 0.1;

  // Penalize if category was remapped (AI didn't match our enum)
  if (
    rawParsed.category &&
    rawParsed.category.toUpperCase() !== validated.category
  ) {
    score -= 0.15;
  }

  // Penalize if vendor is suspiciously short or generic
  if (validated.vendor.length < 3) score -= 0.1;

  // Penalize if description is empty
  if (!validated.description) score -= 0.05;

  return Math.max(0.1, Math.round(score * 100) / 100);
}

module.exports = { processReceipt };
