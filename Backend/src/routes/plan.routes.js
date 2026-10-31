
import express from "express";

import {
  createPlan,
  getAllPlans,
  getSinglePlan,
  updatePlan,
  deletePlan,
} from "../controller/plan.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createPlan);
router.get("/", getAllPlans);
router.get("/:id", getSinglePlan);
router.put("/:id", updatePlan);
router.delete("/:id", deletePlan);

export default router;
