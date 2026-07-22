import { createServer } from "node:http";

import cors from "cors";
import express from "express";
import { Server } from "socket.io";

import { config } from "./config";
import { registerSocketHandlers } from "./socket/registerSocketHandlers";

const app = express();
app.use(cors({ origin: config.clientUrl }));
app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.clientUrl, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => registerSocketHandlers(io, socket));

httpServer.listen(config.port, () => {
  console.log(`CareSpeak server listening on port ${config.port}`);
});
