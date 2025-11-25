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
  console.log("📡 Registering /record namespace...");
  const ns = io.of("/record");

  ns.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query.token;
    console.log(`\n🔐 Auth Middleware - Socket: ${socket.id}`);
    console.log(`   Token provided: ${token ? 'YES' : 'NO'}`);

    if (!token) {
      console.log(`❌ Auth failed: Missing token`);
      return next(new Error("Missing auth token"));
    }

    try {
      const session = await prisma.session.findUnique({
        where: { token: token as string },
        include: { user: true }
      });

      if (!session || session.expiresAt < new Date()) {
        console.log(`❌ Auth failed: Invalid or expired session`);
        return next(new Error("Unauthorized"));
      }

      console.log(`✅ Auth successful - User: ${session.user.email} (ID: ${session.user.id})`);
      (socket as any).user = session.user;
      next();
    } catch (err) {
      console.error("❌ Auth error:", err);
      next(new Error("Unauthorized"));
    }
  });

  ns.on("connection", (socket: Socket) => {
    const userId = (socket as any).user?.id;
    const userEmail = (socket as any).user?.email;
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🔌 WebSocket Connected`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   User Email: ${userEmail}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    socket.on("joinSession", async (payload: { sessionId: string }) => {
      console.log("\n📥 JOIN SESSION REQUEST");
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Session ID: ${payload?.sessionId || 'MISSING'}`);

      const { sessionId } = payload;

      if (!sessionId) {
        console.log("❌ No sessionId provided in payload");
        socket.emit("Error", { error: "Session ID required" });
        return;
      }

      console.log(`🔍 Looking up session in database...`);
      const session = await prisma.recordingSession.findFirst({
        where: { id: sessionId, userId: (socket as any).user.id }
      })

      if (!session) {
        console.log(`❌ Session NOT FOUND or no permission`);
        console.log(`   Searched for: sessionId=${sessionId}, userId=${userId}`);
        socket.emit("Error", { error: "No permission" });
        return;
      }

      console.log(`✅ Session found! Joining room...`);
      console.log(`   Session Title: ${session.title}`);
      console.log(`   Session State: ${session.state}`);
      socket.join(sessionId);
      socket.emit("joined", { sessionId });
      console.log(`✅ Successfully joined session: ${sessionId}\n`);
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

      try {
        // Write file asynchronously with proper error handling
        await fs.promises.writeFile(filename, Buffer.from(buffer));

        // Add small delay to ensure file is fully flushed to disk
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify file exists and has content
        const stats = await fs.promises.stat(filename);
        if (stats.size === 0) {
          throw new Error('Empty audio chunk file');
        }

        console.log(`🎵 Received audio chunk ${seq} for session ${sessionId} (${buffer.byteLength} bytes, verified ${stats.size} bytes on disk)`);

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
      } catch (err: any) {
        console.error(`❌ Failed to save chunk ${seq}:`, err.message);
        socket.emit("chunkAck", { ok: false, reason: err.message });
      }
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
      console.log(`🔌 WebSocket Disconnected - Socket: ${socket.id}`);
      socket.emit("disconnected", { sessionId: socket.id });
    });
  });

  console.log("✅ /record namespace registered successfully\n");
}
