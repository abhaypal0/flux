import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import productRoutes from "./routes/product.routes.js";
import productVariantRoutes from "./routes/productVariant.routes.js";
import Authrouter from "./routes/auth.route.js";
import GoogleAuthrouter from "./routes/googleAuth.routes.js";

import planRouter from "./routes/plan.routes.js";
import taxRoutes from "./routes/tax.routes.js";
import discountRoutes from "./routes/discount.routes.js";

import quotationRoutes from "./routes/quotation.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import paymentRoutes from "./routes/payment.routes.js";


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

/* health check */
app.get(["/health-check", "/heath-check"], (req, res) => {
  res.status(200).json({
    success: true,
    message: "health check",
  });
});

/* Routes here*/
app.use("/api/products", productRoutes);
app.use("/api/product-variants", productVariantRoutes);
app.use("/api/auth", Authrouter);
app.use("/api/auth/google", GoogleAuthrouter);
app.use("/api/quotation", quotationRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/auth", GoogleAuthrouter);
app.use("/api/plans", planRouter);
app.use("/api/taxes", taxRoutes);
app.use("/api/discounts", discountRoutes);



/* centralized error middleware */
app.use(errorMiddleware);

export default app;
