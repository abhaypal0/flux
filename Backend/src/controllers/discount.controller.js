
import discountModel from "../models/discount.model.js";

// CREATE DISCOUNT
export const createDiscount = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      discountType,
      discountValue,
      minimumPurchase,
      minimumQuantity,
      appliesTo,
      applicableProducts,
      startDate,
      endDate,
      usageLimit,
    } = req.body;

    if (
      !name ||
      !discountType ||
      discountValue === undefined ||
      !appliesTo ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (
      discountType === "percentage" &&
      (discountValue <= 0 || discountValue > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount must be between 1 and 100",
      });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const discount = await discountModel.create({
      name,
      code: code ? code.trim().toUpperCase() : undefined,
      description,
      discountType,
      discountValue,
      minimumPurchase,
      minimumQuantity,
      appliesTo,
      applicableProducts,
      startDate,
      endDate,
      usageLimit,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Discount created successfully",
      discount,
    });
  } catch (error) {
    console.error("Create Discount Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Discount code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL DISCOUNTS
export const getAllDiscounts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      discountType,
      appliesTo,
      isActive,
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    if (discountType) filter.discountType = discountType;
    if (appliesTo) filter.appliesTo = appliesTo;

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [discounts, totalDiscounts] = await Promise.all([
      discountModel
        .find(filter)
        .populate("applicableProducts", "name type")
        .populate("createdBy", "fullname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      discountModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      totalDiscounts,
      currentPage: Number(page),
      totalPages: Math.ceil(totalDiscounts / Number(limit)),
      discounts,
    });
  } catch (error) {
    console.error("Get Discounts Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE DISCOUNT
export const getSingleDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await discountModel
      .findById(id)
      .populate("applicableProducts", "name type")
      .populate("createdBy", "fullname email");

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found",
      });
    }

    return res.status(200).json({
      success: true,
      discount,
    });
  } catch (error) {
    console.error("Get Single Discount Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE DISCOUNT
export const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "name",
      "code",
      "description",
      "discountType",
      "discountValue",
      "minimumPurchase",
      "minimumQuantity",
      "appliesTo",
      "applicableProducts",
      "startDate",
      "endDate",
      "usageLimit",
      "isActive",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] =
          field === "code" && req.body[field]
            ? req.body[field].trim().toUpperCase()
            : req.body[field];
      }
    }

    if (
      updates.discountType === "percentage" &&
      updates.discountValue !== undefined &&
      (updates.discountValue <= 0 || updates.discountValue > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount must be between 1 and 100",
      });
    }

    const existingDiscount = await discountModel.findById(id);

    if (!existingDiscount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found",
      });
    }

    const finalStartDate = updates.startDate || existingDiscount.startDate;
    const finalEndDate = updates.endDate || existingDiscount.endDate;

    if (new Date(finalEndDate) < new Date(finalStartDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const discount = await discountModel.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Discount updated successfully",
      discount,
    });
  } catch (error) {
    console.error("Update Discount Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Discount code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE DISCOUNT (SOFT DELETE)
export const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await discountModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Discount deactivated successfully",
    });
  } catch (error) {
    console.error("Delete Discount Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// VALIDATE DISCOUNT CODE
export const validateDiscountCode = async (req, res) => {
  try {
    const { code, purchaseAmount, quantity, product } = req.body;

    if (!code || purchaseAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Discount code and purchase amount are required",
      });
    }

    const discount = await discountModel.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Invalid discount code",
      });
    }

    const now = new Date();

    if (now < discount.startDate || now > discount.endDate) {
      return res.status(400).json({
        success: false,
        message: "Discount code has expired or is not active yet",
      });
    }

    if (
      discount.usageLimit !== null &&
      discount.usedCount >= discount.usageLimit
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount usage limit reached",
      });
    }

    if (purchaseAmount < discount.minimumPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount is ${discount.minimumPurchase}`,
      });
    }

    if ((quantity || 1) < discount.minimumQuantity) {
      return res.status(400).json({
        success: false,
        message: `Minimum quantity required is ${discount.minimumQuantity}`,
      });
    }

    if (
      discount.appliesTo === "product" &&
      discount.applicableProducts.length > 0 &&
      !discount.applicableProducts.some(
        (item) => item.toString() === product
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount is not applicable to this product",
      });
    }

    const discountAmount =
      discount.discountType === "percentage"
        ? (purchaseAmount * discount.discountValue) / 100
        : discount.discountValue;

    const finalDiscount = Math.min(discountAmount, purchaseAmount);

    return res.status(200).json({
      success: true,
      message: "Discount applied successfully",
      discount: {
        name: discount.name,
        code: discount.code,
        discountAmount: finalDiscount,
        finalAmount: purchaseAmount - finalDiscount,
      },
    });
  } catch (error) {
    console.error("Validate Discount Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
