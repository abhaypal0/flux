
import express from "express";

import {
  createPlan,
  getAllPlans,
  getSinglePlan,
  updatePlan,
  deletePlan,
} from "../controller/plan.controller.js";

import { authUser} from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const planRouter = express.Router();

// All routes require login
planRouter.use(authUser);

// Admin and Staff
planRouter.post("/", authorizeRoles("admin", "staff"), createPlan);

planRouter.put("/:id", authorizeRoles("admin", "staff"), updatePlan);

// Only Admin
planRouter.delete("/:id", authorizeRoles("admin"), deletePlan);

// All logged-in users
planRouter.get("/", getAllPlans);
planRouter.get("/:id", getSinglePlan);

export default planRouter;
