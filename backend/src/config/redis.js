"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = exports.getRedisConnection = exports.redisConfig = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = require("./logger.js");
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const redisPassword = process.env.REDIS_PASSWORD || undefined;
exports.redisConfig = {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null, // Essential setting for BullMQ
};
const getRedisConnection = () => {
    const connection = new ioredis_1.default({
        ...exports.redisConfig,
    });
    connection.on("error", (err) => {
        logger_js_1.logger.error(`Redis connection error: ${err.message}`);
    });
    connection.on("connect", () => {
        logger_js_1.logger.info("Connected to Redis server successfully");
    });
    return connection;
};
exports.getRedisConnection = getRedisConnection;
exports.redisConnection = (0, exports.getRedisConnection)();
exports.default = ioredis_1.default;
