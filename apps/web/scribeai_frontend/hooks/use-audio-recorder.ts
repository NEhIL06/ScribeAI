"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { sendAudioChunk } from "@/lib/socket"

interface RecorderState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  sourceType: "mic" | "tab" | null
}

interface UseAudioRecorderReturn extends RecorderState {
  startRecording: (sessionId: string, source?: "mic" | "tab") => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
}

const CHUNK_DURATION_MS = 1000 // Send every second

function detectSupportedMime() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/wav"
  ]
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ""
}

export function useAudioRecorder(): UseAudioRecorderReturn {

  // ---------------------- STATE ----------------------
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    sourceType: null
  })

  // ---------------------- INTERNALS ----------------------
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  const sessionIdRef = useRef<string | null>(null)
  const sequenceRef = useRef(0)
  const startTimeRef = useRef(0)
  const pauseTimestampRef = useRef(0)
  const sliceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)


  // ---------------------- AUDIO LEVEL DISPLAY LOOP ----------------------
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !state.isRecording || state.isPaused) return

    const buffer = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(buffer)
    const volume = buffer.reduce((a, b) => a + b, 0) / buffer.length

    setState(prev => ({ ...prev, audioLevel: volume }))

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [state.isRecording, state.isPaused])


  useEffect(() => {
    if (state.isRecording && !state.isPaused) updateAudioLevel()
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [state.isRecording, state.isPaused, updateAudioLevel])


  // ---------------------- TIMER ----------------------
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (state.isRecording && !state.isPaused) {
      timer = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
    }
    return () => timer && clearInterval(timer)
  }, [state.isRecording, state.isPaused])


  // ---------------------- START RECORDING ----------------------
  const startRecording = async (sessionId: string, source: "mic" | "tab" = "mic") => {
    try {
      sessionIdRef.current = sessionId
      sequenceRef.current = 0
      setState(prev => ({ ...prev, duration: 0, sourceType: source }))

      let stream: MediaStream

      if (source === "tab") {
        console.warn("▶ Requesting TAB audio — ensure user checks 'Share Audio'...")
        // @ts-ignore - Chrome typing issue
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true // Required for system/tab audio
        })

        displayStreamRef.current = display

        const audioTracks = display.getAudioTracks()
        if (!audioTracks.length) {
          throw new Error("❌ NO AUDIO detected from selected tab — user likely didn't tick 'Share Audio'")
        }

        const videoTrack = display.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.addEventListener("ended", () => {
            console.warn("🛑 Tab recording ended by user")
            stopRecording()
          })
        }

        stream = new MediaStream(audioTracks)
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        })
      }

      streamRef.current = stream

      // ---------------------- AUDIO NORMALIZATION ----------------------

      const ctx = new AudioContext()
      if (ctx.state === "suspended") await ctx.resume()

      const analyser = ctx.createAnalyser()
      const sourceNode = ctx.createMediaStreamSource(stream)
      const gainNode = ctx.createGain()

      gainNode.gain.value = 2.0 // Increase quiet Meet/Zoom streams

      sourceNode.connect(gainNode)
      gainNode.connect(analyser)

      audioContextRef.current = ctx
      analyserRef.current = analyser
      gainNodeRef.current = gainNode

      // ---------------------- MEDIA RECORDER ----------------------
      const mime = detectSupportedMime()
      console.log("🎤 Using MIME:", mime)

      const mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)

      mediaRecorder.ondataavailable = async e => {
        if (e.data.size === 0 || !sessionIdRef.current) return
        const buffer = await e.data.arrayBuffer()

        sendAudioChunk(
          {
            sessionId,
            seq: sequenceRef.current++,
            mime: mediaRecorder.mimeType || mime,
            startMs: Date.now() - startTimeRef.current,
            durationMs: CHUNK_DURATION_MS,
          },
          buffer
        )
      }

      try {
        mediaRecorder.start(CHUNK_DURATION_MS)
      } catch {
        console.warn("⚠ Fallback: manual chunk slicing")
        mediaRecorder.start()
        sliceIntervalRef.current = setInterval(() => {
          if (mediaRecorder.state === "recording") mediaRecorder.requestData()
        }, CHUNK_DURATION_MS)
      }

      mediaRecorderRef.current = mediaRecorder
      startTimeRef.current = Date.now()

      setState(prev => ({ ...prev, isRecording: true, isPaused: false }))
    } catch (err) {
      console.error("Recording failed:", err)
      throw err
    }
  }


  // ---------------------- STOP ----------------------
  const stopRecording = useCallback(() => {
    console.log("🛑 stopRecording() called")

    mediaRecorderRef.current?.stop()
    sliceIntervalRef.current && clearInterval(sliceIntervalRef.current)

    streamRef.current?.getTracks().forEach(t => t.stop())
    displayStreamRef.current?.getTracks().forEach(t => t.stop())

    audioContextRef.current?.close()

    setState(prev => ({ ...prev, isRecording: false, isPaused: false, sourceType: null }))
    sessionIdRef.current = null
  }, [])


  // ---------------------- PAUSE / RESUME ----------------------
  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      pauseTimestampRef.current = Date.now()
      mediaRecorderRef.current.pause()
      setState(prev => ({ ...prev, isPaused: true }))
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume()
      startTimeRef.current += Date.now() - pauseTimestampRef.current
      setState(prev => ({ ...prev, isPaused: false }))
    }
  }


  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  }
}
