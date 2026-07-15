const Redis = require("ioredis");
const config = require("../config");

// Singleton pattern for Redis
let redisClient = null;

function getRedisClient() {
  if (!config.redisUrl) {
    // Return a dummy client if Redis isn't configured,
    // allowing the app to run without caching in local dev
    if (!redisClient) {
      console.warn("[REDIS] REDIS_URL not set. Caching is disabled.");
      redisClient = {
        get: async () => null,
        set: async () => "OK",
        setex: async () => "OK",
        del: async () => 1,
      };
    }
    return redisClient;
  }

  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.error("[REDIS] Max retries reached. Disconnecting.");
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
    });

    redisClient.on("error", (err) => {
      console.error("[REDIS] Connection error:", err.message);
    });
  }

  return redisClient;
}

/**
 * Helper to cache a function's result for a given TTL
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {Function} fetchFn
 * @returns {Promise<any>}
 */
async function getOrSetCache(key, ttlSeconds, fetchFn) {
  const client = getRedisClient();
  
  try {
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("[REDIS] Cache get error:", error);
  }

  // Execute the underlying function if cache miss
  const freshData = await fetchFn();

  try {
    if (freshData !== undefined && freshData !== null) {
      await client.setex(key, ttlSeconds, JSON.stringify(freshData));
    }
  } catch (error) {
    console.error("[REDIS] Cache set error:", error);
  }

  return freshData;
}

/**
 * Invalidate a specific cache key
 * @param {string} key
 */
async function invalidateCache(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error("[REDIS] Cache invalidate error:", error);
  }
}

/**
 * Invalidate all keys matching a pattern
 * @param {string} pattern e.g., "insights:user:123:*"
 */
async function invalidateCachePattern(pattern) {
  try {
    if (!config.redisUrl) return; // Dummy client doesn't support scan
    
    const client = getRedisClient();
    let cursor = "0";
    do {
      const result = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("[REDIS] Cache pattern invalidate error:", error);
  }
}

module.exports = { getRedisClient, getOrSetCache, invalidateCache, invalidateCachePattern };
