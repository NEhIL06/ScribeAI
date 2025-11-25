/**
 * Core data models for ScribeAI application
 * Matches backend API response schemas
 */

import { z } from "zod"

/**
 * Session state enum
 */
export type SessionState = "recording" | "paused" | "processing" | "completed" | "error"

/**
 * Session schema validator
 */
export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  startedAt: z.string(),
  stoppedAt: z.string().nullable(),
  state: z.enum(["recording", "paused", "processing", "completed", "error"]),
  summary: z.string().nullable(),
  transcriptUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Session interface
 */
export type Session = z.infer<typeof SessionSchema>

/**
 * TranscriptSegment schema validator
 */
export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  seq: z.number(),
  startMs: z.number(),
  endMs: z.number(),
  text: z.string(),
  speaker: z.string().nullable(),
  isFinal: z.boolean(),
  createdAt: z.string(),
})

/**
 * TranscriptSegment interface
 */
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>

/**
 * Audio chunk metadata for WebSocket transmission
 */
export interface AudioChunkMeta {
  sessionId: string
  seq: number
  startMs?: number
  durationMs?: number
  mime?: string
}

/**
 * WebSocket event payloads
 */
export interface WSEvents {
  // Client → Server
  joinSession: { sessionId: string }
  audioChunk: { meta: AudioChunkMeta; buffer: ArrayBuffer }
  pause: { sessionId: string }
  resume: { sessionId: string }
  stopSession: { sessionId: string }

  // Server → Client
  joined: { sessionId: string }
  chunkAck: { ok: boolean; sessionId: string; seq: number }
  transcriptSegment: {
    sessionId: string
    seq: number
    text: string
    speaker: string | null
    isFinal: boolean
  }
  paused: { sessionId: string }
  resumed: { sessionId: string }
  processing: { sessionId: string }
  completed: { sessionId: string; summary: string }
}

/**
 * API response types
 */
export interface CreateSessionResponse {
  session: Session
}

export interface ListSessionsResponse {
  sessions: Session[]
}

export interface GetSessionResponse {
  session: Session & { segments: TranscriptSegment[] }
}

/**
 * User authentication state
 */
export interface User {
  id: string
  email: string
  name?: string
  image?: string
  emailVerified: boolean
}
