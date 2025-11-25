import { pickJob, completeJob, failJob, recoverStaleRunning } from "../queue/diskQueue";
import { MAX_CONCURRENCY, MAX_PENDING_JOBS, MIN_FREE_BYTES } from "../config";
import pino from "pino";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import os from "os";
import fs from "fs";
import path from "path";
import { transcribeChunk, summarizeTranscript } from "../lib/gemini";
import prisma from "../prisma/client";

ffmpeg.setFfmpegPath(ffmpegPath as string);
const log = pino();

let active = 0;
let stopFlag = false;
let ioRef: any = null;

export function setIo(io: any) { ioRef = io; }
export function setIoServer(io: any) { ioRef = io; }

export function startProcessor(io?: any) {
  console.log("🚀 PROCESSOR STARTED");
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

      console.log("📦 Picked job:", job.type, job.payload);
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
  console.log(`🎙️  Processing chunk ${seq} for session ${sessionId}`);
  log.info({ sessionId, seq }, "processing chunk");

  // Gemini supports WebM directly - no need to transcode!
  // This avoids issues with fragmented WebM chunks that FFmpeg can't read
  try {
    // Verify file exists and has content before processing
    const stats = await fs.promises.stat(filename);
    if (stats.size === 0) {
      throw new Error(`Empty chunk file: ${filename}`);
    }

    log.info({ sessionId, seq, size: stats.size }, "Chunk file verified, transcribing with Gemini");

    // Call Gemini transcribe directly with WebM file
    const result = await transcribeChunk(filename, { sessionId, seq });

    await prisma.transcriptSegment.updateMany({
      where: { sessionId, seq },
      data: { text: result.text, speaker: result.speaker ?? null, isFinal: true },
    });

    if (io) {
      console.log(`📡 Emitting transcriptSegment for seq ${seq}:`, result.text.substring(0, 50));
      io.of("/record").to(sessionId).emit("transcriptSegment", {
        sessionId,
        seq,
        text: result.text,
        speaker: result.speaker,
        isFinal: true,
      });
    } else {
      console.warn("⚠️  No io instance - cannot emit transcriptSegment");
    }

    // Archive original file
    try {
      const archiveDir = path.join(process.cwd(), "data", "archive", sessionId);
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(filename, path.join(archiveDir, path.basename(filename)));
    } catch (err) {
      log.warn({ err }, "archive failed");
    }
  } catch (err: any) {
    log.error({ sessionId, seq, err: err.message }, "Failed to process chunk");
    throw err;
  }
}

async function handleFinalize(job: any, io?: any) {
  const { sessionId } = job.payload;
  console.log(`✅ Finalizing session ${sessionId}`);
  log.info({ sessionId }, "finalizing");

  try {
    const segments = await prisma.transcriptSegment.findMany({ where: { sessionId }, orderBy: { seq: "asc" } });
    const fullText = segments.map((s: any) => s.text).join("\n");

    const summary = await summarizeTranscript(fullText, { sessionId });

    await prisma.recordingSession.update({ where: { id: sessionId }, data: { summary, state: "completed", stoppedAt: new Date() } });

    console.log(`📡 Emitting completed event with summary (${summary.length} chars)`);
    if (io) io.of("/record").to(sessionId).emit("completed", { sessionId, summary });
  } catch (error) {
    log.error({ sessionId, err: error }, "Failed to finalize session");
    await prisma.recordingSession.update({
      where: { id: sessionId },
      data: { state: "error", stoppedAt: new Date() }
    }).catch(e => log.error({ sessionId, err: e }, "Failed to update session state to error"));
  }
}

function transcodeToWav(inFile: string, outFile: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check file exists and is readable
        await fs.promises.access(inFile, fs.constants.R_OK);

        // Verify file has content
        const stats = await fs.promises.stat(inFile);
        if (stats.size === 0) {
          throw new Error(`Input file is empty: ${inFile}`);
        }

        // Attempt FFmpeg transcoding
        await new Promise<void>((res, rej) => {
          ffmpeg(inFile)
            .audioChannels(1)
            .audioFrequency(16000)
            .toFormat("wav")
            .save(outFile)
            .on("end", () => res())
            .on("error", (err) => rej(err));
        });

        // Success!
        return resolve();

      } catch (err: any) {
        const isLastAttempt = attempt === maxRetries - 1;

        if (isLastAttempt) {
          log.error({ inFile, attempt, err: err.message }, "FFmpeg transcode failed after retries");
          return reject(new Error(`ffmpeg exited with code ${err.code || 'unknown'}: ${err.message}`));
        }

        // Wait before retry with exponential backoff
        const backoffMs = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
        log.warn({ inFile, attempt, backoffMs, err: err.message }, "FFmpeg attempt failed, retrying...");
        await sleep(backoffMs);
      }
    }
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
