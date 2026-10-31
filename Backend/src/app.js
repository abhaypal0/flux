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
import quotationRoutes from "./routes/quotation.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";

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
app.use("/auth", GoogleAuthrouter);
app.use("/quotation", quotationRoutes);
app.use("/subscription", subscriptionRoutes);

/* centralized error middleware */
app.use(errorMiddleware);

export default app;
