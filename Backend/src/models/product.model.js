
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["software", "service", "addon", "other"],
    },

    salesPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
    },

    // Product Variants
    variants: [
      {
        name: {
          type: String,
          required: true,
        },

        value: {
          type: String,
          required: true,
        },

        additionalPrice: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const productModel = mongoose.model("Product", productSchema);

export default productModel;
