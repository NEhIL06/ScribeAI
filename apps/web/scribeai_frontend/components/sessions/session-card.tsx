import { formatDistanceToNow } from "date-fns"
import { Clock, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Session } from "@/lib/types"

/**
 * Session card component
 * Displays session preview with state badge and metadata
 */
export function SessionCard({ session }: { session: Session }) {
  const stateConfig = {
    recording: { icon: Loader2, label: "Recording", color: "text-red-500", animate: true },
    paused: { icon: Clock, label: "Paused", color: "text-yellow-500", animate: false },
    processing: { icon: Loader2, label: "Processing", color: "text-blue-500", animate: true },
    completed: { icon: CheckCircle2, label: "Completed", color: "text-green-500", animate: false },
    error: { icon: AlertCircle, label: "Error", color: "text-destructive", animate: false },
  }

  const config = stateConfig[session.state]
  const Icon = config.icon

  return (
    <Link href={`/session/${session.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-1">{session.title || "Untitled Session"}</CardTitle>
            <div className={cn("flex items-center gap-1.5 text-xs font-medium", config.color)}>
              <Icon className={cn("h-3.5 w-3.5", config.animate && "animate-spin")} />
              {config.label}
            </div>
          </div>
          <CardDescription>
            Started {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              <span>Transcript</span>
            </div>
            {session.stoppedAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>
                  {Math.round((new Date(session.stoppedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)}{" "}
                  min
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
