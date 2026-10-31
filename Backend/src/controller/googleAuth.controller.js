import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { config } from "../config/config.js";

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const googleAuthCallback = async (req, res) => {
  try {
    const googleUser = req.user;

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({
        success: false,
        message: "Google authentication failed",
      });
    }

    const email = googleUser.email.toLowerCase().trim();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullname: googleUser.fullname || googleUser.email.split("@")[0],
        email,
        password: crypto.randomBytes(32).toString("hex"),
        role: "customer",
        isEmailVerified: true,
        profileImage: googleUser.profileImage || "",
        googleId: googleUser.googleId || null,
      });
    } else {
      if (googleUser.googleId && !user.googleId) {
        user.googleId = googleUser.googleId;
      }
      if (googleUser.profileImage) {
        user.profileImage = googleUser.profileImage;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      await user.save();
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      config.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("token", token, authCookieOptions);

    const frontEndUrl = new URL(process.env.FRONTEND_URL || "http://localhost:5173");
    frontEndUrl.searchParams.set("auth", "google");
    frontEndUrl.searchParams.set("status", "success");

    return res.redirect(frontEndUrl.toString());
  } catch (error) {
    console.error("Google auth error:", error);

    return res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};
