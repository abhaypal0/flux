
import express from "express";

import {
  createDiscount,
  getAllDiscounts,
  getSingleDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscountCode,
} from "../controllers/discount.controller.js";

import { authUser } from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

router.use(authUser);

// Validate discount code
router.post("/validate", validateDiscountCode);

// Admin and Staff
router.post("/", authorizeRoles("admin", "staff"), createDiscount);
router.put("/:id", authorizeRoles("admin", "staff"), updateDiscount);

// All authenticated users
router.get("/", getAllDiscounts);
router.get("/:id", getSingleDiscount);

// Only Admin
router.delete("/:id", authorizeRoles("admin"), deleteDiscount);

export default router;
