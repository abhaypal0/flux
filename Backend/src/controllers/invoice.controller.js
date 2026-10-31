import mongoose from "mongoose";

import invoiceModel from "../models/invoice.mode.js";
import subscriptionModel from "../models/subscription.model.js";

const isInternalStaff = (role) => ["admin", "staff"].includes(role);

// Add one billing cycle without breaking month-end dates.
// Example: January 31 + 1 month = February 28/29.
const calculateNextBillingDate = (date, billingCycle) => {
  const nextDate = new Date(date);

  switch (billingCycle) {
    case "daily":
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      break;

    case "weekly":
      nextDate.setUTCDate(nextDate.getUTCDate() + 7);
      break;

    case "monthly": {
      const originalDay = nextDate.getUTCDate();
      const targetMonth = nextDate.getUTCMonth() + 1;

      nextDate.setUTCDate(1);
      nextDate.setUTCMonth(targetMonth);

      const lastDay = new Date(
        Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 0),
      ).getUTCDate();

      nextDate.setUTCDate(Math.min(originalDay, lastDay));
      break;
    }

    case "yearly": {
      const originalMonth = nextDate.getUTCMonth();
      const originalDay = nextDate.getUTCDate();

      nextDate.setUTCDate(1);
      nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
      nextDate.setUTCMonth(originalMonth);

      const lastDay = new Date(
        Date.UTC(nextDate.getUTCFullYear(), originalMonth + 1, 0),
      ).getUTCDate();

      nextDate.setUTCDate(Math.min(originalDay, lastDay));
      break;
    }

    default:
      throw new Error("Invalid subscription billing cycle.");
  }

  return nextDate;
};

const generateInvoiceNumber = () => {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");

  return `INV-${datePart}-${new mongoose.Types.ObjectId()
    .toString()
    .slice(-6)
    .toUpperCase()}`;
};

// Generate the billing period key from the period start date.
const generateBillingPeriodKey = (date) => {
  return new Date(date).toISOString().slice(0, 10);
};

// GENERATE INVOICE FROM ACTIVE SUBSCRIPTION
export const generateInvoiceController = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can generate invoices.",
      });
    }

    const { subscriptionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid subscription ID is required.",
      });
    }

    let createdInvoice;

    await session.withTransaction(async () => {
      const subscription = await subscriptionModel
        .findById(subscriptionId)
        .session(session)
        .populate("items.product", "name notes")
        .populate("items.variant", "variantName variantValue additionalPrice");

      if (!subscription) {
        const error = new Error("Subscription not found.");
        error.statusCode = 404;
        throw error;
      }

      if (subscription.status !== "active") {
        const error = new Error(
          "Invoices can only be generated for active subscriptions.",
        );
        error.statusCode = 400;
        throw error;
      }

      if (!subscription.nextBillingDate) {
        const error = new Error(
          "No next billing date is scheduled for this subscription.",
        );
        error.statusCode = 400;
        throw error;
      }

      const periodStart = new Date(subscription.nextBillingDate);
      const now = new Date();

      if (periodStart > now) {
        const error = new Error("The next billing date has not arrived yet.");
        error.statusCode = 400;
        throw error;
      }

      if (periodStart > subscription.expiryDate) {
        const error = new Error("Subscription has passed its expiry date.");
        error.statusCode = 400;
        throw error;
      }

      const billingPeriodKey = generateBillingPeriodKey(periodStart);

      // The unique index on subscription + billingPeriodKey
      // provides the final protection against duplicate invoices.
      const existingInvoice = await invoiceModel
        .findOne({
          subscription: subscription._id,
          billingPeriodKey,
        })
        .session(session);

      if (existingInvoice) {
        const error = new Error(
          "An invoice already exists for this billing period.",
        );
        error.statusCode = 409;
        throw error;
      }

      const periodEnd = calculateNextBillingDate(
        periodStart,
        subscription.billingCycle,
      );

      const invoiceItems = subscription.items.map((item) => {
        const product = item.product;
        const variant = item.variant;

        return {
          product: product?._id || item.product,
          productName: product?.name || "",
          variantName: variant
            ? `${variant.variantName}: ${variant.variantValue}`
            : "",
          variantPriceModifier: variant?.additionalPrice || 0,
          description: product?.notes || "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          tax: item.tax || null,

          // Tax calculation requires your Tax model and tax-rate rules.
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          amount: item.amount,
        };
      });

      const invoiceDate = new Date();

      // Due on receipt means due immediately.
      // Staff can supply a later due date if payment terms allow it.
      const dueDate = req.body.dueDate
        ? new Date(req.body.dueDate)
        : invoiceDate;

      if (Number.isNaN(dueDate.getTime()) || dueDate < invoiceDate) {
        const error = new Error(
          "Due date must be a valid date and cannot be before the invoice date.",
        );
        error.statusCode = 400;
        throw error;
      }

      const invoiceData = {
        invoiceNumber: generateInvoiceNumber(),
        customer: subscription.customer,
        subscription: subscription._id,
        billingPeriodKey,
        invoiceDate,
        dueDate,
        items: invoiceItems,
        subtotal: subscription.subtotal,
        appliedDiscount: null,
        discountAmount: subscription.discountAmount,
        taxAmount: subscription.taxAmount,
        totalAmount: subscription.totalAmount,
        paidAmount: 0,
        dueAmount: subscription.totalAmount,
        status: "draft",
        paymentStatus: "unpaid",
        isSent: false,
        notes: req.body.notes || subscription.notes,
        createdBy: req.user.userId,
      };

      const [invoice] = await invoiceModel.create([invoiceData], {
        session,
      });

      // Calculate the next billing date.
      let nextBillingDate = periodEnd;

      if (nextBillingDate > subscription.expiryDate) {
        nextBillingDate = null;
      }

      // Advance the subscription only if the billing date
      // has not been changed by another concurrent request.
      const updatedSubscription = await subscriptionModel.findOneAndUpdate(
        {
          _id: subscription._id,
          status: "active",
          nextBillingDate: periodStart,
        },
        {
          $set: {
            nextBillingDate,
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!updatedSubscription) {
        const error = new Error(
          "Subscription billing schedule changed. Please retry.",
        );
        error.statusCode = 409;
        throw error;
      }

      createdInvoice = invoice;
    });

    return res.status(201).json({
      success: true,
      message: "Invoice generated successfully.",
      data: createdInvoice,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An invoice already exists for this billing period.",
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  } finally {
    await session.endSession();
  }
};

// GET ALL INVOICES
export const getAllInvoicesController = async (req, res, next) => {
  try {
    const {
      status,
      paymentStatus,
      subscriptionId,
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const filter = {};

    // Customers can only access their own invoices.
    if (!isInternalStaff(req.user.role)) {
      filter.customer = req.user.userId;
    }

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (subscriptionId) {
      if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription ID.",
        });
      }

      filter.subscription = subscriptionId;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.invoiceNumber = {
        $regex: escapedSearch,
        $options: "i",
      };
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [invoices, total] = await Promise.all([
      invoiceModel
        .find(filter)
        .populate("customer", "fullName email")
        .populate("subscription", "subscriptionNumber billingCycle status")
        .populate("items.product", "name")
        .populate("items.tax")
        .populate("appliedDiscount")
        .populate("createdBy", "fullName email")
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limitNumber),

      invoiceModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Invoices fetched successfully.",
      data: invoices,
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

// GET SINGLE INVOICE
export const getInvoiceByIdController = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await invoiceModel
      .findById(invoiceId)
      .populate("customer", "fullName email")
      .populate("subscription", "subscriptionNumber billingCycle status")
      .populate("items.product", "name type")
      .populate("items.tax")
      .populate("appliedDiscount")
      .populate("createdBy", "fullName email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    if (
      !isInternalStaff(req.user.role) &&
      invoice.customer._id.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this invoice.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice fetched successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// CONFIRM INVOICE
export const confirmInvoiceController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can confirm invoices.",
      });
    }

    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await invoiceModel.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    if (invoice.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft invoices can be confirmed.",
      });
    }

    invoice.status = "confirmed";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Invoice confirmed successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// MARK INVOICE AS SENT
export const sendInvoiceController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can send invoices.",
      });
    }

    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await invoiceModel.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    if (invoice.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed invoices can be sent.",
      });
    }

    if (invoice.isSent) {
      return res.status(400).json({
        success: false,
        message: "Invoice has already been marked as sent.",
      });
    }

    // This only updates the sent flag.
    // Actual email delivery must be implemented separately.
    invoice.isSent = true;
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Invoice marked as sent.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// CANCEL INVOICE
export const cancelInvoiceController = async (req, res, next) => {
  try {
    if (!isInternalStaff(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or staff can cancel invoices.",
      });
    }

    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await invoiceModel.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    if (invoice.status === "paid" || invoice.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: "Paid or partially paid invoices cannot be cancelled.",
      });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already cancelled.",
      });
    }

    invoice.status = "cancelled";
    await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Invoice cancelled successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};
