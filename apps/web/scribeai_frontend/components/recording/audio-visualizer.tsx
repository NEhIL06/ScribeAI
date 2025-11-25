"use client"

import { useEffect, useRef } from "react"

interface AudioVisualizerProps {
  audioLevel: number
  isRecording: boolean
}

export function AudioVisualizer({ audioLevel, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<number[]>(new Array(50).fill(0))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Update history
    historyRef.current.push(audioLevel)
    historyRef.current.shift()

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw bars
    const barWidth = canvas.width / historyRef.current.length
    const centerY = canvas.height / 2

    historyRef.current.forEach((level, index) => {
      const height = (level / 255) * canvas.height
      const x = index * barWidth

      // Create gradient
      const gradient = ctx.createLinearGradient(0, centerY - height / 2, 0, centerY + height / 2)
      gradient.addColorStop(0, isRecording ? "#3b82f6" : "#9ca3af")
      gradient.addColorStop(1, isRecording ? "#60a5fa" : "#d1d5db")

      ctx.fillStyle = gradient

      // Draw rounded rect for each bar
      ctx.beginPath()
      ctx.roundRect(
        x + 1,
        centerY - height / 2,
        barWidth - 2,
        Math.max(height, 2), // Minimum height so it's visible
        2,
      )
      ctx.fill()
    })
  }, [audioLevel, isRecording])

  return <canvas ref={canvasRef} width={300} height={60} className="h-[60px] w-full max-w-[300px]" />
}
