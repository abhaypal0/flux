
import taxModel from "../models/tax.model.js";

// CREATE TAX
export const createTax = async (req, res) => {
  try {
    const {
      name,
      taxType,
      rate,
      description,
      applicableProducts,
      startDate,
      endDate,
    } = req.body;

    if (!name || !taxType || rate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, tax type and rate are required",
      });
    }

    const tax = await taxModel.create({
      name,
      taxType,
      rate,
      description,
      applicableProducts,
      startDate,
      endDate,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Tax created successfully",
      tax,
    });
  } catch (error) {
    console.error("Create Tax Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL TAXES
export const getAllTaxes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, taxType, isActive } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (taxType) {
      filter.taxType = taxType;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [taxes, totalTaxes] = await Promise.all([
      taxModel
        .find(filter)
        .populate("applicableProducts", "name type")
        .populate("createdBy", "fullname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      taxModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      totalTaxes,
      currentPage: Number(page),
      totalPages: Math.ceil(totalTaxes / Number(limit)),
      taxes,
    });
  } catch (error) {
    console.error("Get Taxes Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE TAX
export const getSingleTax = async (req, res) => {
  try {
    const { id } = req.params;

    const tax = await taxModel
      .findById(id)
      .populate("applicableProducts", "name type")
      .populate("createdBy", "fullname email");

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: "Tax not found",
      });
    }

    return res.status(200).json({
      success: true,
      tax,
    });
  } catch (error) {
    console.error("Get Single Tax Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE TAX
export const updateTax = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "name",
      "taxType",
      "rate",
      "description",
      "applicableProducts",
      "startDate",
      "endDate",
      "isActive",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const tax = await taxModel.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: "Tax not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tax updated successfully",
      tax,
    });
  } catch (error) {
    console.error("Update Tax Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE TAX (SOFT DELETE)
export const deleteTax = async (req, res) => {
  try {
    const { id } = req.params;

    const tax = await taxModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: "Tax not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tax deactivated successfully",
    });
  } catch (error) {
    console.error("Delete Tax Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
