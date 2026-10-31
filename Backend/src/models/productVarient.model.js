
import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantName: {
      type: String,
      required: true,
      trim: true,
    },

    variantValue: {
      type: String,
      required: true,
      trim: true,
    },

    additionalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

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

const productVariantModel = mongoose.model(
  "ProductVariant",
  productVariantSchema
);

export default productVariantModel;
