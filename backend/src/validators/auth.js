const { z } = require("zod");

/**
 * Auth Zod schemas.
 * Every request body is validated with Zod before it touches business logic.
 */

const registerSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .max(255, "Email must be 255 characters or fewer")
    .transform((v) => v.toLowerCase().trim()),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or fewer")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one digit"
    ),

  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .trim(),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .transform((v) => v.toLowerCase().trim()),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

module.exports = { registerSchema, loginSchema };
