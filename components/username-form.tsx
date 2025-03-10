"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface UsernameFormProps {
  onSubmit: (username: string) => void
}

export function UsernameForm({ onSubmit }: UsernameFormProps) {
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedUsername = username.replace(/\s/g, "")

    if (!trimmedUsername) {
      setError("Username cannot be empty")
      return
    }

    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    if (trimmedUsername.length > 20) {
      setError("Username must be less than 20 characters")
      return
    }

    if (!/^[a-zA-Z0-9]+$/.test(trimmedUsername)) {
      setError("Username can only contain letters and numbers (no spaces or symbols)")
      return
    }

    setError("") // Clear error if validation passes
    onSubmit(trimmedUsername)
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Chat App</CardTitle>
          <CardDescription>Please enter a username to continue</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                  className="h-12"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Join Chat
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

