import express from "express";

import {
  createQuotationController,
  getAllQuotationsController,
  getQuotationByIdController,
  updateQuotationController,
  updateQuotationStatusController,
} from "../controllers/quotation.controller.js";

import authorizeRoles from "../middlewares/authorizeRoles.js";
import { authUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All quotation routes require authentication.
router.use(authUser);

// Admin and staff can create quotations.
router.post("/", authorizeRoles("admin", "staff"), createQuotationController);

// Admin, staff and customers can fetch quotations.
// Customers can only access their own quotations.
router.get(
  "/",
  authorizeRoles("admin", "staff", "customer"),
  getAllQuotationsController,
);

// Get quotation details.
router.get(
  "/:quotationId",
  authorizeRoles("admin", "staff", "customer"),
  getQuotationByIdController,
);

// Only admin and staff can update draft quotations.
router.patch(
  "/:quotationId",
  authorizeRoles("admin", "staff"),
  updateQuotationController,
);

// Status changes are checked inside the controller.
router.patch(
  "/:quotationId/status",
  authorizeRoles("admin", "staff", "customer"),
  updateQuotationStatusController,
);

export default router;
