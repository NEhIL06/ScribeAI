"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { formatDistanceToNow } from "date-fns"
import { ArrowLeft, Download, FileText, Share2, Clock, Calendar, CheckCircle2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSession } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function SessionSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const { data: session, isLoading } = useSWR(`session-${id}`, () => getSession(id))

  const handleExport = (format: "txt" | "json") => {
    if (!session) return

    let content = ""
    let mimeType = ""
    let extension = ""

    if (format === "json") {
      content = JSON.stringify(session, null, 2)
      mimeType = "application/json"
      extension = "json"
    } else {
      content = `Session: ${session.title}\nDate: ${new Date(session.startedAt).toLocaleString()}\n\nSummary:\n${session.summary || "No summary available."}\n\nTranscript:\n\n`
      content += session.segments
        .map((s) => `[${new Date(s.startMs).toISOString().substr(11, 8)}] ${s.speaker || "Speaker"}: ${s.text}`)
        .join("\n")
      mimeType = "text/plain"
      extension = "txt"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `session-${session.id}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Exported",
      description: `Session exported as ${extension.toUpperCase()}`,
    })
  }

  const handleCopySummary = () => {
    if (session?.summary) {
      navigator.clipboard.writeText(session.summary)
      toast({
        title: "Copied",
        description: "Summary copied to clipboard",
      })
    }
  }

  if (isLoading || !session) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-8 px-4">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{session.title || "Untitled Session"}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(session.startedAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {session.stoppedAt ? (
                  <span>
                    {Math.round(
                      (new Date(session.stoppedAt).getTime() - new Date(session.startedAt).getTime()) / 60000,
                    )}{" "}
                    min
                  </span>
                ) : (
                  <span>Unknown duration</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport("json")}>
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
          <Button variant="outline" onClick={() => handleExport("txt")}>
            <FileText className="mr-2 h-4 w-4" />
            Text
          </Button>
          <Button>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">AI Summary</TabsTrigger>
              <TabsTrigger value="transcript">Full Transcript</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">Executive Summary</CardTitle>
                  <Button variant="ghost" size="icon" onClick={handleCopySummary}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {session.summary ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed">{session.summary}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <p>No summary generated yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Action Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {/* Placeholder for action items - in real app would come from AI analysis */}
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span>Review project timeline by Friday</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span>Schedule follow-up meeting with design team</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Decisions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-2 pl-4 text-sm">
                      {/* Placeholder for decisions */}
                      <li>Approved Q3 marketing budget</li>
                      <li>Selected React Native for mobile app</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transcript" className="mt-6">
              <Card className="h-[600px]">
                <ScrollArea className="h-full p-6">
                  <div className="space-y-6">
                    {session.segments.map((segment) => (
                      <div key={segment.id} className="flex gap-4">
                        <div className="min-w-[60px] text-xs text-muted-foreground">
                          {new Date(segment.startMs).toISOString().substr(14, 5)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="text-xs font-medium text-primary">{segment.speaker || "Speaker"}</div>
                          <p className="text-sm leading-relaxed">{segment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{session.state}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Segments</span>
                <span>{session.segments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Participants</span>
                <span>{new Set(session.segments.map((s) => s.speaker)).size || 1}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This session had high engagement with clear action items identified. The sentiment was generally
                positive.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
