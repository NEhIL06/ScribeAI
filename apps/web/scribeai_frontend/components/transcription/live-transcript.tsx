"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { TranscriptSegment } from "@/lib/types"

interface LiveTranscriptProps {
  segments: TranscriptSegment[]
  isRecording: boolean
}

export function LiveTranscript({ segments, isRecording }: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [segments])

  if (segments.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="mb-4 rounded-full bg-muted p-4">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted-foreground/20" />
        </div>
        <h3 className="text-lg font-medium">Ready to transcribe</h3>
        <p className="max-w-sm text-sm">Start recording to see the live transcription appear here in real-time.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full pr-4" ref={scrollRef}>
      <div className="flex flex-col gap-4 pb-4">
        {segments.map((segment) => (
          <div
            key={`${segment.sessionId}-${segment.seq}`}
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-4 transition-colors",
              segment.isFinal ? "bg-card" : "bg-muted/50",
            )}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-primary">{segment.speaker || "Speaker"}</span>
              <span>{new Date(segment.startMs).toISOString().substr(14, 5)}</span>
            </div>
            <p className={cn("text-sm leading-relaxed", !segment.isFinal && "italic text-muted-foreground")}>
              {segment.text}
            </p>
          </div>
        ))}

        {isRecording && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            Listening...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
