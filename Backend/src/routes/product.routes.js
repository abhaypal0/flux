
import express from "express";
import { authUser } from "../middlewares/auth.middleware.js";

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
  authUser,
  authorizeRoles("admin"),
  createProductController
);

// Get all products (Admin, Staff, Customer)
router.get(
  "/",
  authUser,
  authorizeRoles("admin", "staff", "customer"),
  getAllProductsController
);

// Get product details by product ID
router.get(
  "/:productId",
  authUser,
  authorizeRoles("admin", "staff", "customer"),
  getProductByIdController
);

// Update existing product details (Admin only)
router.patch(
  "/:productId",
  authUser,
  authorizeRoles("admin"),
  updateProductController
);

// Deactivate a product (Admin only)
router.delete(
  "/:productId",
  authUser,
  authorizeRoles("admin"),
  deactivateProductController
);

export default router;
