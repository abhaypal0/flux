import mongoose from "mongoose";
import { randomBytes } from "crypto";

import quotationModel from "../models/quotation.model.js";
import productModel from "../models/product.model.js";
import userModel from "../models/user.model.js";
import planModel from "../models/plan.model.js";

// Check whether the logged-in user is internal staff.
const isInternalStaff = (role) => ["admin", "staff"].includes(role);

// Generate a quotation number.
const generateQuotationNumber = () => {
  return `QT-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
};

// Calculate quotation items and subtotal on the backend.
const calculateQuotationItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one quotation item is required.");
  }

  const calculatedItems = await Promise.all(
    items.map(async (item) => {
      const { product, quantity, tax } = item;

      if (!mongoose.Types.ObjectId.isValid(product)) {
        throw new Error("Invalid product ID.");
      }

      if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
        throw new Error("Quantity must be a positive integer.");
      }

      const productData = await productModel.findOne({
        _id: product,
        isActive: true,
      });

      if (!productData) {
        throw new Error(`Product not found or inactive: ${product}`);
      }

      if (tax && !mongoose.Types.ObjectId.isValid(tax)) {
        throw new Error("Invalid tax ID.");
      }

      const unitPrice = Number(productData.salesPrice);
      const amount = Number((unitPrice * Number(quantity)).toFixed(2));

      return {
        product: productData._id,
        quantity: Number(quantity),
        unitPrice,
        tax: tax || null,
        amount,
      };
    }),
  );

  const subtotal = Number(
    calculatedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
  );

  return { calculatedItems, subtotal };
};

// CREATE QUOTATION
export const createQuotationController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can create quotations.",
      });
    }

    const {
      customer,
      plan,
      items,
      validDays = 15,
      paymentTerms = "Due on receipt",
      discountAmount = 0,
      notes = "",
      templateName = null,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(customer) ||
      !mongoose.Types.ObjectId.isValid(plan)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid customer and plan IDs are required.",
      });
    }

    if (!Number.isInteger(Number(validDays)) || Number(validDays) < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid days must be a positive integer.",
      });
    }

    const customerExists = await userModel.findById(customer);

    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const planExists = await planModel.findById(plan);

    if (!planExists) {
      return res.status(404).json({
        success: false,
        message: "Plan not found.",
      });
    }

    const { calculatedItems, subtotal } = await calculateQuotationItems(items);

    const discount = Number(discountAmount);

    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount amount.",
      });
    }

    // Tax calculation is pending your Tax model structure.
    const taxAmount = 0;
    const totalAmount = Number((subtotal + taxAmount - discount).toFixed(2));

    const quotationDate = new Date();
    const expiryDate = new Date(
      quotationDate.getTime() + Number(validDays) * 24 * 60 * 60 * 1000,
    );

    const quotation = await quotationModel.create({
      quotationNumber: generateQuotationNumber(),
      customer,
      plan,
      templateName,
      validDays: Number(validDays),
      quotationDate,
      expiryDate,
      paymentTerms,
      items: calculatedItems,
      subtotal,
      taxAmount,
      discountAmount: discount,
      totalAmount,
      notes,
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Quotation created successfully.",
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL QUOTATIONS
export const getAllQuotationsController = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;

    const filter = {};

    // Customers can only see their own quotations.
    if (!isInternalStaff(req.user.role)) {
      filter.customer = req.user.userId;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.quotationNumber = {
        $regex: search,
        $options: "i",
      };
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [quotations, total] = await Promise.all([
      quotationModel
        .find(filter)
        .populate("customer", "fullName email")
        .populate("plan")
        .populate("items.product", "name type salesPrice")
        .populate("items.tax")
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      quotationModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Quotations fetched successfully.",
      data: quotations,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE QUOTATION
export const getQuotationByIdController = async (req, res, next) => {
  try {
    const { quotationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID.",
      });
    }

    const quotation = await quotationModel
      .findById(quotationId)
      .populate("customer", "fullName email")
      .populate("plan")
      .populate("items.product", "name type salesPrice")
      .populate("items.tax")
      .populate("createdBy", "fullName email");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    // Prevent customers from accessing another customer's quotation.
    if (
      !isInternalStaff(req.user.role) &&
      quotation.customer._id.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this quotation.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quotation fetched successfully.",
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE DRAFT QUOTATION
export const updateQuotationController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can update quotations.",
      });
    }

    const { quotationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID.",
      });
    }

    const quotation = await quotationModel.findById(quotationId);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    if (quotation.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft quotations can be updated.",
      });
    }

    const {
      customer,
      plan,
      items,
      validDays,
      paymentTerms,
      discountAmount,
      notes,
      templateName,
    } = req.body;

    if (customer !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(customer)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID.",
        });
      }

      const customerExists = await userModel.findById(customer);

      if (!customerExists) {
        return res.status(404).json({
          success: false,
          message: "Customer not found.",
        });
      }

      quotation.customer = customer;
    }

    if (plan !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(plan)) {
        return res.status(400).json({
          success: false,
          message: "Invalid plan ID.",
        });
      }

      const planExists = await planModel.findById(plan);

      if (!planExists) {
        return res.status(404).json({
          success: false,
          message: "Plan not found.",
        });
      }

      quotation.plan = plan;
    }

    if (validDays !== undefined) {
      if (!Number.isInteger(Number(validDays)) || Number(validDays) < 1) {
        return res.status(400).json({
          success: false,
          message: "Valid days must be a positive integer.",
        });
      }

      quotation.validDays = Number(validDays);
      quotation.expiryDate = new Date(
        quotation.quotationDate.getTime() +
          quotation.validDays * 24 * 60 * 60 * 1000,
      );
    }

    if (items !== undefined) {
      const result = await calculateQuotationItems(items);
      quotation.items = result.calculatedItems;
      quotation.subtotal = result.subtotal;
    }

    if (discountAmount !== undefined) {
      const discount = Number(discountAmount);

      if (
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > quotation.subtotal
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount amount.",
        });
      }

      quotation.discountAmount = discount;
    }

    if (paymentTerms !== undefined) quotation.paymentTerms = paymentTerms;
    if (notes !== undefined) quotation.notes = notes;
    if (templateName !== undefined) quotation.templateName = templateName;

    quotation.taxAmount = 0;
    quotation.totalAmount = Number(
      (
        quotation.subtotal +
        quotation.taxAmount -
        quotation.discountAmount
      ).toFixed(2),
    );

    await quotation.save();

    return res.status(200).json({
      success: true,
      message: "Quotation updated successfully.",
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

// CHANGE QUOTATION STATUS
export const updateQuotationStatusController = async (req, res, next) => {
  try {
    const { quotationId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID.",
      });
    }

    const quotation = await quotationModel.findById(quotationId);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    const isStaff = isInternalStaff(req.user.role);
    const isOwner = quotation.customer.toString() === req.user.userId;

    if (!isStaff && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this quotation.",
      });
    }

    // Staff can send a draft quotation or mark it expired.
    if (isStaff) {
      if (status === "quotation" && quotation.status === "draft") {
        quotation.status = "quotation";
      } else if (status === "expired" && quotation.status === "quotation") {
        if (new Date() < quotation.expiryDate) {
          return res.status(400).json({
            success: false,
            message: "This quotation has not reached its expiry date.",
          });
        }

        quotation.status = "expired";
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid staff status transition.",
        });
      }
    } else {
      // Customers can confirm or reject a sent quotation.
      if (
        !["confirmed", "rejected"].includes(status) ||
        quotation.status !== "quotation"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer status transition.",
        });
      }

      if (new Date() > quotation.expiryDate) {
        quotation.status = "expired";
        await quotation.save();

        return res.status(400).json({
          success: false,
          message: "This quotation has expired.",
        });
      }

      quotation.status = status;
    }

    await quotation.save();

    return res.status(200).json({
      success: true,
      message: `Quotation ${status} successfully.`,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};
