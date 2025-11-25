import type React from "react"
import { ProtectedLayout } from "@/components/layout/protected-layout"
import { AppHeader } from "@/components/layout/app-header"
import { AppProvider } from "@/app/providers"

/**
 * Protected layout wrapper
 * Wraps dashboard and session pages with authentication check
 */
export default function ProtectedLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppProvider>
      <ProtectedLayout>
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1">{children}</main>
        </div>
      </ProtectedLayout>
    </AppProvider>
  )
}
