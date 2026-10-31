import Redis from "ioredis";
import { config } from "../config/config.js";

const redis = new Redis({
  port: config.REDIS_PORT,
  host: config.REDIS_HOST,
  password: config.REDIS_PASSWORD,
});

redis.on("connect", () => {
  console.log("redis connected");
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

redis.on("close", () => {
  console.log("Redis connection closed");
});

export default redis;
