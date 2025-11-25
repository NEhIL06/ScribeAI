/**
 * WebSocket client wrapper for real-time audio streaming and transcription
 * Uses Socket.io client to connect to backend /ws/record namespace
 */

import { io, type Socket } from "socket.io-client"
import type { WSEvents, AudioChunkMeta } from "./types"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4001"

/**
 * Socket.io client instance (singleton)
 */
let socket: Socket | null = null

/**
 * Get or create Socket.io connection
 */
export function getSocket(token?: string): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/record`, {
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })
  }
  return socket
}

/**
 * Disconnect and cleanup socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * Join a recording session
 */
export function joinSession(sessionId: string): void {
  const sock = getSocket()
  console.log("Audio recorder joining session sent:", sessionId)
  sock.emit("joinSession", { sessionId })
}

/**
 * Send audio chunk to server
 */
export function sendAudioChunk(meta: AudioChunkMeta, buffer: ArrayBuffer): void {
  const sock = getSocket()
  sock.emit("audioChunk", meta, buffer)
}

/**
 * Pause the current session
 */
export function pauseSession(sessionId: string): void {
  const sock = getSocket()
  sock.emit("pause", { sessionId })
}

/**
 * Resume the current session
 */
export function resumeSession(sessionId: string): void {
  const sock = getSocket()
  sock.emit("resume", { sessionId })
}

/**
 * Stop the current session
 */
export function stopSession(sessionId: string): void {
  const sock = getSocket()
  sock.emit("stopSession", { sessionId })
}

/**
 * Type-safe event listener helper
 */
export function onSocketEvent<K extends keyof WSEvents>(event: K, handler: (data: WSEvents[K]) => void): () => void {
  const sock = getSocket()
  sock.on(event as string, handler as any)

  // Return cleanup function
  return () => {
    sock.off(event as string, handler as any)
  }
}
