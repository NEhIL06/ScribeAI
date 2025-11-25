"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, Mic, Monitor, Zap, FileText, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span>AI-Powered Meeting Transcription</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Turn Meetings Into
            <span className="block text-primary">Actionable Intelligence</span>
          </h1>

          <p className="text-lg text-muted-foreground sm:text-xl">
            Real-time transcription powered by Google Gemini AI. Capture from your mic or browser tabs
            (Google Meet, Zoom), get live transcripts, and automatic summaries with action items.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => router.push("/signup")} className="gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push("/login")}>
              Sign In
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required • Free forever for basic use
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-center text-3xl font-bold mb-12">Why ScribeAI?</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Dual Audio Sources</h3>
              <p className="text-sm text-muted-foreground">
                Record directly from microphone or capture browser tab audio from Google Meet, Zoom, and more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Transcription</h3>
              <p className="text-sm text-muted-foreground">
                See transcripts appear live as you speak with ~2-3 second latency powered by Gemini AI.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Summaries</h3>
              <p className="text-sm text-muted-foreground">
                Automatic extraction of key points, decisions, action items, and risks from your meetings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Pause & Resume</h3>
              <p className="text-sm text-muted-foreground">
                Full session control with pause/resume functionality. Your data is saved incrementally.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Session History</h3>
              <p className="text-sm text-muted-foreground">
                Access past recordings with searchable transcripts. Export as TXT or JSON.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Long Sessions</h3>
              <p className="text-sm text-muted-foreground">
                Architected for 1+ hour meetings with chunked streaming and fault tolerance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to transform your meetings?</h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of professionals who never miss important details
          </p>
          <Button size="lg" onClick={() => router.push("/signup")} className="gap-2">
            Start Recording Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with Next.js, TypeScript, and Google Gemini AI</p>
          <p className="mt-2">© {new Date().getFullYear()} ScribeAI. Open source under MIT License.</p>
        </div>
      </footer>
    </div>
  )
}
