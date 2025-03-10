"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseInitialized } from "@/lib/supabase"
import {
  hashPassword,
  isValidPassword,
  checkUserExists,
  createUser,
  verifyUser,
  updateLastLogin,
} from "@/lib/auth-utils"
import { Loader2 } from "lucide-react"
import { supabase, AUTH_USERS_TABLE } from "@/lib/supabase"

interface AuthFormProps {
  onLogin: (username: string) => void
  onDbError?: () => void
}

type AuthStep = "username" | "login" | "register"

export function AuthForm({ onLogin, onDbError }: AuthFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<AuthStep>("username")
  const [userExists, setUserExists] = useState(false)

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username.trim()) {
      setError("Username cannot be empty")
      return
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    if (username.length > 20) {
      setError("Username must be less than 20 characters")
      return
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setError("Username can only contain letters and numbers (no spaces or symbols)")
      return
    }

    if (!isSupabaseInitialized()) {
      setError("Supabase is not initialized. Please check your environment variables.")
      return
    }

    setIsLoading(true)

    try {
      // Check if username exists
      const { data, error } = await supabase.from(AUTH_USERS_TABLE).select("username").eq("username", username).single()

      if (error) {
        // Check if the error is because the table doesn't exist
        if (error.message.includes("does not exist")) {
          setError("Database tables are not set up. Please initialize the database first.")
          console.error("Database tables not found:", error.message)

          // Call onDbError if provided
          if (onDbError) {
            onDbError()
          }

          return
        }

        // If it's a "not found" error, it means the user doesn't exist
        if (error.code === "PGRST116") {
          // User doesn't exist, go to register step
          setUserExists(false)
          setStep("register")
          return
        }

        // Other error
        throw error
      }

      // User exists, go to login step
      setUserExists(true)
      setStep("login")
    } catch (error) {
      console.error("Error checking username:", error)
      setError(`Error checking username: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password) {
      setError("Please enter your password")
      return
    }

    if (!isSupabaseInitialized()) {
      setError("Supabase is not initialized. Please check your environment variables.")
      return
    }

    setIsLoading(true)

    try {
      // Verify user credentials
      const user = await verifyUser(username, hashPassword(password))

      if (!user) {
        setError("Incorrect username or password")
        return
      }

      // Update last login
      await updateLastLogin(username)

      // Save to localStorage
      localStorage.setItem("chat-username", username)

      // Call onLogin callback
      onLogin(username)
    } catch (error) {
      console.error("Error logging in:", error)
      setError("Error logging in. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate password
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.message)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!isSupabaseInitialized()) {
      setError("Supabase is not initialized. Please check your environment variables.")
      return
    }

    setIsLoading(true)

    try {
      // Double-check the user doesn't exist
      const exists = await checkUserExists(username)

      if (exists) {
        setError("Username is now taken. Please choose another.")
        setStep("username")
        return
      }

      // Create user
      await createUser(username, hashPassword(password))

      // Save to localStorage
      localStorage.setItem("chat-username", username)

      // Call onLogin callback
      onLogin(username)
    } catch (error) {
      console.error("Error registering:", error)
      setError("Error registering. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const goBack = () => {
    setStep("username")
    setPassword("")
    setConfirmPassword("")
    setError("")
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Chat App</CardTitle>
          {step === "username" && <CardDescription>Please enter a username to continue</CardDescription>}
          {step === "login" && (
            <CardDescription>
              Enter your password to login as <span className="font-medium">{username}</span>
            </CardDescription>
          )}
          {step === "register" && (
            <CardDescription>
              Create a new account with username <span className="font-medium">{username}</span>
            </CardDescription>
          )}
        </CardHeader>

        {step === "username" && (
          <form onSubmit={handleUsernameSubmit}>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12"
                    autoFocus
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </CardFooter>
          </form>
        )}

        {step === "login" && (
          <form onSubmit={handleLogin}>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                    autoFocus
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </CardFooter>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister}>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12"
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}

