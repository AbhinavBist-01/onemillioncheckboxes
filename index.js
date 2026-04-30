import http from "node:http";
import path from "node:path";

import express from "express";
import { Server } from "socket.io";

async function main() {
  const PORT = process.env.PORT ?? 8000;

  const app = express();
  const server = http.createServer(app);

  const io = new Server();
  io.attach(server);

  //Socket Handler

  io.on("connection", (socket) => {
    console.log("Socket connected: ", socket.id);

    socket.on("client:checkbox:change", (data) => {
      console.log(`Socket : [${socket.id}]:client:checkbox:change`, data);
    });
  });

  // Express
  app.use(express.static(path.resolve("./public")));
  app.get("/health", (req, res) => {
    res.json({ healthy: true });
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
main();
