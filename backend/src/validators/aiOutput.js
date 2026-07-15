const { z } = require("zod");
const { CATEGORY_KEYS } = require("../constants/categories");

/**
 * Zod schema for validating AI-extracted receipt data.
 *
 * This is the "deterministic gate" — Step 4b from the Architecture Plan.
 * The AI can hallucinate types, invent categories, or return malformed
 * dates. This schema catches all of that before anything touches the DB.
 */

// Build the category map from the new category registry
const CATEGORY_MAP = {};
for (const key of CATEGORY_KEYS) {
  CATEGORY_MAP[key.toLowerCase()] = key;
}

// Common aliases the AI might return (comprehensive mapping for 20 categories)
Object.assign(CATEGORY_MAP, {
  // FOOD_DINING
  restaurant: "FOOD_DINING",
  dining: "FOOD_DINING",
  cafe: "FOOD_DINING",
  coffee: "FOOD_DINING",
  food: "FOOD_DINING",
  "food & dining": "FOOD_DINING",
  "food and dining": "FOOD_DINING",

  // GROCERIES
  groceries: "GROCERIES",
  grocery: "GROCERIES",
  supermarket: "GROCERIES",

  // TRANSPORTATION
  transport: "TRANSPORTATION",
  transportation: "TRANSPORTATION",
  uber: "TRANSPORTATION",
  taxi: "TRANSPORTATION",
  gas: "TRANSPORTATION",
  fuel: "TRANSPORTATION",
  petrol: "TRANSPORTATION",
  diesel: "TRANSPORTATION",
  parking: "TRANSPORTATION",

  // HOUSING_RENT
  housing: "HOUSING_RENT",
  rent: "HOUSING_RENT",
  mortgage: "HOUSING_RENT",
  "housing & rent": "HOUSING_RENT",
  "housing and rent": "HOUSING_RENT",

  // BILLS_UTILITIES
  utilities: "BILLS_UTILITIES",
  bills: "BILLS_UTILITIES",
  electricity: "BILLS_UTILITIES",
  water: "BILLS_UTILITIES",
  internet: "BILLS_UTILITIES",
  phone: "BILLS_UTILITIES",
  mobile: "BILLS_UTILITIES",
  "bills & utilities": "BILLS_UTILITIES",
  "bills and utilities": "BILLS_UTILITIES",

  // HEALTHCARE
  healthcare: "HEALTHCARE",
  health: "HEALTHCARE",
  medical: "HEALTHCARE",
  pharmacy: "HEALTHCARE",
  doctor: "HEALTHCARE",
  hospital: "HEALTHCARE",
  medicine: "HEALTHCARE",

  // EDUCATION
  education: "EDUCATION",
  school: "EDUCATION",
  college: "EDUCATION",
  university: "EDUCATION",
  tuition: "EDUCATION",
  books: "EDUCATION",
  course: "EDUCATION",

  // SHOPPING
  shopping: "SHOPPING",
  clothes: "SHOPPING",
  clothing: "SHOPPING",
  electronics: "SHOPPING",
  amazon: "SHOPPING",
  retail: "SHOPPING",

  // ENTERTAINMENT
  entertainment: "ENTERTAINMENT",
  movie: "ENTERTAINMENT",
  movies: "ENTERTAINMENT",
  netflix: "ENTERTAINMENT",
  spotify: "ENTERTAINMENT",
  gaming: "ENTERTAINMENT",
  music: "ENTERTAINMENT",

  // TRAVEL
  travel: "TRAVEL",
  flight: "TRAVEL",
  hotel: "TRAVEL",
  vacation: "TRAVEL",
  airfare: "TRAVEL",
  accommodation: "TRAVEL",

  // WORK_BUSINESS
  business: "WORK_BUSINESS",
  work: "WORK_BUSINESS",
  office: "WORK_BUSINESS",
  "work & business": "WORK_BUSINESS",
  "work and business": "WORK_BUSINESS",

  // FITNESS_WELLNESS
  fitness: "FITNESS_WELLNESS",
  wellness: "FITNESS_WELLNESS",
  gym: "FITNESS_WELLNESS",
  yoga: "FITNESS_WELLNESS",
  spa: "FITNESS_WELLNESS",
  "fitness & wellness": "FITNESS_WELLNESS",
  "fitness and wellness": "FITNESS_WELLNESS",

  // PETS
  pets: "PETS",
  pet: "PETS",
  vet: "PETS",
  veterinary: "PETS",

  // GIFTS_DONATIONS
  gifts: "GIFTS_DONATIONS",
  gift: "GIFTS_DONATIONS",
  donation: "GIFTS_DONATIONS",
  donations: "GIFTS_DONATIONS",
  charity: "GIFTS_DONATIONS",
  "gifts & donations": "GIFTS_DONATIONS",
  "gifts and donations": "GIFTS_DONATIONS",

  // EMI_LOANS
  emi: "EMI_LOANS",
  loan: "EMI_LOANS",
  loans: "EMI_LOANS",
  "emi & loans": "EMI_LOANS",
  "emi and loans": "EMI_LOANS",
  installment: "EMI_LOANS",

  // INVESTMENTS
  investment: "INVESTMENTS",
  investments: "INVESTMENTS",
  stocks: "INVESTMENTS",
  "mutual fund": "INVESTMENTS",
  sip: "INVESTMENTS",

  // INSURANCE
  insurance: "INSURANCE",
  "life insurance": "INSURANCE",
  "health insurance": "INSURANCE",
  premium: "INSURANCE",

  // TAXES_GOVERNMENT
  taxes: "TAXES_GOVERNMENT",
  tax: "TAXES_GOVERNMENT",
  government: "TAXES_GOVERNMENT",
  "taxes & government": "TAXES_GOVERNMENT",
  "taxes and government": "TAXES_GOVERNMENT",

  // SUBSCRIPTIONS
  subscription: "SUBSCRIPTIONS",
  subscriptions: "SUBSCRIPTIONS",
  recurring: "SUBSCRIPTIONS",

  // MISCELLANEOUS (fallback)
  misc: "MISCELLANEOUS",
  miscellaneous: "MISCELLANEOUS",
  other: "MISCELLANEOUS",

  // Legacy mappings from old enum values
  housing: "HOUSING_RENT",
  food: "FOOD_DINING",
  travel: "TRAVEL",
  shopping: "SHOPPING",
  utilities: "BILLS_UTILITIES",
  health: "HEALTHCARE",
  entertainment: "ENTERTAINMENT",
});

/**
 * Map an AI-returned category string to a valid category key.
 * Unknown categories → "MISCELLANEOUS" (never let free text into the DB).
 */
function mapCategory(rawCategory) {
  if (!rawCategory || typeof rawCategory !== "string") return "MISCELLANEOUS";
  const normalized = rawCategory.toLowerCase().trim();
  return CATEGORY_MAP[normalized] || "MISCELLANEOUS";
}

/**
 * Zod schema for raw AI output.
 */
const aiOutputSchema = z.object({
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === "string") {
        const cleaned = val.replace(/[^0-9.\-]/g, "");
        return parseFloat(cleaned);
      }
      return val;
    })
    .pipe(
      z
        .number({ invalid_type_error: "AI returned a non-numeric amount" })
        .positive("Amount must be positive")
        .max(10_000_000, "Amount exceeds sane upper bound")
        .refine(
          (val) => {
            const parts = val.toString().split(".");
            return !parts[1] || parts[1].length <= 2;
          },
          { message: "Amount must have at most 2 decimal places" }
        )
    ),

  date: z
    .string()
    .transform((val) => {
      const parsed = new Date(val);
      if (isNaN(parsed.getTime())) return val;
      return parsed.toISOString();
    })
    .refine(
      (val) => {
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: "AI returned an invalid date" }
    )
    .refine(
      (val) => new Date(val) <= new Date(),
      { message: "AI returned a future date" }
    )
    .refine(
      (val) => {
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        return new Date(val) >= fiveYearsAgo;
      },
      { message: "AI returned a date older than 5 years" }
    ),

  vendor: z
    .string()
    .min(1, "AI returned an empty vendor name")
    .max(200, "Vendor name exceeds maximum length")
    .trim(),

  category: z
    .string()
    .transform((val) => mapCategory(val)),

  description: z
    .string()
    .max(1000, "Description exceeds maximum length")
    .optional()
    .default(""),
});

module.exports = { aiOutputSchema, mapCategory, CATEGORY_MAP };
