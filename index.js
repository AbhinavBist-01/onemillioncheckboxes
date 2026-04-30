import http from "node:http";
import path from "node:path";

import express from "express";
import { Server } from "socket.io";

async function main() {
  const PORT = process.env.PORT ?? 8000;

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server);

  const CHECKBOX_COUNT = 1000;
  const state = {
    checkboxes: new Array(CHECKBOX_COUNT).fill(false),
  };

  //Socket Handler

  io.on("connection", (socket) => {
    console.log("Socket connected: ", socket.id);

    socket.on("client:checkbox:change", (data) => {
      console.log(`Socket : [${socket.id}]:client:checkbox:change`, data);
      io.emit(`server:checkbox:change`, data);
      state.checkboxes[data.index] = data.checked;
    });
  });

  // Express
  app.use(express.json());
  app.use(express.static(path.resolve("./public")));
  app.get("/health", (req, res) => {
    res.json({ healthy: true });
  });
  app.get("/checkboxes", (req, res) => {
    res.json({ checkboxes: state.checkboxes });
  });
  app.post("/checkboxes/toggle", (req, res) => {
    const { index, checked } = req.body ?? {};

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= CHECKBOX_COUNT ||
      typeof checked !== "boolean"
    ) {
      return res.status(400).json({
        error:
          "Invalid payload. Expected { index: number(0-999), checked: boolean }.",
      });
    }

    state.checkboxes[index] = checked;
    io.emit("server:checkbox:change", { index, checked });
    res.json({ ok: true, index, checked });
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

main();
