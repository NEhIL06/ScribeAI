import path from "path";
import os from "os";

export const CHUNK_STORE = process.env.CHUNK_STORE || path.join(process.cwd(), "data", "chunks");
export const JOBS_DIR = process.env.JOBS_DIR || path.join(process.cwd(), "data", "jobs");
export const ARCHIVE_DIR = process.env.ARCHIVE_DIR || path.join(process.cwd(), "data", "archive");
export const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || 3); // number of worker threads
export const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);
export const MAX_PENDING_JOBS = Number(process.env.MAX_PENDING_JOBS || 500);
export const MIN_FREE_BYTES = Number(process.env.MIN_FREE_BYTES || 200 * 1024 * 1024); // 200MB free min
export const STALE_RUNNING_MS = Number(process.env.STALE_RUNNING_MS || 1000 * 60 * 10); // 10m
export const TMP_DIR = process.env.TMP_DIR || path.join(os.tmpdir(), "scribeai");
