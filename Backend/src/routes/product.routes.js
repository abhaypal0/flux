import express from "express";

import {
  createProductController,
  getAllProductsController,
  getProductByIdController,
  updateProductController,
  deactivateProductController,
} from "../controllers/product.controller.js";

import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// Create a new product (Admin only)
router.post(
  "/",
  authorizeRoles("admin"),
  createProductController,
);

// Get all products with search, filters and pagination
router.get(
  "/",
  authorizeRoles("admin", "staff", "customer"),
  getAllProductsController,
);

// Get product details by product ID
router.get(
  "/:productId",
  authorizeRoles("admin", "staff", "customer"),
  getProductByIdController,
);

// Update existing product details (Admin only)
router.patch(
  "/:productId",
  authorizeRoles("admin"),
  updateProductController,
);

// Deactivate a product (Admin only)
router.delete(
  "/:productId",
  authorizeRoles("admin"),
  deactivateProductController,
);

export default router;
