const { z } = require("zod");
const { CATEGORY_KEYS } = require("../constants/categories");

/**
 * Valid expense categories — validated against the central registry.
 * Using String field + Zod validation instead of Prisma enum
 * for extensibility (no migration needed for future category additions).
 */
const EXPENSE_CATEGORIES = CATEGORY_KEYS;

/**
 * Schema for creating an expense (manual entry).
 * This is the SAME validation both manual and AI-confirmed paths go through
 * after the user confirms the AI proposal.
 */
const createExpenseSchema = z.object({
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .max(10_000_000, "Amount exceeds maximum allowed value")
    .refine(
      (val) => {
        const parts = val.toString().split(".");
        return !parts[1] || parts[1].length <= 2;
      },
      { message: "Amount must have at most 2 decimal places" }
    ),

  category: z
    .string({ required_error: "Category is required" })
    .refine((val) => EXPENSE_CATEGORIES.includes(val), {
      message: `Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`,
    }),

  vendor: z
    .string({ required_error: "Vendor is required" })
    .min(1, "Vendor is required")
    .max(200, "Vendor name must be 200 characters or fewer")
    .trim(),

  date: z
    .string({ required_error: "Date is required" })
    .datetime({ message: "Date must be a valid ISO datetime string" })
    .refine(
      (val) => new Date(val) <= new Date(),
      { message: "Date cannot be in the future" }
    )
    .refine(
      (val) => {
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        return new Date(val) >= fiveYearsAgo;
      },
      { message: "Date cannot be older than 5 years" }
    ),

  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .nullable(),

  receiptUrl: z
    .string()
    .url("Receipt URL must be a valid URL")
    .optional()
    .nullable(),

  // When confirming an AI proposal, the frontend sends this to indicate source
  createdBy: z
    .enum(["AI", "MANUAL"])
    .default("MANUAL"),

  // Optional AI confidence score (only present when confirming AI extraction)
  aiConfidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .nullable(),

  // If true, skip duplicate detection (user explicitly confirmed "add anyway")
  force: z
    .boolean()
    .default(false),

  // Optional account ID
  accountId: z
    .string()
    .uuid()
    .optional()
    .nullable(),
});

/**
 * Schema for updating an expense.
 * All fields optional but at least one must be present.
 */
const updateExpenseSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(10_000_000, "Amount exceeds maximum allowed value")
    .refine(
      (val) => {
        const parts = val.toString().split(".");
        return !parts[1] || parts[1].length <= 2;
      },
      { message: "Amount must have at most 2 decimal places" }
    )
    .optional(),

  category: z
    .string()
    .refine((val) => EXPENSE_CATEGORIES.includes(val), {
      message: `Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`,
    })
    .optional(),

  vendor: z
    .string()
    .min(1, "Vendor is required")
    .max(200, "Vendor name must be 200 characters or fewer")
    .trim()
    .optional(),

  date: z
    .string()
    .datetime({ message: "Date must be a valid ISO datetime string" })
    .optional(),

  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .nullable(),

  accountId: z
    .string()
    .uuid()
    .optional()
    .nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

/**
 * Schema for listing expenses (query params).
 * Validated with validate(schema, "query") middleware.
 */
const listExpensesSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, "Limit must be 100 or fewer")
    .default(10),

  // Support comma-separated categories: "FOOD_DINING,GROCERIES"
  category: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(",").map(c => c.trim()).filter(Boolean);
    }),

  // Source filter: "AI" or "MANUAL"
  source: z
    .enum(["AI", "MANUAL"])
    .optional(),

  // Account filter
  accountId: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(",").map(c => c.trim()).filter(Boolean);
    }),

  search: z
    .string()
    .optional(),

  startDate: z
    .string()
    .datetime()
    .optional(),

  endDate: z
    .string()
    .datetime()
    .optional(),

  sortBy: z
    .enum(["date", "amount", "createdAt"])
    .default("date"),

  order: z
    .enum(["asc", "desc"])
    .default("desc"),
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  EXPENSE_CATEGORIES,
};
