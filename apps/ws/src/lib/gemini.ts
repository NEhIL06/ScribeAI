// lib/gemini.ts
/**
 * Gemini integration helpers for ScribeAI.
 *
 * - transcribeChunk: given a local audio chunk file, return transcript text (+ coarse speaker hint).
 * - summarizeTranscript: given full transcript text, return a structured meeting summary.
 *
 * This uses the official Gemini GenAI SDK:
 *   - https://ai.google.dev/gemini-api/docs/audio
 *   - https://ai.google.dev/gemini-api/docs/text-generation
 */

import fs from "node:fs/promises";
import path from "node:path";
import pino from "pino";
import {
  GoogleGenAI,
  type GenerateContentResponse,
} from "@google/genai";

const log = pino({ name: "gemini" });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  // Fail fast so you notice mis-config early
  log.warn(
    "GEMINI_API_KEY is not set. Gemini calls will fail until you configure it.",
  );
}

// One model for both transcription + summary is fine for the assignment.
const TRANSCRIBE_MODEL =
  process.env.GEMINI_TRANSCRIBE_MODEL ?? "gemini-2.5-flash";
const SUMMARY_MODEL =
  process.env.GEMINI_SUMMARY_MODEL ?? "gemini-2.5-flash";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

// ---------- Types ----------

export interface TranscribeChunkOpts {
  sessionId: string;
  seq: number; // chunk index, starting at 0 or 1
  /**
   * Optional hint like "en-IN" or "en-US".
   * Gemini will try to auto-detect anyway, but hints can help.
   */
  languageHint?: string;
  /**
   * Whether to explicitly ask for diarization-ish output.
   * We'll still return a plain string, but with "Speaker X:" style labels.
   */
  diarization?: boolean;
}

export interface TranscribeChunkResult {
  text: string;
  /**
   * Very coarse "dominant speaker" guess for this chunk.
   * In many UIs you’ll ignore this and just show `text`.
   */
  speaker: string | null;
}

export interface SummarizeTranscriptOpts {
  title?: string;
  /**
   * Optional extra metadata to include in the instruction
   * (e.g. attendees, date/time, meeting type).
   */
  context?: string;
  sessionId?: string;
}

// ---------- Helpers ----------

function guessMimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".wav":
      return "audio/wav";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".webm":
      return "audio/webm";
    case ".ogg":
    case ".oga":
      return "audio/ogg";
    default:
      // Gemini is pretty forgiving, but it's still good to set *something*.
      return "audio/wav";
  }
}

/**
 * Extract a coarse "Speaker N" label if the model prefixes lines like:
 * "Speaker 1: Hello..."
 *
 * Super naive on purpose; safe default is just `null`.
 */
function extractDominantSpeakerLabel(text: string): string | null | undefined {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const match = firstLine.match(/^(Speaker\s+\d+)\s*[:\-]/i);
  return match ? match[1] : null;
}

function getSafeText(res: GenerateContentResponse): string {
  // For Node GenAI SDK, `response.text` is the concatenated text
  return (res.text ?? "").trim();
}

// ---------- Public API ----------

/**
 * Transcribe a single 20–40s audio chunk from disk via Gemini.
 *
 * This is called by your recording worker / queue for each chunk,
 * so keep it stateless and idempotent.
 */
export async function transcribeChunk(
  wavPath: string,
  opts: TranscribeChunkOpts,
): Promise<TranscribeChunkResult> {
  const { sessionId, seq, languageHint, diarization } = opts;

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  log.info(
    { wavPath, sessionId, seq, languageHint, diarization },
    "Transcribing chunk with Gemini",
  );

  // Read audio file as base64 for inlineData.
  const base64Audio = await fs.readFile(wavPath, {
    encoding: "base64",
  });

  const mimeType = guessMimeFromPath(wavPath);

  const diarizationInstruction = diarization
    ? `
- Add inline speaker labels like "Speaker 1:", "Speaker 2:" if there are multiple speakers.
- Keep labels consistent across chunks as much as possible.
`
    : `
- Do NOT hallucinate speaker labels unless clearly obvious from the audio.
`;

  const langHintInstruction = languageHint
    ? `The primary spoken language is likely: ${languageHint}.\n`
    : "";

  const prompt = `
You are an automatic meeting transcription engine for a tool called ScribeAI.

Task:
- Transcribe this *single* audio chunk from a longer meeting.
- Return only the raw transcript text for THIS CHUNK.
- No explanations, no metadata, no JSON.

Formatting:
- Use short lines separated by newlines between utterances.
- Do not add timestamps.
${diarizationInstruction}

Context:
- sessionId: ${sessionId}
- chunkIndex: ${seq}
${langHintInstruction}
`.trim();

  const contents = [
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: TRANSCRIBE_MODEL,
      contents,
      // Slightly low temperature so it behaves deterministically
      config: {
        temperature: 0.1,
      },
    });

    const text = getSafeText(response);
    const speaker = extractDominantSpeakerLabel(text)!;

    log.debug(
      {
        sessionId,
        seq,
        chars: text.length,
        speaker,
      },
      "Transcription chunk success",
    );

    return { text, speaker };
  } catch (err) {
    log.error(
      { err, sessionId, seq },
      "Gemini transcription failed for chunk",
    );
    throw err;
  }
}

/**
 * Summarize the *full* meeting transcript.
 *
 * You should call this once when the user hits "Stop" and you've
 * concatenated all transcript segments (in order).
 */
export async function summarizeTranscript(
  fullText: string,
  opts: SummarizeTranscriptOpts = {},
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const { title, context, sessionId } = opts;

  log.info(
    { title, sessionId, chars: fullText.length },
    "Summarizing transcript with Gemini",
  );

  const systemInstruction = `
You are ScribeAI, an expert AI meeting assistant.

Given the raw transcript of a meeting, you must produce:
- A concise summary (3–6 bullet points) of key topics.
- Explicit decisions made.
- Action items with owners if mentioned.
- Optional risks / open questions.

Constraints:
- Do NOT invent facts or attendees that are not clearly in the transcript.
- If something is unclear, say "Not specified" rather than guessing.
- Use clear, compact bullet points.
`.trim();

  const titleLine = title ? `Meeting title: ${title}\n` : "";
  const contextLine = context ? `Extra context: ${context}\n` : "";

  const userContent = `
${titleLine}${contextLine}
Below is the FULL raw transcript of the meeting.

TRANSCRIPT START
${fullText}
TRANSCRIPT END

Now produce:

1. **Overview** – 3–6 bullets.
2. **Key Decisions** – bullets with short descriptions.
3. **Action Items** – bullets with \`Owner - Task - (Optional Due Date)\`.
4. **Open Questions / Risks** – if any.
`.trim();

  try {
    const response = await ai.models.generateContent({
      model: SUMMARY_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: userContent }],
        },
      ],
      config: {
        // Summaries can be a bit more "creative" but still grounded
        temperature: 0.4,
        systemInstruction,
      },
    });

    const summary = getSafeText(response);

    log.debug(
      { title, summaryChars: summary.length },
      "Summary generated",
    );

    return summary;
  } catch (err) {
    log.error({ err }, "Gemini summarization failed");
    throw err;
  }
}
