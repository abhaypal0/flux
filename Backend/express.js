import app from "./src/app.js";
import { connectToDb } from "./src/database/database.js";
import { initSocket } from "./src/sockets/server.socket.js";
import http from "http";

const httpServer = http.createServer(app);

initSocket(httpServer);
connectToDb();
httpServer.listen(3000, () => {
  console.log("server is runing on port 3000");
});
