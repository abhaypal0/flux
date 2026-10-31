import mongoose from "mongoose";
import { config } from "../config/config.js";

export const connectToDb = async () => {
  await mongoose.connect(config.MONGO_URI);
  console.log("database connected");
};
