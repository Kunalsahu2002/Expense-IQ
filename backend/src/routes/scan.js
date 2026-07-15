const { Router } = require("express");
const { upload, cleanupFile } = require("../config/multer");
const { processReceipt } = require("../services/ai/receiptExtractor");
const { createRateLimiter } = require("../middleware/rateLimiter");

const router = Router();

const scanRateLimiter = createRateLimiter({
  prefix: "rate_limit:scan",
  limit: 10,
  windowSeconds: 3600,
});

/**
 * POST /api/expenses/scan
 *
 * Upload a receipt → AI extraction → guardrail pipeline → returns PROPOSAL.
 *
 * CRITICAL: This endpoint does NOT save anything to the Expense table.
 * It returns a validated proposal that the user reviews on screen.
 * The user then confirms via POST /api/expenses (the shared write path).
 *
 * Architecture Plan, Section 7:
 * "Note the two-step flow for /scan → /expenses: AI proposes via /scan
 *  (nothing written yet), the user sees the extracted data on screen
 *  and confirms, *then* /expenses performs the actual write."
 *
 * Accepts:
 *   - multipart/form-data with "receipt" file field (image)
 *   - OR JSON body with "receiptText" field (text fallback)
 */
router.post(
  "/",
  scanRateLimiter,
  // Multer middleware: handles file upload, makes req.file available
  // If no file is uploaded (text-based), multer passes through
  (req, res, next) => {
    upload.single("receipt")(req, res, (err) => {
      if (err) {
        // Multer errors (file too large, wrong type, etc.)
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: {
              code: "FILE_TOO_LARGE",
              message: "Receipt image must be smaller than 10 MB.",
            },
          });
        }
        return next(err);
      }
      next();
    });
  },
  async (req, res, next) => {
    let imagePath = null;

    try {
      imagePath = req.file?.path || null;
      const receiptText = req.body?.receiptText || null;

      if (!imagePath && !receiptText) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message:
              'Upload a receipt image (field: "receipt") or provide receipt text (field: "receiptText").',
          },
        });
      }

      // ─── Run the guardrail pipeline ───
      const result = await processReceipt(
        { imagePath, receiptText },
        req.user.id
      );

      // ─── Build response ───
      const response = {
        message: result.duplicate.found
          ? "Receipt processed. Potential duplicate detected — review before confirming."
          : "Receipt processed successfully. Review the extracted data before confirming.",
        data: {
          proposal: result.proposal,
          duplicate: result.duplicate,
          sourceHash: result.sourceHash,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error.code === 'AI_VALIDATION_FAILED' || error.code === 'AI_PARSE_FAILED') {
        return res.status(422).json({
          error: {
            code: error.code,
            message: error.message,
            partialData: error.partialData || null
          }
        });
      }
      next(error);
    } finally {
      // ─── Always clean up the temp file ───
      if (imagePath) {
        cleanupFile(imagePath);
      }
    }
  }
);

module.exports = router;
