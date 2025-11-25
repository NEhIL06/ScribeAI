import express from "express";
import http from "http";
import dotenv from "dotenv";
import { Server as IOServer } from "socket.io";
import { registerRecordingNamespace } from "./sockets/recording";
import { startProcessor, setIo } from "./workers/processor";
import prisma from "./prisma/client";

dotenv.config();

const app = express();
app.get("/", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const server = http.createServer(app);
const PORT = Number(process.env.PORT || 4001);

const io = new IOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://scribe-ai-ws.vercel.app"] // Update with your Vercel domain
      : "*", // Allow all origins in development
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 1e7,
});


setIo(io);
registerRecordingNamespace(io);

server.listen(PORT, () => {
  console.log(`WS server running at http://localhost:${PORT}`);
  startProcessor(io);
});
