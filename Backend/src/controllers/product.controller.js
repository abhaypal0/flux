import mongoose from "mongoose";
import productModel from "../models/product.model.js";
import productVariantModel from "../models/productVariant.model.js";

// CREATE PRODUCT
export const createProductController = async (req, res, next) => {
  try {
    const { name, type, salesPrice, costPrice, notes } = req.body;

    if (!name || !type || salesPrice === undefined || costPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const product = await productModel.create({
      name,
      type,
      salesPrice,
      costPrice,
      notes,
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL PRODUCTS
export const getAllProductsController = async (req, res, next) => {
  try {
    const { search = "", type, isActive, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(limit) || 10));

    const filter = {};

    if (search.trim()) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (type) {
      filter.type = type;
    }

    if (isActive !== undefined) {
      if (!["true", "false"].includes(isActive)) {
        return res.status(400).json({
          success: false,
          message: "Invalid isActive value",
        });
      }

      filter.isActive = isActive === "true";
    }

    const [products, totalProducts] = await Promise.all([
      productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .lean(),

      productModel.countDocuments(filter),
    ]);

    // Fetch variants in one additional query
    const productIds = products.map((product) => product._id);

    const variantFilter = {
      product: { $in: productIds },
    };

    // Non-admin users only see active variants
    if (req.user.role !== "admin") {
      variantFilter.isActive = true;
    }

    const variants = await productVariantModel.find(variantFilter).lean();

    const result = products.map((product) => {
      if (req.user.role !== "admin") {
        delete product.costPrice;
      }

      return {
        ...product,
        variants: variants.filter(
          (variant) => variant.product.toString() === product._id.toString(),
        ),
      };
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: result,
      pagination: {
        totalProducts,
        currentPage,
        totalPages: Math.ceil(totalProducts / perPage),
        limit: perPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE PRODUCT
export const getProductByIdController = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await productModel.findById(productId).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variantFilter = {
      product: productId,
    };

    if (req.user.role !== "admin") {
      variantFilter.isActive = true;
      delete product.costPrice;
    }

    const variants = await productVariantModel.find(variantFilter).lean();

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: {
        ...product,
        variants,
      },
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE PRODUCT
export const updateProductController = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const allowedFields = [
      "name",
      "type",
      "salesPrice",
      "costPrice",
      "notes",
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

    const product = await productModel.findByIdAndUpdate(
      productId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// DEACTIVATE PRODUCT
export const deactivateProductController = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await productModel.findByIdAndUpdate(
      productId,
      { $set: { isActive: false } },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};
