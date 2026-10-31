
import express from "express";

import {
    register,
    verifyEmail,
    resendVerificationEmail,
    login,
    getme,
    logout
} from "../controller/auth.controller.js";

import {authUser} from "../middlewares/auth.middleware.js"

const Authrouter = express.Router();

// Public Routes
Authrouter.post("/register", register);

Authrouter.get("/verify-email/:token", verifyEmail);

Authrouter.post("/resend-verification", resendVerificationEmail);

Authrouter.post("/login", login);

// Protected Routes
Authrouter.get("/me", authUser, getme);

Authrouter.post("/logout", authUser, logout);

export default Authrouter;
