import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  console.log("Socket.IO initialized successfully");

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};