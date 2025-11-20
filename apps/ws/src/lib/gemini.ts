/**
 * Replace these stubs with real calls to Google Gemini streaming/REST API.
 * transcribeChunk(wavPath, opts) => { text, speaker }
 * summarizeTranscript(fullText, opts) => string
 */

import pino from "pino";
const log = pino();

export async function transcribeChunk(wavPath: string, opts: any) {
  log.info({ wavPath, opts }, "transcribeChunk stub");
  // TODO: call Gemini. Return a sensible structure
  const fake = `[transcript ${opts.sessionId}:${opts.seq}]`;
  return { text: fake, speaker: "Speaker 1" };
}

export async function summarizeTranscript(fullText: string, opts: any) {
  log.info({ len: fullText.length, opts }, "summarizeTranscript stub");
  // TODO: call Gemini summarizer
  return `Summary (auto): ${fullText.slice(0, 300)}...`;
}
