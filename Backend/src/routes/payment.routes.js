import express from "express";

import {
  getAllPaymentsController,
  getPaymentByIdController,
  createOrderController,
  verifyPaymentController,
} from "../controllers/payment.controller.js";

import authorizeRoles from "../middlewares/authorizeRoles.js";
import { authUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get all payments
router.get(
  "/",
  authUser,
  authorizeRoles("admin", "staff", "customer"),
  getAllPaymentsController,
);

// Get payment by ID
router.get(
  "/:id",
  authUser,
  authorizeRoles("admin", "staff", "customer"),
  getPaymentByIdController,
);

// Create Razorpay order
router.post(
  "/create-order",
  authUser,
  authorizeRoles("customer"),
  createOrderController,
);

// Verify Razorpay payment
router.post(
  "/verify",
  authUser,
  authorizeRoles("customer"),
  verifyPaymentController,
);

export default router;
