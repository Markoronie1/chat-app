"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Hash, MessageSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface ChannelListProps {
  activeChannel: string
  onChannelChange?: (channel: string) => void
  isCollapsed: boolean
  onToggleCollapse: (collapsed: boolean) => void
  channels?: string[]
  getChannelDisplayName?: (channelId: string) => string
  onCloseChannel?: (channelId: string) => void
  unreadCounts?: Record<string, number>
  username: string
}

export function ChannelList({
  activeChannel,
  onChannelChange,
  isCollapsed,
  onToggleCollapse,
  channels = ["general", "testing"],
  getChannelDisplayName = (id) => id,
  onCloseChannel,
  unreadCounts = {},
  username,
}: ChannelListProps) {
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }

    if (isCollapsed) {
      onToggleCollapse(false)
    }
  }

  const handleMouseLeave = () => {
    const timer = setTimeout(() => {
      onToggleCollapse(true)
    }, 300)

    setHoverTimer(timer)
  }

  useEffect(() => {
    return () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer)
      }
    }
  }, [hoverTimer])

  return (
    <div
      className={cn("transition-all duration-300 relative", {
        "w-12 opacity-75": isCollapsed,
        "w-full opacity-100": !isCollapsed,
      })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Card className="h-full">
        <CardHeader className="p-3 space-y-0">
          <CardTitle className={cn("text-sm transition-all duration-300", { "text-center": isCollapsed })}>
            {isCollapsed ? "Ch" : "Channels"}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("p-0", isCollapsed ? "px-1" : "px-2")}>
          <ScrollArea className="h-[calc(80vh-50px)]">
            <div className="space-y-1">
              {channels.map((channel) => {
                const isPrivate = channel.startsWith("private_")
                const displayName = getChannelDisplayName(channel)
                const unreadCount = unreadCounts[channel] || 0

                // Skip self DMs
                if (isPrivate) {
                  const parts = channel.split("_")
                  if (parts.length >= 3) {
                    const user1 = parts[1]
                    const user2 = parts[2]
                    if (user1 === user2) {
                      return null
                    }
                  }
                }

                return (
                  <div
                    key={channel}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                      channel === activeChannel ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                    style={{ height: "50px" }} // Fixed height for channel items
                  >
                    <div className="flex-grow flex items-center gap-2" onClick={() => onChannelChange?.(channel)}>
                      {isPrivate ? (
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <Hash className="h-4 w-4 flex-shrink-0" />
                      )}

                      <span className={`text-sm font-medium ${isCollapsed ? "whitespace-nowrap" : ""}`}>
                        {/* Show full name for DMs and other channels without modification */}
                        {displayName}
                      </span>

                      {unreadCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && isPrivate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCloseChannel?.(channel)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

