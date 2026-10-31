
import User from "../models/user.model.js";
import crypto from "crypto";
import sendVerificationEmail from "../services/email.services.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// COOKIE OPTIONS
const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
};

// REGISTER CONTROLLER

export const register = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        if (!fullname || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Validate password
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 9 characters, one uppercase letter, one lowercase letter and one special character"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check existing user
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto
            .createHash("sha256")
            .update(verificationToken)
            .digest("hex");

        const tokenExpiry = new Date(
            Date.now() + 15 * 60 * 1000
        );

        // Create customer account
        const user = await User.create({
            fullname,
            email: normalizedEmail,
            password,
            role: "customer",
            isEmailVerified: false,
            emailVerificationToken: hashedToken,
            emailVerificationExpires: tokenExpiry
        });

        // Send verification email
        try {
            await sendVerificationEmail(
                user.email,
                verificationToken
            );
        } catch (emailError) {
            console.error("Email Error:", emailError);

            // Remove account if email sending fails
            await User.findByIdAndDelete(user._id);

            return res.status(500).json({
                success: false,
                message: "Verification email could not be sent. Please try again."
            });
        }

        return res.status(201).json({
            success: true,
            message: "Registration successful. Please verify your email.",
            user: {
                id: user._id,
                fullname: user.fullname,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
};


// VERIFY EMAIL CONTROLLER

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is missing"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: new Date() },
            isEmailVerified: false
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification link"
            });
        }

        // Verify email
        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. You can now login."
        });

    } catch (error) {
        console.error("Email Verification Error:", error);

        return res.status(500).json({
            success: false,
            message: "Email verification failed"
        });
    }
};


// RESEND VERIFICATION EMAIL CONTROLLER

export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified"
            });
        }

        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto
            .createHash("sha256")
            .update(verificationToken)
            .digest("hex");

        user.emailVerificationToken = hashedToken;

        user.emailVerificationExpires = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        await sendVerificationEmail(
            user.email,
            verificationToken
        );

        return res.status(200).json({
            success: true,
            message: "Verification email sent successfully"
        });

    } catch (error) {
        console.error("Resend Email Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to send verification email"
        });
    }
};


// LOGIN CONTROLLER

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check account status
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive. Contact administrator."
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check email verification
        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before login"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.cookie("token", token, authCookieOptions);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                fullname: user.fullname,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// GET LOGGED-IN USER CONTROLLER

export const getme = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            user
        });

    } catch (error) {
        console.error("Get Me Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch user"
        });
    }
};


// LOGOUT CONTROLLER

export const logout = async (req, res) => {
    try {
        res.clearCookie("token", authCookieOptions);

        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });

    } catch (error) {
        console.error("Logout Error:", error);

        return res.status(500).json({
            success: false,
            message: "Logout failed"
        });
    }
};
