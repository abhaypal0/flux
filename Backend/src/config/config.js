import "dotenv/config.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECERT not defined");
}
if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI not defined");
}

export const config = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
};
