import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
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

    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },

  
    billingPeriodKey: {
      type: String,
      required: true,
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    dueDate: {
      type: Date,
      required: true,
      index: true, 
    },

    
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        
        productName: {
          type: String,
          default: "",
        },

        variantName: {
          type: String, 
          default: "",
        },

        variantPriceModifier: {
          type: Number, 
          default: 0,
        },

        description: {
          type: String,
          default: "",
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        unitPrice: {
          type: Number, 
          required: true,
          min: 0,
        },

        tax: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tax",
          default: null,
        },

        taxRate: {
          type: Number, 
          default: 0,
        },

        taxAmount: {
          type: Number,
          default: 0,
        },

         discountAmount: {
          type: Number, 
          default: 0,
        },

        amount: {
          type: Number, 
          required: true,
          min: 0,
        },
      },
    ],

    subtotal: {
      type: Number,
      default: 0,
    },

  
    appliedDiscount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discount",
      default: null,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    dueAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["draft", "confirmed", "paid", "cancelled"],
      default: "draft",
      index: true,
    },

   
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid", "overdue"],
      default: "unpaid",
      index: true,
    },

   
    isSent: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      default: "",
    },


    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


invoiceSchema.index({ subscription: 1, billingPeriodKey: 1 }, { unique: true });


invoiceSchema.index({ status: 1, paymentStatus: 1, dueDate: 1 });


invoiceSchema.pre("save", function (next) {
 
  this.dueAmount = Math.max(0, Number((this.totalAmount - this.paidAmount).toFixed(2)));

  if (this.status === "cancelled") {
    return next();
  }

  
  if (this.dueAmount === 0 && this.totalAmount > 0) {
    this.paymentStatus = "paid";
    this.status = "paid"; 
  } else if (this.paidAmount > 0 && this.dueAmount > 0) {
    this.paymentStatus = "partially_paid";
  } else if (this.dueDate && new Date() > new Date(this.dueDate) && this.dueAmount > 0) {
    this.paymentStatus = "overdue";
  } else {
    this.paymentStatus = "unpaid";
  }

  next();
});

const invoiceModel = mongoose.model("Invoice", invoiceSchema);

export default invoiceModel;