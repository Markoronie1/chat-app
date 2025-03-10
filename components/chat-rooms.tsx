"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hash } from "lucide-react"

interface ChatRoomsProps {
  activeRoom: string
  onRoomChange?: (room: string) => void
}

export function ChatRooms({ activeRoom, onRoomChange }: ChatRoomsProps) {
  // For now, we only have the General room
  const rooms = ["General"]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Chat Rooms</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(80vh-120px)]">
          <div className="space-y-1">
            {rooms.map((room) => (
              <div
                key={room}
                className={`flex items-center gap-2 p-3 mx-2 rounded-md cursor-pointer ${
                  room === activeRoom ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
                onClick={() => onRoomChange?.(room)}
              >
                <Hash className="h-4 w-4" />
                <span className="text-sm font-medium">{room}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

