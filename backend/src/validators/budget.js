const { z } = require("zod");
const { CATEGORY_KEYS } = require("../constants/categories");

/**
 * Validates setting or updating a budget.
 */
const setBudgetSchema = z.object({
  category: z
    .string({ required_error: "Category is required" })
    .refine((val) => CATEGORY_KEYS.includes(val), {
      message: `Category must be one of: ${CATEGORY_KEYS.join(", ")}`,
    }),
  amount: z
    .number({ required_error: "Amount is required" })
    .positive("Budget amount must be positive")
    .max(100_000_000, "Amount exceeds sane limit")
    .refine(
      (val) => {
        const parts = val.toString().split(".");
        return !parts[1] || parts[1].length <= 2;
      },
      { message: "Amount can have at most 2 decimal places" }
    ),
  accountId: z.string().uuid("Invalid account ID").optional().nullable(),
});

module.exports = {
  setBudgetSchema,
};
