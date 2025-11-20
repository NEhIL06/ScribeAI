import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { JOBS_DIR, ARCHIVE_DIR } from "../config";
import pino from "pino";

const log = pino();

type Job = {
  id: string;
  type: "chunk" | "finalize";
  createdAt: number;
  attempts: number;
  nextAttemptAt?: number;
  payload: any;
  __runningFile?: string;
};

function ensureDir(d: string) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
ensureDir(JOBS_DIR);
ensureDir(ARCHIVE_DIR);

export function enqueueJob(type: Job["type"], payload: any): Job {
  const id = uuidv4();
  const job: Job = { id, type, createdAt: Date.now(), attempts: 0, payload };
  const filename = path.join(JOBS_DIR, `${id}.json`);
  fs.writeFileSync(filename, JSON.stringify(job));
  log.debug({ jobId: id, type }, "enqueued job");
  return job;
}

export function pickJob(): Job | null {
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith(".json"));
  for (const f of files) {
    const full = path.join(JOBS_DIR, f);
    try {
      const raw = fs.readFileSync(full, "utf-8");
      const job: Job = JSON.parse(raw);
      if (job.nextAttemptAt && Date.now() < job.nextAttemptAt) continue;
      const runningName = full.replace(/\.json$/, ".running");
      try {
        fs.renameSync(full, runningName);
      } catch {
        continue;
      }
      job.__runningFile = runningName;
      return job;
    } catch (err) {
      try { fs.unlinkSync(full); } catch {}
    }
  }
  return null;
}

export function completeJob(job: Job) {
  const runningFile = job.__runningFile;
  if (runningFile && fs.existsSync(runningFile)) {
    fs.unlinkSync(runningFile);
  }
  try {
    const arch = path.join(ARCHIVE_DIR, `${job.id}.done.json`);
    fs.writeFileSync(arch, JSON.stringify({ ...job, completedAt: Date.now() }, null, 2));
  } catch (err) {
    log.warn({ err }, "archive fail");
  }
}

export function failJob(job: Job, errMessage: string) {
  const runningFile = job.__runningFile;
  if (!runningFile) {
    log.warn({ jobId: job.id }, "failJob called without running file");
    return;
  }
  try {
    const raw = fs.readFileSync(runningFile, "utf-8");
    const j: Job = JSON.parse(raw);
    j.attempts = (j.attempts || 0) + 1;
    j.nextAttemptAt = Date.now() + backoffMs(j.attempts);
    const newName = runningFile.replace(/\.running$/, ".json");
    fs.writeFileSync(newName, JSON.stringify(j));
    fs.unlinkSync(runningFile);
    log.warn({ jobId: j.id, attempts: j.attempts, err: errMessage }, "job failed, requeued/backoff");
  } catch (err) {
    log.error({ err }, "failJob error");
  }
}

function backoffMs(attempts: number) {
  const base = 5000;
  return Math.min(1000 * 60 * 15, base * Math.pow(2, attempts));
}

export function recoverStaleRunning() {
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith(".running"));
  for (const f of files) {
    const full = path.join(JOBS_DIR, f);
    try {
      const stat = fs.statSync(full);
      const age = Date.now() - stat.mtimeMs;
      const STALE_MS = Number(process.env.STALE_RUNNING_MS || 1000 * 60 * 10);
      if (age > STALE_MS) {
        fs.renameSync(full, full.replace(/\.running$/, ".json"));
        log.info({ file: full }, "requeued stale running job");
      }
    } catch (err) {
      log.warn({ err }, "recoverStaleRunning error");
    }
  }
}

export function pendingJobsCount() {
  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith(".json"));
  return files.length;
}
