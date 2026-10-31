import mongoose from "mongoose";
import { randomBytes } from "crypto";

import subscriptionModel from "../models/subscription.model.js";
import quotationModel from "../models/quotation.model.js";
import planModel from "../models/plan.model.js";

const isInternalStaff = (role) => ["admin", "staff"].includes(role);

const generateSubscriptionNumber = () => {
  return `SUB-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
};

// Calculate the next billing date.
const calculateNextBillingDate = (startDate, billingCycle) => {
  const date = new Date(startDate);

  switch (billingCycle) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;

    case "weekly":
      date.setDate(date.getDate() + 7);
      break;

    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;

    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;

    default:
      throw new Error("Invalid billing cycle.");
  }

  return date;
};

// CREATE SUBSCRIPTION FROM CONFIRMED QUOTATION
export const createSubscriptionController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can create subscriptions.",
      });
    }

    const { quotationId, startDate, expiryDate, autoRenew, notes } = req.body;

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

    if (quotation.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed quotations can create subscriptions.",
      });
    }

    // Prevent duplicate subscription creation from one quotation.
    const existingSubscription = await subscriptionModel.findOne({
      quotation: quotation._id,
    });

    if (existingSubscription) {
      return res.status(409).json({
        success: false,
        message: "A subscription already exists for this quotation.",
        data: existingSubscription,
      });
    }

    const plan = await planModel.findById(quotation.plan);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found.",
      });
    }

    const validBillingCycles = ["daily", "weekly", "monthly", "yearly"];

    if (!validBillingCycles.includes(plan.billingCycle)) {
      return res.status(400).json({
        success: false,
        message: "Plan has an invalid or missing billing cycle.",
      });
    }

    const subscriptionStartDate = new Date(startDate);
    const subscriptionExpiryDate = new Date(expiryDate);

    if (
      !startDate ||
      !expiryDate ||
      Number.isNaN(subscriptionStartDate.getTime()) ||
      Number.isNaN(subscriptionExpiryDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid start date and expiry date are required.",
      });
    }

    if (subscriptionExpiryDate <= subscriptionStartDate) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be after start date.",
      });
    }

    if (!quotation.items.length) {
      return res.status(400).json({
        success: false,
        message: "Quotation must contain at least one product.",
      });
    }

    const nextBillingDate = calculateNextBillingDate(
      subscriptionStartDate,
      plan.billingCycle,
    );

    const subscription = await subscriptionModel.create({
      subscriptionNumber: generateSubscriptionNumber(),

      customer: quotation.customer,
      quotation: quotation._id,
      plan: quotation.plan,

      startDate: subscriptionStartDate,
      expiryDate: subscriptionExpiryDate,

      nextBillingDate:
        nextBillingDate <= subscriptionExpiryDate ? nextBillingDate : null,

      paymentTerms: quotation.paymentTerms,

      items: quotation.items.map((item) => ({
        product: item.product,
        variant: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        tax: item.tax || null,
        amount: item.amount,
      })),

      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      discountAmount: quotation.discountAmount,
      totalAmount: quotation.totalAmount,

      billingCycle: plan.billingCycle,

      // Subscription must be activated separately.
      status: "confirmed",

      autoRenew: autoRenew ?? true,
      notes: notes ?? quotation.notes,

      createdBy: req.user.userId,
    });

    // Mark quotation as converted after subscription creation.
    quotation.status = "converted";
    await quotation.save();

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully.",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL SUBSCRIPTIONS
export const getAllSubscriptionsController = async (req, res, next) => {
  try {
    const { status, billingCycle, page = 1, limit = 10, search } = req.query;

    const filter = {};

    // Customers can only view their own subscriptions.
    if (!isInternalStaff(req.user.role)) {
      filter.customer = req.user.userId;
    }

    if (status) filter.status = status;
    if (billingCycle) filter.billingCycle = billingCycle;

    if (search) {
      filter.subscriptionNumber = {
        $regex: search,
        $options: "i",
      };
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [subscriptions, total] = await Promise.all([
      subscriptionModel
        .find(filter)
        .populate("customer", "fullName email")
        .populate("quotation", "quotationNumber status")
        .populate("plan")
        .populate("items.product", "name type")
        .populate("items.variant", "variantName variantValue")
        .populate("items.tax")
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      subscriptionModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Subscriptions fetched successfully.",
      data: subscriptions,
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

// GET SUBSCRIPTION BY ID
export const getSubscriptionByIdController = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID.",
      });
    }

    const subscription = await subscriptionModel
      .findById(subscriptionId)
      .populate("customer", "fullName email")
      .populate("quotation", "quotationNumber status")
      .populate("plan")
      .populate("items.product", "name type")
      .populate("items.variant", "variantName variantValue")
      .populate("items.tax")
      .populate("createdBy", "fullName email");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    // Customer ownership check.
    if (
      !isInternalStaff(req.user.role) &&
      subscription.customer._id.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this subscription.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription fetched successfully.",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// ACTIVATE SUBSCRIPTION
export const activateSubscriptionController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can activate subscriptions.",
      });
    }

    const { subscriptionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID.",
      });
    }

    const subscription = await subscriptionModel.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    if (subscription.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed subscriptions can be activated.",
      });
    }

    if (subscription.expiryDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot activate an expired subscription.",
      });
    }

    subscription.status = "active";

    if (!subscription.nextBillingDate) {
      const nextDate = calculateNextBillingDate(
        subscription.startDate,
        subscription.billingCycle,
      );

      subscription.nextBillingDate =
        nextDate <= subscription.expiryDate ? nextDate : null;
    }

    await subscription.save();

    return res.status(200).json({
      success: true,
      message: "Subscription activated successfully.",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// PAUSE SUBSCRIPTION
export const pauseSubscriptionController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can pause subscriptions.",
      });
    }

    const { subscriptionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID.",
      });
    }

    const subscription = await subscriptionModel.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    if (subscription.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Only active subscriptions can be paused.",
      });
    }

    subscription.status = "paused";
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: "Subscription paused successfully.",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// RESUME SUBSCRIPTION
export const resumeSubscriptionController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can resume subscriptions.",
      });
    }

    const { subscriptionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID.",
      });
    }

    const subscription = await subscriptionModel.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    if (subscription.status !== "paused") {
      return res.status(400).json({
        success: false,
        message: "Only paused subscriptions can be resumed.",
      });
    }

    if (subscription.expiryDate <= new Date()) {
      subscription.status = "closed";
      subscription.closedAt = new Date();
      subscription.autoRenew = false;
      subscription.nextBillingDate = null;
      await subscription.save();

      return res.status(400).json({
        success: false,
        message: "Subscription has expired and cannot be resumed.",
        data: subscription,
      });
    }

    subscription.status = "active";
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: "Subscription resumed successfully.",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// CLOSE SUBSCRIPTION
export const closeSubscriptionController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can close subscriptions.",
      });
    }

    const { subscriptionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID.",
      });
    }

    const subscription = await subscriptionModel.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    if (subscription.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Subscription is already closed.",
      });
    }

    subscription.status = "closed";
    subscription.closedAt = new Date();
    subscription.autoRenew = false;
    subscription.nextBillingDate = null;

    await subscription.save();

    return res.status(200).json({
      success: true,
      message: "Subscription closed successfully.",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};
