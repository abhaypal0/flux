import mongoose from "mongoose";
import crypto from "crypto";

import paymentModel from "../models/payment.model.js";
import invoiceModel from "../models/invoice.mode.js";

import { createOrder, fetchPayment } from "../services/razorpay.service.js";

import { config } from "../config/config.js";

// Generate payment number
const generatePaymentNumber = () => {
  return `PAY-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

// GET ALL PAYMENTS
export const getAllPaymentsController = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod } = req.query;

    const filter = {};

    // Customers can only see their own payments
    if (req.user.role === "customer") {
      filter.customer = req.user.userId;
    }

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      paymentModel
        .find(filter)
        .populate("customer", "fullName email")
        .populate("invoice", "invoiceNumber totalAmount paidAmount dueAmount")
        .populate("receivedBy", "fullName email")
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),

      paymentModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: payments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET PAYMENT BY ID
export const getPaymentByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment = await paymentModel
      .findById(id)
      .populate("customer", "fullName email")
      .populate("invoice")
      .populate("receivedBy", "fullName email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Customers can only access their own payments
    if (
      req.user.role === "customer" &&
      payment.customer._id.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this payment",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment fetched successfully",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE RAZORPAY ORDER
export const createOrderController = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const invoice = await invoiceModel.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Only the invoice owner can initiate payment
    if (
      req.user.role === "customer" &&
      invoice.customer.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot pay this invoice",
      });
    }

    if (invoice.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed invoices can be paid",
      });
    }

    if (invoice.dueAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invoice is already paid",
      });
    }

    // Amount is calculated on the server, never from frontend input
    const amount = Number(invoice.dueAmount);

    // Create Razorpay order
    const order = await createOrder({
      amount,
      currency: "INR",
    });

    // Save pending payment in database
    const payment = await paymentModel.create({
      paymentNumber: generatePaymentNumber(),
      customer: invoice.customer,
      invoice: invoice._id,
      paymentMethod: "razorpay",
      amount,
      status: "pending",
      razorpayOrderId: order.id,
      notes: "Razorpay order created",
    });

    return res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",
      data: {
        paymentId: payment._id,
        paymentNumber: payment.paymentNumber,
        invoiceId: invoice._id,
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKey: config.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    next(error);
  }
};

// VERIFY RAZORPAY PAYMENT
export const verifyPaymentController = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay verification details",
      });
    }

    // Find the pending payment using the order ID saved on our server
    const payment = await paymentModel.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found",
      });
    }

    // Ensure the logged-in customer owns this payment
    if (
      req.user.role === "customer" &&
      payment.customer.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot verify this payment",
      });
    }

    // Idempotency: don't credit an already completed payment twice
    if (payment.status === "completed") {
      if (payment.transactionId === razorpay_payment_id) {
        return res.status(200).json({
          success: true,
          message: "Payment already verified",
          data: payment,
        });
      }

      return res.status(409).json({
        success: false,
        message: "This order has already been paid",
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This payment is not pending",
      });
    }

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", config.RAZORPAY_SECRET_KEY)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Compare signatures safely
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(razorpay_signature, "hex");

    const signatureValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!signatureValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Fetch payment details directly from Razorpay
    const razorpayPayment = await fetchPayment(razorpay_payment_id);

    // Verify order association, amount, currency and captured status
    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.amount !== Math.round(payment.amount * 100) ||
      razorpayPayment.currency !== payment.currency ||
      razorpayPayment.status !== "captured"
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment details do not match",
      });
    }

    // Prevent a payment ID from being used for another record
    const existingPayment = await paymentModel.findOne({
      transactionId: razorpay_payment_id,
    });

    if (existingPayment) {
      return res.status(409).json({
        success: false,
        message: "This Razorpay payment has already been processed",
      });
    }

    // Update payment; your post-save hook recalculates invoice paidAmount
    payment.transactionId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "completed";
    payment.paymentDate = new Date();
    payment.notes = "Razorpay payment verified successfully";

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: payment,
    });
  } catch (error) {
    // Unique transaction ID conflict, for example
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This payment has already been processed",
      });
    }

    next(error);
  }
};
