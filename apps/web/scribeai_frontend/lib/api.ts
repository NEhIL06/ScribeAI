/**
 * HTTP API client for ScribeAI backend
 * Handles session CRUD operations with Zod validation
 */

import { z } from "zod"
import {
  SessionSchema,
  TranscriptSegmentSchema,
  type CreateSessionResponse,
  type ListSessionsResponse,
  type GetSessionResponse,
  type Session, // Declare the Session type here
} from "./types"

const API_URL = "/api"

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit, schema?: z.ZodSchema<T>): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  const data = await response.json()

  if (schema) {
    return schema.parse(data)
  }

  return data as T
}

/**
 * Create a new recording session
 */
export async function createSession(title?: string): Promise<Session> {
  console.log("Fetching session schema...");
  const responseSchema = z.object({ session: SessionSchema })
  console.log("Creating session with title:", title);
  const data = await apiFetch<CreateSessionResponse>(
    "/v1/sessions",
    {
      method: "POST",
      body: JSON.stringify({ title }),
    },
    responseSchema,
  )
  console.log("Created session:", data.session);
  return data.session
}

/**
 * List all sessions for the authenticated user
 */
export async function listSessions(): Promise<Session[]> {
  const responseSchema = z.object({ sessions: z.array(SessionSchema) })
  const data = await apiFetch<ListSessionsResponse>("/v1/sessions", { method: "GET" }, responseSchema)
  return data.sessions
}

/**
 * Get a specific session with its transcript segments
 */
export async function getSession(sessionId: string): Promise<GetSessionResponse["session"]> {
  const responseSchema = z.object({
    session: SessionSchema.extend({
      segments: z.array(TranscriptSegmentSchema),
    }),
  })
  const data = await apiFetch<GetSessionResponse>(`/v1/sessions/${sessionId}`, { method: "GET" }, responseSchema)
  return data.session
}
