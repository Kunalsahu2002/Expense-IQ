const { z } = require("zod");

const createAccountSchema = z.object({
  name: z
    .string({ required_error: "Account name is required" })
    .min(1, "Account name is required")
    .max(50, "Account name must be 50 characters or fewer")
    .trim(),
  type: z
    .enum(["CASH", "BANK", "CREDIT", "OTHER"])
    .default("BANK"),
});

const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, "Account name is required")
    .max(50, "Account name must be 50 characters or fewer")
    .trim()
    .optional(),
  type: z
    .enum(["CASH", "BANK", "CREDIT", "OTHER"])
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

module.exports = { createAccountSchema, updateAccountSchema };
