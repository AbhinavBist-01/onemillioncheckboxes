import http from "node:http";
import path from "node:path";

import express from "express";
import { Server } from "socket.io";
import { publisher, subscriber, redis } from "./redis-connection.js";

async function main() {
  const PORT = process.env.PORT ?? 8000;

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server);

  const CHECKBOX_COUNT = 1000;
  const CHECKBOX_STATE_KEY = "checkbox-state";

  await subscriber.subscribe("internal-server:checkbox:change");
  subscriber.on("message", async (channel, message) => {
    if (channel === "internal-server:checkbox:change") {
      const { index, checked } = JSON.parse(message);

      const existingState = await redis.get(CHECKBOX_STATE_KEY);
      if (existingState) {
        const remoteData = JSON.parse(existingState);
        await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(remoteData));
      } else {
        await redis.set(
          CHECKBOX_STATE_KEY,
          JSON.stringify(new Array(CHECKBOX_COUNT).fill(false)),
        );
      }
      io.emit("server:checkbox:change", { index, checked });
    }
  });

  //Socket Handler

  io.on("connection", (socket) => {
    console.log("Socket connected: ", socket.id);

    socket.on("client:checkbox:change", async (data) => {
      console.log(`Socket : [${socket.id}]:client:checkbox:change`, data);

      publisher.publish(
        "internal-server:checkbox:change",
        JSON.stringify(data),
      );
    });
  });

  // Express
  app.use(express.json());
  app.use(express.static(path.resolve("./public")));
  app.get("/health", (req, res) => {
    res.json({ healthy: true });
  });
  app.get("/checkboxes", async (req, res) => {
    const existingState = await redis.get(CHECKBOX_STATE_KEY);

    if (existingState) {
      const remoteData = JSON.parse(existingState);
      res.json({ checkboxes: remoteData });
    } else {
      res.json({ checkboxes: new Array(CHECKBOX_COUNT).fill(false) });
    }
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

main();
