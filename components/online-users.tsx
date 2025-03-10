"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserContextMenu } from "@/components/user-context-menu"
import { cn } from "@/lib/utils"

interface OnlineUsersProps {
  onlineUsers: string[]
  username: string
  adminUsername: string
  onMentionUser: (username: string) => void
  onDirectMessage: (username: string) => void
  getInitials: (name: string) => string
}

export function OnlineUsers({
  onlineUsers,
  username,
  adminUsername,
  onMentionUser,
  onDirectMessage,
  getInitials,
}: OnlineUsersProps) {
  const [hoveredUser, setHoveredUser] = useState<string | null>(null)
  const [displayUsers, setDisplayUsers] = useState<string[]>([])

  // Update displayUsers whenever onlineUsers changes
  useEffect(() => {
    console.log("Online users received:", onlineUsers)

    // Make sure current user is always included
    const updatedUsers = [...onlineUsers]
    if (!updatedUsers.includes(username)) {
      updatedUsers.push(username)
    }

    // Sort users with current user first
    updatedUsers.sort((a, b) => {
      if (a === username) return -1
      if (b === username) return 1
      return a.localeCompare(b)
    })

    console.log("Display users set to:", updatedUsers)
    setDisplayUsers(updatedUsers)
  }, [onlineUsers, username])

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Online Users ({displayUsers.length})
          {displayUsers.length === 0 && onlineUsers.length > 0 && " (Display issue)"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayUsers.length > 0 ? (
            displayUsers.map((user) => (
              <UserContextMenu
                key={user}
                username={user}
                currentUsername={username}
                onMention={() => onMentionUser(user)}
                onDirectMessage={() => onDirectMessage(user)}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                    hoveredUser === user ? "bg-muted" : "",
                    user === username ? "bg-primary/10" : "",
                  )}
                  onMouseEnter={() => setHoveredUser(user)}
                  onMouseLeave={() => setHoveredUser(null)}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={
                          user === adminUsername
                            ? "bg-amber-500 text-amber-950"
                            : user === username
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                        }
                      >
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user === username ? "You" : user}
                      {user === adminUsername && (
                        <span className="ml-1.5 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </UserContextMenu>
            ))
          ) : (
            <div className="text-sm text-muted-foreground italic">
              {onlineUsers.length > 0 ? "Display issue - users are online but not showing" : "No users online"}
            </div>
          )}

          
        </div>
      </CardContent>
    </Card>
  )
}

