"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Initialize theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    // Set initial state based on localStorage or system preference
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)

    if (!isDarkMode) {
      // Switch to dark mode
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      // Switch to light mode
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed top-4 right-4 z-50 rounded-full w-10 h-10"
      onClick={toggleTheme}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}

