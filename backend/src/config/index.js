const dotenv = require("dotenv");
const path = require("path");

// Load .env from the backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config = {
  // ─── Server ───
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // ─── Auth ───
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,

  // ─── Redis (Phase 4/6) ───
  redisUrl: process.env.REDIS_URL,

  // ─── Gemini AI ───
  groqApiKey: process.env.GROQ_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
};

// ─── Validate critical config at startup ───
const requiredVars = ["jwtSecret"];
for (const key of requiredVars) {
  if (!config[key]) {
    throw new Error(
      `Missing required environment variable for config.${key}. ` +
        `Check your .env file against .env.example.`
    );
  }
}

if (config.jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET must be at least 32 characters long for security."
  );
}

module.exports = config;
