"use client"

import { Mic, Square, Pause, Play, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AudioVisualizer } from "./audio-visualizer"

interface RecordingControlsProps {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  onStart: (source: "mic" | "tab") => void
  onStop: () => void
  onPause: () => void
  onResume: () => void
}

export function RecordingControls({
  isRecording,
  isPaused,
  duration,
  audioLevel,
  onStart,
  onStop,
  onPause,
  onResume,
}: RecordingControlsProps) {
  // Helper to format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!isRecording) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Start Recording</h3>
        <div className="flex gap-4">
          <Button size="lg" className="h-16 w-40 gap-2 text-lg" onClick={() => onStart("mic")}>
            <Mic className="h-6 w-6" />
            Microphone
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 w-40 gap-2 text-lg bg-transparent"
            onClick={() => onStart("tab")}
          >
            <Monitor className="h-6 w-6" />
            Share Tab
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Choose an audio source to begin transcription</p>
      </div>
    )
  }

  return (
    <div className="sticky bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Duration</span>
            <span className="font-mono text-xl font-bold tabular-nums">{formatTime(duration)}</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${isPaused ? "bg-yellow-500" : "animate-pulse bg-red-500"}`} />
            <span className="text-sm font-medium">{isPaused ? "Paused" : "Recording"}</span>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center px-8 md:flex">
          <AudioVisualizer audioLevel={audioLevel} isRecording={!isPaused} />
        </div>

        <div className="flex items-center gap-2">
          {isPaused ? (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-primary text-primary hover:bg-primary/10 bg-transparent"
              onClick={onResume}
            >
              <Play className="h-5 w-5 fill-current" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full hover:bg-muted bg-transparent"
              onClick={onPause}
            >
              <Pause className="h-5 w-5 fill-current" />
            </Button>
          )}

          <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={onStop}>
            <Square className="h-5 w-5 fill-current" />
          </Button>
        </div>
      </div>
    </div>
  )
}
