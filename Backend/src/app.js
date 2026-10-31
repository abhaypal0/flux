import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import productRoutes from "./routes/product.routes.js";
import productVariantRoutes from "./routes/productVariant.routes.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

/* health check */
app.get("/heath-check", (req, res) => {
  res.status(201).json({
    success: true,
    message: "health check",
  });
});

/* Routes here*/
app.use("/api/products", productRoutes);
app.use("/api/product-variants", productVariantRoutes);

/* centralized error middleware */
app.use(errorMiddleware);

export default app;
