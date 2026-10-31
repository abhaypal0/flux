import "dotenv/config";

const requiredEnvVars = [
  "JWT_SECRET",
  "MONGO_URI",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_PASSWORD",
  "FRONTEND_URL",
  "RAZORPAY_SECRET_KEY",
  "RAZORPAY_KEY_ID",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} not defined`);
  }
}

export const config = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  RAZORPAY_SECRET_KEY: process.env.RAZORPAY_SECRET_KEY,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
};
