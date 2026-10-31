import express from "express";

import {
  createSubscriptionController,
  getAllSubscriptionsController,
  getSubscriptionByIdController,
  activateSubscriptionController,
  pauseSubscriptionController,
  resumeSubscriptionController,
  closeSubscriptionController,
} from "../controllers/subscription.controller.js";
import authorizeRoles from "../middlewares/authorizeRoles.js"
import { authUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authUser);

// Create subscription from a confirmed quotation.
router.post(
  "/",
  authorizeRoles("admin", "staff"),
  createSubscriptionController,
);

// Get all subscriptions (customers see only their own).
router.get(
  "/",
  authorizeRoles("admin", "staff", "customer"),
  getAllSubscriptionsController,
);

// Get subscription details.
router.get(
  "/:subscriptionId",
  authorizeRoles("admin", "staff", "customer"),
  getSubscriptionByIdController,
);

// Activate a confirmed subscription.
router.patch(
  "/:subscriptionId/activate",
  authorizeRoles("admin", "staff"),
  activateSubscriptionController,
);

// Pause an active subscription.
router.patch(
  "/:subscriptionId/pause",
  authorizeRoles("admin", "staff"),
  pauseSubscriptionController,
);

// Resume a paused subscription.
router.patch(
  "/:subscriptionId/resume",
  authorizeRoles("admin", "staff"),
  resumeSubscriptionController,
);

// Close a subscription.
router.patch(
  "/:subscriptionId/close",
  authorizeRoles("admin", "staff"),
  closeSubscriptionController,
);

export default router;
