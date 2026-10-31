
import express from "express";

import {
  createTax,
  getAllTaxes,
  getSingleTax,
  updateTax,
  deleteTax,
} from "../controllers/tax.controller.js";

import { authUser } from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

router.use(authUser);

// Admin and Staff
router.post("/", authorizeRoles("admin", "staff"), createTax);
router.put("/:id", authorizeRoles("admin", "staff"), updateTax);

// All authenticated users
router.get("/", getAllTaxes);
router.get("/:id", getSingleTax);

// Only Admin
router.delete("/:id", authorizeRoles("admin"), deleteTax);

export default router;
