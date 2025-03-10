"use client"

import { useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MentionDropdownProps {
  query: string
  users: string[]
  onSelect: (username: string) => void
  position: { top: number; left: number } | null
}

export function MentionDropdown({ query, users, onSelect, position }: MentionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter users based on the query (case insensitive)
  const filteredUsers = users.filter((user) => user.toLowerCase().includes(query.toLowerCase()))

  // Handle keyboard navigation and selection
  useEffect(() => {
    if (!position) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dropdownRef.current) return

      const items = dropdownRef.current.querySelectorAll('[role="option"]')
      if (items.length === 0) return

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()

        const currentIndex = Array.from(items).findIndex((item) => item.getAttribute("aria-selected") === "true")

        let nextIndex = currentIndex
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
        }

        items.forEach((item, i) => {
          item.setAttribute("aria-selected", i === nextIndex ? "true" : "false")
        })
      } else if (e.key === "Enter") {
        e.preventDefault()
        const selectedItem = dropdownRef.current.querySelector('[aria-selected="true"]')
        if (selectedItem) {
          onSelect(selectedItem.textContent?.replace("@", "") || "")
        } else if (items.length > 0) {
          onSelect(items[0].textContent?.replace("@", "") || "")
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onSelect("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [position, onSelect])

  if (!position || filteredUsers.length === 0) return null

  return (
    <Card
      ref={dropdownRef}
      className="absolute z-50 w-64 max-h-48 overflow-y-auto shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        position: "fixed", // Add fixed positioning to ensure it's visible
      }}
    >
      <div role="listbox" className="p-1">
        {filteredUsers.map((user, index) => (
          <div
            key={user}
            role="option"
            aria-selected={index === 0 ? "true" : "false"}
            className={cn(
              "px-2 py-1 text-sm rounded cursor-pointer",
              "hover:bg-primary hover:text-primary-foreground",
              index === 0 ? "bg-primary/10" : "",
            )}
            onClick={() => onSelect(user)}
          >
            @{user}
          </div>
        ))}
      </div>
    </Card>
  )
}

