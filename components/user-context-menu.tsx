"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AtSign, MessageSquare } from "lucide-react"

interface UserContextMenuProps {
  username: string
  currentUsername: string
  onMention: () => void
  onDirectMessage: () => void
  children?: React.ReactNode
}

export function UserContextMenu({
  username,
  currentUsername,
  onMention,
  onDirectMessage,
  children,
}: UserContextMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPosition({ x: e.clientX, y: e.clientY })
    setShowMenu(true)
  }

  const handleClick = (e: React.MouseEvent) => {
    // For mobile support, toggle menu on click
    if (!showMenu) {
      setShowMenu(true)
      // Position near the element
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setMenuPosition({
        x: rect.right,
        y: rect.top,
      })
    } else {
      setShowMenu(false)
    }
  }

  const closeMenu = () => {
    setShowMenu(false)
  }

  return (
    <div onContextMenu={handleContextMenu} onClick={handleClick} className="relative">
      {children}

      {showMenu && (
        <Card
          className="absolute z-50 w-48 p-1 shadow-lg"
          style={{
            top: `${menuPosition.y}px`,
            left: `${menuPosition.x}px`,
            position: "fixed",
          }}
        >
          <CardContent className="p-1">
            <div className="py-1 text-sm">
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md cursor-pointer"
                onClick={() => {
                  onMention()
                  closeMenu()
                }}
              >
                <AtSign className="h-4 w-4" />
                <span>Mention</span>
              </div>
              {username !== currentUsername && (
                <div
                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md cursor-pointer"
                  onClick={() => {
                    onDirectMessage()
                    closeMenu()
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Direct Message</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

