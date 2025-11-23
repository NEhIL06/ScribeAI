import { pickJob, completeJob, failJob, recoverStaleRunning } from "../queue/diskQueue";
import { MAX_CONCURRENCY, MAX_PENDING_JOBS, MIN_FREE_BYTES } from "../config";
import pino from "pino";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import os from "os";
import fs from "fs";
import path from "path";
import { transcribeChunk, summarizeTranscript } from "../lib/gemini";
import { prisma } from "../../../../packages/database/src";

ffmpeg.setFfmpegPath(ffmpegPath as string);
const log = pino();

let active = 0;
let stopFlag = false;
let ioRef: any = null;

export function setIo(io: any) { ioRef = io; }
export function setIoServer(io: any) { ioRef = io; }

export function startProcessor(io?: any) {
  recoverStaleRunning();
  tick(io);
}

export function stopProcessor() {
  stopFlag = true;
}

async function tick(io?: any) {
  while (!stopFlag) {
    try {
      const pending = pickJobCount();
      if (pending > MAX_PENDING_JOBS) {
        await sleep(2000);
        continue;
      }
      if (!hasEnoughFreeSpace(MIN_FREE_BYTES)) {
        await sleep(5000);
        continue;
      }
      if (active >= MAX_CONCURRENCY) {
        await sleep(200);
        continue;
      }

      const job = pickJob();
      if (!job) {
        await sleep(200);
        continue;
      }

      active++;
      processJob(job, io).catch(err => log.error({ err }, "processJob error")).finally(() => active--);
    } catch (err) {
      log.error({ err }, "processor loop");
      await sleep(500);
    }
  }
}

function pickJobCount() {
  try {
    const files = fs.readdirSync(process.cwd() + "/data/jobs").filter(f => f.endsWith(".json"));
    return files.length;
  } catch {
    return 0;
  }
}

async function processJob(job: any, io?: any) {
  try {
    if (job.type === "chunk") {
      await handleChunk(job, io);
    } else if (job.type === "finalize") {
      await handleFinalize(job, io);
    }
    completeJob(job);
  } catch (err: any) {
    failJob(job, err?.message ?? String(err));
  }
}

async function handleChunk(job: any, io?: any) {
  const { sessionId, seq, filename, meta } = job.payload;
  log.info({ sessionId, seq }, "processing chunk");

  const out = filename.replace(/\.(webm|ogg|m4a)$/i, ".wav");
  await transcodeToWav(filename, out);

  // call stubbed Gemini transcribe
  const result = await transcribeChunk(out, { sessionId, seq, meta });

  await prisma.transcriptSegment.updateMany({
    where: { sessionId, seq },
    data: { text: result.text, speaker: result.speaker ?? null, isFinal: true },
  });

  if (io) {
    io.of("/record").to(sessionId).emit("transcriptSegment", {
      sessionId,
      seq,
      text: result.text,
      speaker: result.speaker,
      isFinal: true,
    });
  }

  // Archive original file
  try {
    const archiveDir = path.join(process.cwd(), "data", "archive", sessionId);
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.renameSync(filename, path.join(archiveDir, path.basename(filename)));
    // remove wav
    fs.unlinkSync(out);
  } catch (err) {
    log.warn({ err }, "archive failed");
  }
}

async function handleFinalize(job: any, io?: any) {
  const { sessionId } = job.payload;
  log.info({ sessionId }, "finalizing");

  const segments = await prisma.transcriptSegment.findMany({ where: { sessionId }, orderBy: { seq: "asc" } });
  const fullText = segments.map((s: any) => s.text).join("\n");

  const summary = await summarizeTranscript(fullText, { sessionId });

  await prisma.recordingSession.update({ where: { id: sessionId }, data: { summary, state: "completed", stoppedAt: new Date() } });

  if (io) io.of("/record").to(sessionId).emit("completed", { sessionId, summary });
}

function transcodeToWav(inFile: string, outFile: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inFile)
      .audioChannels(1)
      .audioFrequency(16000)
      .toFormat("wav")
      .save(outFile)
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function hasEnoughFreeSpace(minBytes: number) {
  // Simple safe default: assume dev machine has enough space.
  // For production, implement disk-space checks (check-disk-space lib).
  return true;
}
