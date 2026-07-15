const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const config = require("../config");
const AppError = require("../utils/AppError");
const { sanitizeString } = require("../utils/sanitize");

/**
 * Auth service — business logic for registration and login.
 * Separated from routes so it's testable independently.
 */

/**
 * Register a new user.
 *
 * @param {{ email: string, password: string, name: string }} data — Zod-validated input
 * @returns {{ user: object, token: string }}
 */
async function register({ email, password, name }) {
  // Check for existing user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "CONFLICT"
    );
  }

  // Hash password — bcrypt cost factor from config (default 12)
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  // Sanitize name before storage
  const sanitizedName = sanitizeString(name);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: sanitizedName,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  const token = _generateToken(user);

  return { user, token };
}

/**
 * Authenticate an existing user.
 *
 * @param {{ email: string, password: string }} data — Zod-validated input
 * @returns {{ user: object, token: string }}
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Generic message to prevent user enumeration
    throw new AppError("Invalid email or password.", 401);
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError("Invalid email or password.", 401);
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };

  const token = _generateToken(safeUser);

  return { user: safeUser, token };
}

/**
 * Generate a JWT for a user.
 * Token contains userId and role — minimal claims.
 * Expiry is configured via JWT_EXPIRES_IN env var.
 */
function _generateToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

module.exports = { register, login };
