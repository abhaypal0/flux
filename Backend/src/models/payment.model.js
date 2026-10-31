import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "bank_transfer",
        "upi",
        "credit_card",
        "debit_card",
        "razorpay",
        "other",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    transactionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed",
      index: true,
    },

    notes: {
      type: String,
      default: "",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },

    razorpaySignature: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);


paymentSchema.index({ status: 1, paymentDate: -1 });


async function syncInvoicePaymentStatus(invoiceId) {
  if (!invoiceId) return;

  const Payment = mongoose.model("Payment");
  const Invoice = mongoose.model("Invoice");

  
  const result = await Payment.aggregate([
    {
      $match: {
        invoice: new mongoose.Types.ObjectId(invoiceId),
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$invoice",
        totalPaid: { $sum: "$amount" },
      },
    },
  ]);

  const totalPaid = result.length > 0 ? Number(result[0].totalPaid.toFixed(2)) : 0;

  const invoice = await Invoice.findById(invoiceId);
  if (invoice) {
    invoice.paidAmount = totalPaid;
  
    await invoice.save();
  }
}


paymentSchema.post("save", async function (doc, next) {
  try {
    await syncInvoicePaymentStatus(doc.invoice);
    next();
  } catch (error) {
    next(error);
  }
});


paymentSchema.post("findOneAndUpdate", async function (doc, next) {
  try {
    if (doc) {
      await syncInvoicePaymentStatus(doc.invoice);
    }
    next();
  } catch (error) {
    next(error);
  }
});

const paymentModel = mongoose.model("Payment", paymentSchema);

export default paymentModel;