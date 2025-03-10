"use client"

import { useEffect, useState } from "react"
import { Chat } from "@/components/chat"
import { AuthForm } from "@/components/auth-form"
import { DebugSupabase } from "@/components/debug-supabase"
import { isSupabaseInitialized } from "@/lib/supabase"
import { ThemeToggle } from "@/components/theme-toggle"
import { DataReset } from "@/components/data-reset"
import { DbInitializer } from "@/components/db-initializer"

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [needsDbInit, setNeedsDbInit] = useState(false)

  useEffect(() => {
    // Check if Supabase is initialized
    if (!isSupabaseInitialized()) {
      console.error("Supabase is not initialized")
      setError("Supabase initialization failed. Please check your environment variables.")
      setShowDebug(true)
      setIsLoading(false)
      return
    }

    // Check if username exists in localStorage
    const storedUsername = localStorage.getItem("chat-username")
    if (storedUsername) {
      setUsername(storedUsername)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (username: string) => {
    setUsername(username)
  }

  const handleLogout = () => {
    localStorage.removeItem("chat-username")
    setUsername(null)
  }

  const handleDbError = () => {
    setNeedsDbInit(true)
  }

  const handleDbInitComplete = () => {
    setNeedsDbInit(false)
    // Force a reload to ensure everything is fresh
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Show database initializer if needed
  if (needsDbInit) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
        <DbInitializer onComplete={handleDbInitComplete} />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      {error && (
        <div className="w-full max-w-md mb-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="font-medium">Supabase Initialization Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        {!username ? (
          <AuthForm onLogin={handleLogin} onDbError={handleDbError} />
        ) : (
          <Chat username={username} onLogout={handleLogout} />
        )}
      </div>

      <DebugSupabase />
      <ThemeToggle />
      <DataReset />
    </main>
  )
}

