// lib/gemini.ts
/**
 * Gemini integration helpers for ScribeAI.
 *
 * - transcribeChunk: given a local audio chunk file, return transcript text (+ coarse speaker hint).
 * - summarizeTranscript: given full transcript text, return a structured meeting summary.
 *
 * This uses the official Gemini GenAI SDK:
 * - https://ai.google.dev/gemini-api/docs/audio
 * - https://ai.google.dev/gemini-api/docs/text-generation
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
- Add inline speaker labels like "Speaker 1:", "Speaker 2:" only if there are clearly multiple speakers swapping turns.
`
    : `
- Do NOT output speaker labels (like "Speaker:"). Just output the raw spoken text.
`;

  const langHintInstruction = languageHint
    ? `The primary spoken language is likely: ${languageHint}.\n`
    : "";

  // STRICT ANTI-HALLUCINATION PROMPT
  const prompt = `
      You are a raw, verbatim speech-to-text transcription engine processing a continuous stream of audio. 
      Your output will be stitched together with previous and future chunks.

      **CORE DIRECTIVES:**

      1. **OUTPUT RAW TEXT ONLY:** Do not output timestamps, introductory phrases, or line breaks. Output a single, continuous string of text.
      2. **HANDLE FRAGMENTS:** The audio provided is a 15-second fragment. 
        - Transcribe standard speech normally.
        - If the audio starts mid-sentence, start transcribing exactly where the sound begins. 
        - **EDGE CASE:** If a word is cut off at the very start or very end of the audio, transcribe the audible portion phonetically if possible, or the closest valid word if it's 90% audible.
      3. **NO HALLUCINATIONS (CRITICAL):** - If the audio is silent, contains only typing sounds, or background noise, output an empty string. 
        - **ABSOLUTELY FORBIDDEN:** Do not invent filler words like "I'm going to share my screen", "Can you see my deck?", or "Logging in as user". If you do not hear human speech, write NOTHING.
      4. **VERBATIM ACCURACY:** Transcribe exactly what is said. Include "um", "uh" if audible. Do not paraphrase.

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
      // STRICT ZERO TEMPERATURE to prevent "creativity" during silence
      config: {
        temperature: 0.0, 
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
    You are ScribeAI, an expert executive meeting analyst. Your goal is to distill raw, messy speech-to-text transcripts into structured, high-value intelligence.

    **Analysis Rules:**
    1. **Filter Noise:** Ignore standard meeting setup chatter (e.g., "Can you see my screen?", "You're on mute", "Is everyone here?", "I'm going to share") unless it impacts a decision.
    2. **Fact-Based:** Do NOT invent agenda items or attendees not explicitly heard. If a name is not mentioned, use "Unassigned" or "Team".
    3. **Consolidate:** Group related points together rather than listing them chronologically.
    4. **Distinguish:** Clearly separate *suggestions* from *final decisions*. Only list a "Decision" if the group agreed to it.

    **Formatting Requirements:**
    - Use professional, objective language.
    - Use clean Markdown.
    - Action Items must follow the strict format: **[Owner]**: [Task]
    `.trim();

      const titleLine = title ? `Meeting Context/Title: ${title}\n` : "";
      const contextLine = context ? `Additional Context: ${context}\n` : "";

      const userContent = `
    ${titleLine}${contextLine}
    Below is the RAW transcript stream. It may contain stutters, fragments, or lack speaker labels.

    TRANSCRIPT START
    ${fullText}
    TRANSCRIPT END

    Based on the transcript above, generate a summary using exactly this template:

    ### 1. Executive Overview
    * (3-5 high-level bullets summarizing the core purpose and outcome of the meeting. Focus on the "Why" and the "Result".)

    ### 2. Key Decisions
    * (List explicit agreements made. If none, write "No explicit decisions made".)

    ### 3. Action Items
    * **[Owner Name OR "Unassigned"]**: (Specific task description) - *(Due Date if mentioned)*
    * **[Owner Name OR "Unassigned"]**: (Specific task description) - *(Due Date if mentioned)*

    ### 4. Risks & Open Questions
    * (List unresolved issues or potential blockers mentioned. If none, write "None identified".)
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