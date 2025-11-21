import express from "express";
import http from "http";
import dotenv from "dotenv";
import { Server as IOServer } from "socket.io";
import { registerRecordingNamespace } from "./sockets/recording";
import { startProcessor, setIo } from "./workers/processor";
//TODO change to ./scribeai/web
import { verifyAuthToken } from "../../web/auth";

dotenv.config();

const app = express();
app.get("/", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const server = http.createServer(app);
const PORT = Number(process.env.PORT || 4001);

const io = new IOServer(server, {
  path: "/ws",
  maxHttpBufferSize: 1e7,
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query.token;
  if (!token) return next(new Error("Missing auth token"));

  try {
    const session = await verifyAuthToken(token);
    (socket as any).user = session.user;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

setIo(io);
registerRecordingNamespace(io);

server.listen(PORT, () => {
  console.log(`WS server running at http://localhost:${PORT}`);
  startProcessor(io);
});
