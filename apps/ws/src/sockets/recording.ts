import { Server, Socket } from "socket.io";
import path from "path";
import fs from "fs";
import { z } from "zod";
import prisma from "../prisma/client";
import { enqueueJob } from "../queue/diskQueue";
import { CHUNK_STORE } from "../config";

const chunkMeta = z.object({
  sessionId: z.string(),
  seq: z.number(),
  startMs: z.number().optional(),
  durationMs: z.number().optional(),
  mime: z.string().optional()
});

export function registerRecordingNamespace(io: Server) {
  const ns = io.of("/record");

  ns.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query.token;
    if (!token) return next(new Error("Missing auth token"));

    try {
      const session = await prisma.session.findUnique({
        where: { token: token as string },
        include: { user: true }
      });

      if (!session || session.expiresAt < new Date()) {
        return next(new Error("Unauthorized"));
      }

      (socket as any).user = session.user;
      next();
    } catch (err) {
      console.error("Auth error:", err);
      next(new Error("Unauthorized"));
    }
  });

  ns.on("connection", (socket: Socket) => {
    console.log("socket connected", socket.id);

    socket.on("joinSession", async (payload: { sessionId: string }) => {

      const { sessionId } = payload;

      const session = await prisma.recordingSession.findFirst({
        where: { id: sessionId, userId: (socket as any).user.id }
      })

      if (!session) {
        socket.emit("Error", { error: "No permission" });
        return;
      }

      socket.join(sessionId);
      socket.emit("joined", { sessionId });
    });

    /**
     * audioChunk(meta, arrayBuffer)
     * meta: { sessionId, seq, startMs, durationMs }
     */
    socket.on("audioChunk", async (meta: any, buffer: ArrayBuffer) => {
      const parsed = chunkMeta.safeParse(meta);
      if (!parsed.success) {
        socket.emit("chunkAck", { ok: false, reason: "invalid meta" });
        return;
      }
      const { sessionId, seq } = parsed.data;
      const dir = path.join(CHUNK_STORE, sessionId);
      fs.mkdirSync(dir, { recursive: true });
      const filename = path.join(dir, `${seq}.webm`);
      fs.writeFileSync(filename, Buffer.from(buffer));

      console.log(`🎵 Received audio chunk ${seq} for session ${sessionId} (${buffer.byteLength} bytes)`);

      // create DB segment placeholder if not exist
      try {
        await prisma.transcriptSegment.create({
          data: {
            sessionId,
            seq,
            startMs: parsed.data.startMs ?? 0,
            endMs: (parsed.data.startMs ?? 0) + (parsed.data.durationMs ?? 0),
            text: "",
            isFinal: false,
          },
        });
      } catch (err) {
        // ignore unique constraint errors if re-sent
      }

      // enqueue for processing
      enqueueJob("chunk", { sessionId, seq, filename, meta: parsed.data });
      console.log(`✅ Enqueued chunk ${seq} for processing`);

      socket.emit("chunkAck", { ok: true, sessionId, seq });
    });

    socket.on("pause", async ({ sessionId }: { sessionId: string }) => {
      ns.to(sessionId).emit("paused", { sessionId });
      await prisma.recordingSession.updateMany({ where: { id: sessionId }, data: { state: "paused" } }).catch(() => { });
    });

    socket.on("resume", async ({ sessionId }: { sessionId: string }) => {
      ns.to(sessionId).emit("resumed", { sessionId });
      await prisma.recordingSession.updateMany({ where: { id: sessionId }, data: { state: "recording" } }).catch(() => { });
    });

    socket.on("stopSession", async ({ sessionId }: { sessionId: string }) => {
      console.log(`🛑 stopSession called for ${sessionId}`);
      await prisma.recordingSession.update({ where: { id: sessionId }, data: { state: "processing", stoppedAt: new Date() } }).catch(() => { });
      ns.to(sessionId).emit("processing", { sessionId });
      enqueueJob("finalize", { sessionId });
      console.log(`📦 Enqueued finalize job for ${sessionId}`);
    });

    socket.on("heartbeat", () => {
      socket.emit("heartbeatAck", { ts: Date.now() });
    });

    socket.on("disconnect", () => {
      socket.emit("disconnected", { sessionId: socket.id });
    });
  });
}
