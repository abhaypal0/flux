
import "dotenv/config";
import http from "http";

import app from "./src/app.js";
import { connectToDb } from "./src/database/database.js";
import { initSocket } from "./src/services/socket.service.js";

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectToDb();
    console.log("MongoDB connected successfully");

    // Initialize Socket.IO
    initSocket(httpServer);

    // Start HTTP Server
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

startServer();
