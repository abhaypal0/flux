import mongoose from "mongoose";
import productModel from "../models/product.model.js";
import productVariantModel from "../models/productVariant.model.js";

// CREATE PRODUCT VARIANT
export const createProductVariantController = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { variantName, variantValue, additionalPrice = 0 } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!variantName || !variantValue) {
      return res.status(400).json({
        success: false,
        message: "Variant name and value are required",
      });
    }

    const product = await productModel.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Active product not found",
      });
    }

    const variant = await productVariantModel.create({
      product: productId,
      variantName,
      variantValue,
      additionalPrice,
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Product variant created successfully",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// GET VARIANTS BY PRODUCT
export const getProductVariantByIdController = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const filter = {
      product: productId,
    };

    // Customers and staff only see active variants
    if (req.user.role !== "admin") {
      filter.isActive = true;
    } else if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const variants = await productVariantModel
      .find(filter)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Product variants fetched successfully",
      data: variants,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE PRODUCT VARIANT
export const updateProductVariantController = async (req, res, next) => {
  try {
    const { variantId } = req.params;

    if (!mongoose.isValidObjectId(variantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant ID",
      });
    }

    const allowedFields = [
      "variantName",
      "variantValue",
      "additionalPrice",
      "isActive",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    const variant = await productVariantModel.findByIdAndUpdate(
      variantId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product variant updated successfully",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// DEACTIVATE PRODUCT VARIANT
export const deactivateProductVariantController = async (req, res, next) => {
  try {
    const { variantId } = req.params;

    if (!mongoose.isValidObjectId(variantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant ID",
      });
    }

    const variant = await productVariantModel.findByIdAndUpdate(
      variantId,
      { $set: { isActive: false } },
      { new: true },
    );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product variant deactivated successfully",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};
