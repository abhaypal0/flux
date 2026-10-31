import express from "express";

import {
  generateInvoiceController,
  getAllInvoicesController,
  getInvoiceByIdController,
  confirmInvoiceController,
  sendInvoiceController,
  cancelInvoiceController,
} from "../controllers/invoice.controller.js";

import authorizeRoles from "../middlewares/authorizeRoles.js";
import { authUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authUser);

// Generate invoice from active subscription.
router.post(
  "/generate",
  authorizeRoles("admin", "staff"),
  generateInvoiceController,
);

// Get all invoices.
router.get(
  "/",
  authorizeRoles("admin", "staff", "customer"),
  getAllInvoicesController,
);

// Get invoice details.
router.get(
  "/:invoiceId",
  authorizeRoles("admin", "staff", "customer"),
  getInvoiceByIdController,
);

// Confirm a manually created draft invoice.
router.patch(
  "/:invoiceId/confirm",
  authorizeRoles("admin", "staff"),
  confirmInvoiceController,
);

// Mark confirmed invoice as sent.
router.patch(
  "/:invoiceId/send",
  authorizeRoles("admin", "staff"),
  sendInvoiceController,
);

// Cancel an unpaid draft invoice.
router.patch(
  "/:invoiceId/cancel",
  authorizeRoles("admin", "staff"),
  cancelInvoiceController,
);

export default router;
