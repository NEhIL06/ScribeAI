"use client"

import { cn } from "@/lib/utils"

import { useEffect, use } from "react"
import { useMachine } from "@xstate/react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sessionMachine } from "@/machines/session-machine"
import { LiveTranscript } from "@/components/transcription/live-transcript"
import { RecordingControls } from "@/components/recording/recording-controls"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { getSession } from "@/lib/api"
import { getSocket, joinSession, onSocketEvent, pauseSession, resumeSession, stopSession } from "@/lib/socket"
import { useToast } from "@/hooks/use-toast"
import { authClient } from "@/lib/auth-client"

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  // Get Better Auth session to retrieve token
  const { data: authSession } = authClient.useSession()

  const { data: initialSession, isLoading } = useSWR(`session-${id}`, () => getSession(id))

  const [state, send] = useMachine(sessionMachine)
  const recorder = useAudioRecorder()

  // Initialize session
  useEffect(() => {
    if (initialSession) {
      send({
        type: "JOIN",
        sessionId: initialSession.id,
        initialSegments: initialSession.segments,
      })

      // If session is already completed, redirect to summary
      if (initialSession.state === "completed") {
        router.replace(`/session/${id}/summary`)
      }
    }
  }, [initialSession, send, id, router])

  // Socket event listeners - initialize socket with auth token
  useEffect(() => {
    console.log("📡 Setting up socket event listeners for session:", id)
    console.log("🔑 Auth session available:", !!authSession)
    console.log("🔑 Session token available:", !!authSession?.session?.token)

    // Initialize socket with token from Better Auth session
    if (authSession?.session?.token) {
      const socket = getSocket(authSession.session.token)
      console.log("✅ Socket initialized with auth token")
    } else {
      console.warn("⚠️ No auth session token available, initializing socket without token")
      getSocket()
    }

    joinSession(id)

    const cleanups = [
      onSocketEvent("transcriptSegment", (data) => {
        console.log("📡 Received transcriptSegment:", data);
        send({
          type: "NEW_SEGMENT",
          segment: {
            ...data,
            id: `${data.sessionId}-${data.seq}`,
            startMs: 0,
            endMs: 0,
            createdAt: new Date().toISOString(),
          },
        })
      }),
      onSocketEvent("processing", () => {
        console.log("⏳ Received processing event");
        send({ type: "PROCESSING_STARTED" })
      }),
      onSocketEvent("completed", ({ summary }) => {
        console.log("✅ Received completed event with summary:", summary?.substring(0, 100));
        send({ type: "COMPLETED", summary })
        router.push(`/session/${id}/summary`)
      }),
    ]

    return () => {
      console.log("🧹 Cleaning up socket event listeners")
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [id, send, router, authSession])

  const handleStart = async (source: "mic" | "tab") => {
    try {
      await recorder.startRecording(id, source)
      send({ type: "START_RECORDING" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start recording. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const handleStop = () => {
    recorder.stopRecording()
    stopSession(id)
    send({ type: "STOP" })
  }

  const handlePause = () => {
    recorder.pauseRecording()
    pauseSession(id)
    send({ type: "PAUSE" })
  }

  const handleResume = () => {
    recorder.resumeRecording()
    resumeSession(id)
    send({ type: "RESUME" })
  }

  if (isLoading || !initialSession) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{initialSession.title || "Untitled Session"}</h1>
            <p className="text-xs text-muted-foreground">
              {state.matches("recording") ? "Recording in progress..." : "Ready to record"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              state.matches("recording") ? "animate-pulse bg-red-500" : "bg-muted-foreground",
            )}
          />
          <span className="text-sm font-medium capitalize">{state.value.toString()}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-muted/10 p-6">
        <div className="mx-auto h-full max-w-3xl rounded-xl border bg-background shadow-sm">
          <LiveTranscript segments={state.context.segments} isRecording={state.matches("recording")} />
        </div>
      </div>

      {/* Controls */}
      <RecordingControls
        isRecording={state.matches("recording") || state.matches("paused")}
        isPaused={state.matches("paused")}
        duration={recorder.duration}
        audioLevel={recorder.audioLevel}
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
        onResume={handleResume}
      />
    </div>
  )
}
