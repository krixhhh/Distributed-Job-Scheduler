import Redis from "ioredis";
import { logger } from "./logger.js";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConfig = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null, // Essential setting for BullMQ
};

export const getRedisConnection = () => {
  const connection = new Redis({
    ...redisConfig,
  });

  connection.on("error", (err) => {
    logger.error(`Redis connection error: ${err.message}`);
  });

  connection.on("connect", () => {
    logger.info("Connected to Redis server successfully");
  });

  return connection;
};

export const redisConnection = getRedisConnection();
export default Redis;
