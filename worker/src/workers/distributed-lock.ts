import { redisConnection } from "../config/redis.js";
import { logger } from "../logger/index.js";
import crypto from "crypto";

export class DistributedLock {
  /**
   * Acquires a lock on a specific resource key with a TTL.
   * Uses SET key token PX ttlMs NX.
   */
  static async acquire(resourceKey: string, ttlMs = 10000): Promise<string | null> {
    const lockKey = `lock:${resourceKey}`;
    const token = crypto.randomBytes(16).toString("hex");

    try {
      const result = await redisConnection.set(lockKey, token, "PX", ttlMs, "NX");
      if (result === "OK") {
        return token;
      }
      return null;
    } catch (err: any) {
      logger.error(`Failed to acquire lock for key ${resourceKey}: ${err.message}`);
      return null;
    }
  }

  /**
   * Releases a lock on a key using a Lua script to guarantee atomicity.
   * Releases the lock only if the token matches, avoiding releasing other worker's locks.
   */
  static async release(resourceKey: string, token: string): Promise<boolean> {
    const lockKey = `lock:${resourceKey}`;
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await redisConnection.eval(luaScript, 1, lockKey, token);
      return result === 1;
    } catch (err: any) {
      logger.error(`Failed to release lock for key ${resourceKey}: ${err.message}`);
      return false;
    }
  }
}
