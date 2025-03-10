"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DebugFirebase() {
  const [showDebug, setShowDebug] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  const envVars = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  const maskString = (str: string | undefined) => {
    if (!str) return "Not set"
    if (str.length <= 8) return "********"
    return str.substring(0, 4) + "..." + str.substring(str.length - 4)
  }

  useEffect(() => {
    // Retrieve username from local storage
    const storedUsername = localStorage.getItem("chat-username")
    setUsername(storedUsername) // Set username state
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {username == "admin" && (
        <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)} className="mb-2">
          {showDebug ? "Hide Debug" : "Debug Firebase"}
        </Button>
      )}

      {showDebug && (
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="text-sm">Firebase Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className={value ? "text-green-600" : "text-red-600"}>
                    {value ? maskString(value) : "Not set"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

