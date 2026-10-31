import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import redis from "../database/cache.js";

export const authUser = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({
      message: "Authentication token not found",
      success: false,
    });
  }

  try {
    const isTokenBlackListed = await redis.get(token);

    if (isTokenBlackListed) {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }
    const decoded = jwt.verify(token, config.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("Token verification failed:", error);

    return res.status(401).json({
      message: "Invalid or expired token",
      success: false,
    });
  }
};
