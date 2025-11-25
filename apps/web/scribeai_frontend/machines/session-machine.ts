import { setup, assign } from "xstate"
import type { TranscriptSegment } from "@/lib/types"

export type SessionContext = {
  sessionId: string | null
  segments: TranscriptSegment[]
  error: string | null
  summary: string | null
}

export type SessionEvent =
  | { type: "JOIN"; sessionId: string; initialSegments: TranscriptSegment[] }
  | { type: "START_RECORDING" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "NEW_SEGMENT"; segment: TranscriptSegment }
  | { type: "PROCESSING_STARTED" }
  | { type: "COMPLETED"; summary: string }
  | { type: "ERROR"; message: string }
  | { type: "RETRY" }

export const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events: {} as SessionEvent,
  },
  actions: {
    setSession: assign({
      sessionId: ({ event }) => (event.type === "JOIN" ? event.sessionId : null),
      segments: ({ event }) => (event.type === "JOIN" ? event.initialSegments : []),
    }),
    addSegment: assign({
      segments: ({ context, event }) => {
        if (event.type !== "NEW_SEGMENT") return context.segments

        console.log("📝 Adding segment to state:", event.segment.seq, event.segment.text?.substring(0, 50));

        // If segment exists (by seq), update it. Otherwise append.
        const existingIndex = context.segments.findIndex((s) => s.seq === event.segment.seq)
        if (existingIndex >= 0) {
          const newSegments = [...context.segments]
          newSegments[existingIndex] = event.segment
          console.log("♻️ Updated existing segment", event.segment.seq);
          return newSegments
        }
        console.log("➕ Added new segment, total:", context.segments.length + 1);
        return [...context.segments, event.segment].sort((a, b) => a.seq - b.seq)
      },
    }),
    setSummary: assign({
      summary: ({ event }) => (event.type === "COMPLETED" ? event.summary : null),
    }),
    setError: assign({
      error: ({ event }) => (event.type === "ERROR" ? event.message : null),
    }),
  },
}).createMachine({
  id: "session",
  initial: "idle",
  context: {
    sessionId: null,
    segments: [],
    error: null,
    summary: null,
  },
  states: {
    idle: {
      on: {
        JOIN: {
          target: "ready",
          actions: "setSession",
        },
      },
    },
    ready: {
      on: {
        START_RECORDING: "recording",
        NEW_SEGMENT: {
          actions: "addSegment",
        },
        COMPLETED: {
          target: "completed",
          actions: "setSummary",
        },
      },
    },
    recording: {
      on: {
        PAUSE: "paused",
        STOP: "processing",
        NEW_SEGMENT: {
          actions: "addSegment",
        },
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },
    paused: {
      on: {
        RESUME: "recording",
        STOP: "processing",
        NEW_SEGMENT: {
          actions: "addSegment",
        },
      },
    },
    processing: {
      on: {
        COMPLETED: {
          target: "completed",
          actions: "setSummary",
        },
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },
    completed: {
      type: "final",
    },
    error: {
      on: {
        RETRY: "ready",
      },
    },
  },
})
