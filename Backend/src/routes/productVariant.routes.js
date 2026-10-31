import express from "express";

import {
  createProductVariantController,
  getProductVariantByIdController,
  updateProductVariantController,
  deactivateProductVariantController,
} from "../controllers/productVariant.controller.js";

import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// Create a new product variant (Admin only)
router.post(
  "/",
  authorizeRoles("admin"),
  createProductVariantController,
);

// Get product variant details by variant ID
router.get(
  "/:variantId",
  authorizeRoles("admin", "staff", "customer"),
  getProductVariantByIdController,
);

// Update existing product variant details (Admin only)
router.patch(
  "/:variantId",
  authorizeRoles("admin"),
  updateProductVariantController,
);

// Deactivate a product variant (Admin only)
router.delete(
  "/:variantId",
  authorizeRoles("admin"),
  deactivateProductVariantController,
);

export default router;
