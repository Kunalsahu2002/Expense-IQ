const Groq = require("groq-sdk");
const Tesseract = require("tesseract.js");
const config = require("../../config");
const AppError = require("../../utils/AppError");

// ─── Initialize Groq client ───
let groqClient = null;

function getGroqClient() {
  if (!config.groqApiKey) {
    throw new AppError(
      "Groq API key is not configured. Set GROQ_API_KEY in your .env file.",
      503,
      "AI_SERVICE_UNAVAILABLE"
    );
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: config.groqApiKey });
  }
  return groqClient;
}

/**
 * The strict extraction prompt.
 */
const EXTRACTION_PROMPT = `You are a precise receipt parser. Extract expense information from the provided receipt text.

Return ONLY a valid JSON object with these exact fields — no other text, no markdown, no explanation:

{
  "amount": <number — the total amount paid, as a plain number with up to 2 decimal places, no currency symbols>,
  "date": "<string — the date on the receipt in ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ>",
  "vendor": "<string — the store, restaurant, or business name>",
  "category": "<string — classify into exactly one of: HOUSING, FOOD, TRAVEL, SHOPPING, UTILITIES, HEALTH, ENTERTAINMENT, OTHER>",
  "description": "<string — brief summary of what was purchased, max 200 chars>"
}

Rules:
- If the receipt total is unclear, use the largest subtotal visible.
- If the date is unclear, use today's date.
- If you cannot determine the vendor name, use "Unknown Vendor".
- Pick the single most appropriate category from the list above.
- Return ONLY the JSON object. No text before or after it.`;

/**
 * Extract receipt data from an image using Tesseract (OCR) + Groq (LLM).
 *
 * @param {string} imagePath — Absolute path to the uploaded receipt image
 * @returns {Promise<string>} Raw text response from the AI (unparsed, untrusted)
 */
async function extractFromImage(imagePath) {
  try {
    // 1. Run local OCR using Tesseract.js
    const { data: { text: ocrText } } = await Tesseract.recognize(imagePath, 'eng');
    
    if (!ocrText || ocrText.trim().length === 0) {
      throw new AppError(
        "Tesseract could not extract any text from this image.",
        422,
        "OCR_EXTRACTION_FAILED"
      );
    }

    // 2. Pass the extracted raw text to Groq for JSON structuring
    return await extractFromText(ocrText);
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError(
      `OCR or AI extraction failed: ${error.message}`,
      502,
      "AI_EXTRACTION_FAILED"
    );
  }
}

/**
 * Extract receipt data from plain text using Groq.
 *
 * @param {string} receiptText — Raw text from OCR or manual input
 * @returns {Promise<string>} Raw text response from the AI (unparsed, untrusted)
 */
async function extractFromText(receiptText) {
  const client = getGroqClient();

  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: EXTRACTION_PROMPT,
        },
        {
          role: "user",
          content: `Here is the receipt text:\n\n${receiptText}`,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const rawText = chatCompletion.choices[0]?.message?.content;

    if (!rawText) {
      throw new AppError(
        "AI returned an empty response.",
        502,
        "AI_EMPTY_RESPONSE"
      );
    }

    return rawText;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError(
      `AI extraction failed: ${error.message}`,
      502,
      "AI_EXTRACTION_FAILED"
    );
  }
}

module.exports = { extractFromImage, extractFromText, EXTRACTION_PROMPT, getGroqClient };
