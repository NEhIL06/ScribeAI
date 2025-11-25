"use client"

import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Plus, Loader2, FileText, Mic, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SessionCard } from "@/components/sessions/session-card"
import { listSessions, createSession } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

/**
 * Dashboard page - displays list of user sessions
 * Protected route requiring authentication
 */
export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [source, setSource] = useState<"mic" | "tab">("mic")
  const [title, setTitle] = useState("")

  const { data: sessions, isLoading, mutate } = useSWR("sessions", listSessions)

  const handleCreateSession = async () => {
    setIsCreating(true)
    try {
      const sessionTitle = title.trim() || "New Recording Session"
      const session = await createSession(sessionTitle)
      mutate()
      router.push(`/session/${session.id}?source=${source}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
      setIsDialogOpen(false)
      setTitle("") // Reset title
    }
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
            <p className="text-muted-foreground">Manage and view your recording sessions</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Session</DialogTitle>
                <DialogDescription>
                  Choose how you want to capture audio for this session.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Weekly Sync"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Audio Source</Label>
                  <RadioGroup value={source} onValueChange={(v) => setSource(v as "mic" | "tab")}>
                    <div className="flex items-center space-x-2 border p-4 rounded-md cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="mic" id="mic" />
                      <Label htmlFor="mic" className="flex items-center cursor-pointer flex-1">
                        <Mic className="mr-2 h-4 w-4" />
                        Microphone
                        <span className="ml-2 text-xs text-muted-foreground font-normal block">
                          Record direct input from your microphone
                        </span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-4 rounded-md cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="tab" id="tab" />
                      <Label htmlFor="tab" className="flex items-center cursor-pointer flex-1">
                        <Monitor className="mr-2 h-4 w-4" />
                        Tab / Screen Audio
                        <span className="ml-2 text-xs text-muted-foreground font-normal block">
                          Capture audio from a browser tab or meeting
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateSession} disabled={isCreating}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Start Recording
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Session List */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No sessions yet</h3>
              <p className="text-sm text-muted-foreground">Create your first recording session to get started</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Session
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
