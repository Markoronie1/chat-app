"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase, MESSAGES_TABLE, USERS_TABLE, ADMIN_SETTINGS_TABLE } from "@/lib/supabase"
import { Loader2, Trash2 } from "lucide-react"

export function DataReset() {
  const [password, setPassword] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    // Retrieve username from local storage
    const storedUsername = localStorage.getItem("chat-username")
    setUsername(storedUsername) // Set username state
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Simple admin password check
    if (password !== "adminreset") {
      setError("Incorrect password")
      return
    }

    setIsResetting(true)

    try {
      // Delete all messages
      const { error: messagesError } = await supabase.from(MESSAGES_TABLE).delete().neq("id", "0") // Delete all rows

      if (messagesError) throw messagesError

      // Delete all users
      const { error: usersError } = await supabase.from(USERS_TABLE).delete().neq("username", "") // Delete all rows

      if (usersError) throw usersError

      // Reset admin settings
      const { error: adminError } = await supabase.from(ADMIN_SETTINGS_TABLE).upsert({
        id: "settings",
        last_clear_timestamp: Date.now(),
      })

      if (adminError) throw adminError

      setSuccess("All data has been reset successfully!")
      setShowForm(false)
      setPassword("")

      // Clear localStorage
      localStorage.removeItem("chat-username")

      // Reload the page after a delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("Error resetting data:", error)
      setError("Error resetting data. Please try again.")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {username == "admin" && ( // Conditionally render the button based on username
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Reset All Data
        </Button>
      )}

      {showForm && (
        <Card className="absolute bottom-12 left-0 w-80">
          <CardHeader>
            <CardTitle className="text-sm">Reset All Data</CardTitle>
            <CardDescription className="text-xs">
              This will delete all messages and users. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleReset}>
            <CardContent>
              <Input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-sm"
              />
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
              {success && <p className="text-xs text-green-500 mt-2">{success}</p>}
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-full">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" size="sm" disabled={isResetting}>
                  {isResetting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset All Data"
                  )}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}

