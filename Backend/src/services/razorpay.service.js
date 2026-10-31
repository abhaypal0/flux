import Razorpay from "razorpay";
import { config } from "../config/config.js";

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_SECRET_KEY,
});

export const createOrder = async ({ amount, currency = "INR" }) => {
  return await razorpay.orders.create({
    amount: Math.round(amount * 100), // Rupees to paise
    currency,
    receipt: `inv_${Date.now()}`,
  });
};

export const fetchPayment = async (paymentId) => {
  return await razorpay.payments.fetch(paymentId);
};
