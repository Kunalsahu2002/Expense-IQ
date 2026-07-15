const redis = require("../lib/redis");

/**
 * Creates a rate limiting middleware using Redis.
 * If Redis is not configured (local dev), it gracefully bypasses the limit
 * or uses a simple in-memory map (for demonstration).
 *
 * @param {Object} options
 * @param {string} options.prefix - Redis key prefix (e.g., 'rate_limit:scan')
 * @param {number} options.limit - Max requests allowed
 * @param {number} options.windowSeconds - Time window in seconds
 */
const createRateLimiter = ({ prefix, limit, windowSeconds }) => {
  // Fallback in-memory store for local dev without Redis
  const memoryStore = new Map();

  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "User not authenticated." },
        });
      }

      const key = `${prefix}:${userId}`;

      // Check if Redis is actually connected/configured
      if (redis.status === "ready") {
        const current = await redis.incr(key);
        if (current === 1) {
          // Set expiry on the first request in the window
          await redis.expire(key, windowSeconds);
        }

        if (current > limit) {
          return res.status(429).json({
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: `Too many requests. Limit is ${limit} per ${windowSeconds}s.`,
            },
          });
        }
      } else {
        // Fallback to in-memory store
        const now = Date.now();
        const windowMs = windowSeconds * 1000;
        
        if (!memoryStore.has(key)) {
          memoryStore.set(key, { count: 1, resetAt: now + windowMs });
        } else {
          const record = memoryStore.get(key);
          if (now > record.resetAt) {
            // Window expired, reset
            memoryStore.set(key, { count: 1, resetAt: now + windowMs });
          } else {
            record.count += 1;
            if (record.count > limit) {
              return res.status(429).json({
                error: {
                  code: "RATE_LIMIT_EXCEEDED",
                  message: `Too many requests. Limit is ${limit} per ${windowSeconds}s. (Fallback Limiter)`,
                },
              });
            }
          }
        }
      }

      next();
    } catch (error) {
      console.error("[RateLimiter] Error:", error);
      // Fail open: don't block the user if the rate limiter itself errors out
      next();
    }
  };
};

module.exports = { createRateLimiter };
