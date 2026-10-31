import planModel from "../models/plan.model.js";

// CREATE PLAN
export const createPlan = async (req, res) => {
  try {
    const {
      name,
      product,
      description,
      price,
      billingCycle,
      minQuantity,
      startDate,
      endDate,
      allowEarlyClosure,
      allowPause,
      allowRenewal,
      autoClose,
    } = req.body;

    if (
      !name ||
      !product ||
      price === undefined ||
      !billingCycle ||
      !startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const plan = await planModel.create({
      name,
      product,
      description,
      price,
      billingCycle,
      minQuantity,
      startDate,
      endDate,
      allowEarlyClosure,
      allowPause,
      allowRenewal,
      autoClose,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Plan created successfully",
      plan,
    });
  } catch (error) {
    console.error("Create Plan Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL PLANS
export const getAllPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, billingCycle, isActive } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (billingCycle) {
      filter.billingCycle = billingCycle;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [plans, totalPlans] = await Promise.all([
      planModel
        .find(filter)
        .populate("product", "name type")
        .populate("createdBy", "fullname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      planModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      totalPlans,
      currentPage: Number(page),
      totalPages: Math.ceil(totalPlans / Number(limit)),
      plans,
    });
  } catch (error) {
    console.error("Get Plans Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE PLAN
export const getSinglePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await planModel
      .findById(id)
      .populate("product", "name type")
      .populate("createdBy", "fullname email");

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Get Single Plan Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE PLAN
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "name",
      "product",
      "description",
      "price",
      "billingCycle",
      "minQuantity",
      "startDate",
      "endDate",
      "allowEarlyClosure",
      "allowPause",
      "allowRenewal",
      "autoClose",
      "isActive",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const plan = await planModel.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      plan,
    });
  } catch (error) {
    console.error("Update Plan Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE PLAN (SOFT DELETE)
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await planModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan deactivated successfully",
    });
  } catch (error) {
    console.error("Delete Plan Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
