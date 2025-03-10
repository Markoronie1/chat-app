"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Trash2, ArrowDown, Paperclip, X, AlertCircle, LogOut } from "lucide-react"
import { FileMessage } from "@/components/file-message"
import { ChannelList } from "@/components/channel-list"
import { OnlineUsers } from "@/components/online-users"
import { MentionDropdown } from "@/components/mention-dropdown"
import { cn } from "@/lib/utils"
import {
  supabase,
  isSupabaseInitialized,
  formatFileSize,
  MESSAGES_TABLE,
  USERS_TABLE,
  ADMIN_SETTINGS_TABLE,
  PRIVATE_CHANNELS_TABLE,
  STORAGE_BUCKET,
  type Message,
  type User,
  type AdminSettings,
  type PrivateChannel,
} from "@/lib/supabase"

// Define the admin username - change this to your preferred admin username
const ADMIN_USERNAME = "admin"
// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024
// Local storage key for closed channels
const CLOSED_CHANNELS_KEY = "chat-closed-channels"
// Local storage key for last read timestamps
const LAST_READ_KEY = "chat-last-read"

interface ChatProps {
  username: string
  onLogout: () => void
}

export function Chat({ username, onLogout }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminPasswordCorrect, setAdminPasswordCorrect] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [lastClearTimestamp, setLastClearTimestamp] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeChannel, setActiveChannel] = useState("general")
  const [privateChannels, setPrivateChannels] = useState<string[]>([])
  const [closedChannels, setClosedChannels] = useState<string[]>([])
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, number>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({})

  // Channel list collapsed state
  const [isChannelListCollapsed, setIsChannelListCollapsed] = useState(true)

  // Mention functionality
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null)
  const [cursorPosition, setCursorPosition] = useState(0)

  // Load closed channels from localStorage
  useEffect(() => {
    const storedClosedChannels = localStorage.getItem(CLOSED_CHANNELS_KEY)
    if (storedClosedChannels) {
      try {
        const parsedChannels = JSON.parse(storedClosedChannels)
        setClosedChannels(parsedChannels)
      } catch (e) {
        console.error("Error parsing closed channels:", e)
      }
    }

    // Load last read timestamps
    const storedLastRead = localStorage.getItem(LAST_READ_KEY)
    if (storedLastRead) {
      try {
        const parsedLastRead = JSON.parse(storedLastRead)
        setLastReadTimestamps(parsedLastRead)
      } catch (e) {
        console.error("Error parsing last read timestamps:", e)
      }
    }
  }, [])

  // Save closed channels to localStorage when they change
  useEffect(() => {
    localStorage.setItem(CLOSED_CHANNELS_KEY, JSON.stringify(closedChannels))
  }, [closedChannels])

  // Save last read timestamps to localStorage when they change
  useEffect(() => {
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(lastReadTimestamps))
  }, [lastReadTimestamps])

  // Check if current user is admin
  useEffect(() => {
    const isUserAdmin = username === ADMIN_USERNAME
    setIsAdmin(isUserAdmin)
    console.log("User is admin:", isUserAdmin)
  }, [username])

  // Check if Supabase is initialized
  useEffect(() => {
    if (!isSupabaseInitialized()) {
      setError("Supabase is not initialized. Please check your environment variables.")
      setIsLoading(false)
      return
    }

    // Create the Supabase bucket if it doesn't exist
    const createBucket = async () => {
      try {
        const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET)

        if (error && error.message.includes("does not exist")) {
          const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
            public: true,
          })

          if (createError) {
            console.error("Error creating bucket:", createError)
            setSupabaseError(`Error creating storage bucket: ${createError.message}`)
          } else {
            console.log("Storage bucket created successfully")
          }
        }
      } catch (err) {
        console.error("Error checking/creating bucket:", err)
        setSupabaseError(`Error setting up Supabase storage: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    createBucket()
    setIsLoading(false)
  }, [])

  // Set up user presence
  useEffect(() => {
    if (!isSupabaseInitialized()) return

    const setupPresence = async () => {
      try {
        console.log("Setting up user presence for:", username)

        // Create or update user document
        const { error } = await supabase.from(USERS_TABLE).upsert({
          username,
          last_seen: Date.now(),
          online: true,
        })

        if (error) {
          console.error("Error updating user presence:", error)
          throw error
        }

        console.log("User presence updated in database")

        // Immediately add current user to online users list
        setOnlineUsers((prev) => {
          if (!prev.includes(username)) {
            console.log("Adding current user to online users list:", username)
            return [...prev, username]
          }
          return prev
        })

        // Update online status when user leaves
        const handleUnload = async () => {
          try {
            await supabase
              .from(USERS_TABLE)
              .update({
                online: false,
                last_seen: Date.now(),
              })
              .eq("username", username)
          } catch (e) {
            console.error("Error updating user status on unload:", e)
          }
        }

        window.addEventListener("beforeunload", handleUnload)

        // Set up periodic updates to keep online status
        const interval = setInterval(async () => {
          try {
            await supabase
              .from(USERS_TABLE)
              .update({
                last_seen: Date.now(),
              })
              .eq("username", username)
          } catch (e) {
            console.error("Error updating user status in interval:", e)
          }
        }, 30000) // Update every 30 seconds

        return () => {
          window.removeEventListener("beforeunload", handleUnload)
          clearInterval(interval)
          handleUnload()
        }
      } catch (e) {
        console.error("Error setting up presence:", e)
        setError("Failed to set up user presence. Please try again.")
      }
    }

    setupPresence()
  }, [username])

  // Listen for online users and fetch all users for mentions
  useEffect(() => {
    if (!isSupabaseInitialized()) return

    try {
      console.log("Setting up online users listener")

      // Consider users online if they've been seen in the last 2 minutes
      const onlineTimeThreshold = Date.now() - 2 * 60 * 1000

      // Initial fetch of online users
      const fetchOnlineUsers = async () => {
        console.log("Fetching online users")

        const { data, error } = await supabase.from(USERS_TABLE).select("*")

        if (error) {
          console.error("Error fetching online users:", error)
          return
        }

        console.log("Received users data:", data)

        const users: string[] = []
        data.forEach((user) => {
          // Consider a user online if they're marked as online or were seen recently
          if (user.online || user.last_seen > onlineTimeThreshold) {
            users.push(user.username)
          }
        })

        console.log("Filtered online users:", users)

        // Make sure current user is included in the online users list
        if (!users.includes(username)) {
          users.push(username)
          console.log("Added current user to online users:", username)
        }

        console.log("Setting online users state:", users)
        setOnlineUsers(users)
      }

      // Fetch immediately
      fetchOnlineUsers()

      // Subscribe to user status changes
      const usersSubscription = supabase
        .channel("users-presence-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: USERS_TABLE,
          },
          (payload) => {
            console.log("User presence change detected:", payload)

            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const user = payload.new as User

              if (user.online || user.last_seen > onlineTimeThreshold) {
                setOnlineUsers((prev) => {
                  if (!prev.includes(user.username)) {
                    console.log("Adding user to online users:", user.username)
                    return [...prev, user.username]
                  }
                  return prev
                })
              } else if (!user.online) {
                setOnlineUsers((prev) => {
                  // Don't remove current user
                  if (user.username === username) {
                    return prev
                  }
                  console.log("Removing user from online users:", user.username)
                  return prev.filter((u) => u !== user.username)
                })
              }
            }
          },
        )
        .subscribe()

      // Fetch all users for mention functionality
      const fetchAllUsers = async () => {
        const { data, error } = await supabase.from(USERS_TABLE).select("username")

        if (error) {
          console.error("Error fetching all users:", error)
          return
        }

        setAllUsers(data.map((user) => user.username))
      }

      fetchAllUsers()

      // Set up a periodic refresh of online users
      const refreshInterval = setInterval(fetchOnlineUsers, 15000) // Refresh every 15 seconds

      return () => {
        usersSubscription.unsubscribe()
        clearInterval(refreshInterval)
      }
    } catch (e) {
      console.error("Error setting up online users listener:", e)
    }
  }, [username])

  // Get the last clear timestamp
  useEffect(() => {
    if (!isSupabaseInitialized()) return

    const getLastClearTimestamp = async () => {
      try {
        const { data, error } = await supabase.from(ADMIN_SETTINGS_TABLE).select("*").eq("id", "settings").single()

        if (error) {
          if (error.code === "PGRST116") {
            // No settings found, create default
            await supabase.from(ADMIN_SETTINGS_TABLE).insert({
              id: "settings",
              last_clear_timestamp: 0,
            })
            setLastClearTimestamp(0)
          } else {
            throw error
          }
        } else if (data) {
          setLastClearTimestamp(data.last_clear_timestamp)
        }
      } catch (error) {
        console.error("Error getting last clear timestamp:", error)
      }
    }

    getLastClearTimestamp()

    // Subscribe to changes in admin settings
    const adminSubscription = supabase
      .channel("admin-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: ADMIN_SETTINGS_TABLE,
        },
        (payload) => {
          if (payload.new && "last_clear_timestamp" in payload.new) {
            setLastClearTimestamp((payload.new as AdminSettings).last_clear_timestamp)
          }
        },
      )
      .subscribe()

    return () => {
      adminSubscription.unsubscribe()
    }
  }, [])

  // Listen for all messages
  useEffect(() => {
    if (!isSupabaseInitialized()) return

    try {
      // Initial fetch of all messages
      const fetchMessages = async () => {
        const { data, error } = await supabase.from(MESSAGES_TABLE).select("*").order("timestamp", { ascending: true })

        if (error) {
          console.error("Error fetching messages:", error)
          setError("Failed to load messages. Please refresh the page.")
          return
        }

        processMessages(data || [])
      }

      fetchMessages()

      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel("messages-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: MESSAGES_TABLE,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newMessage = payload.new as Message

              // Skip messages older than the last clear timestamp for public channels
              if (!newMessage.channel.startsWith("private_") && newMessage.timestamp <= lastClearTimestamp) {
                return
              }

              setAllMessages((prev) => {
                const channel = newMessage.channel || "general"
                const channelMessages = [...(prev[channel] || []), newMessage]
                channelMessages.sort((a, b) => a.timestamp - b.timestamp)

                return {
                  ...prev,
                  [channel]: channelMessages,
                }
              })

              // Update unread counts
              if (newMessage.username !== username) {
                const lastRead = lastReadTimestamps[newMessage.channel] || 0
                if (newMessage.timestamp > lastRead) {
                  setUnreadCounts((prev) => ({
                    ...prev,
                    [newMessage.channel]: (prev[newMessage.channel] || 0) + 1,
                  }))

                  // If this is a new DM, open the channel list
                  if (
                    newMessage.channel.startsWith("private_") &&
                    newMessage.channel !== activeChannel &&
                    newMessage.timestamp > Date.now() - 5000
                  ) {
                    setIsChannelListCollapsed(false)
                  }
                }
              }

              // Update active channel messages
              if (newMessage.channel === activeChannel) {
                setMessages((prev) => {
                  const updated = [...prev, newMessage]
                  updated.sort((a, b) => a.timestamp - b.timestamp)
                  return updated
                })
              }
            }
          },
        )
        .subscribe()

      return () => {
        messagesSubscription.unsubscribe()
      }
    } catch (e) {
      console.error("Error setting up message listener:", e)
      setError("Failed to load messages. Please refresh the page.")
    }
  }, [lastClearTimestamp, activeChannel, lastReadTimestamps, username, isChannelListCollapsed])

  // Process messages helper function
  const processMessages = (messagesData: Message[]) => {
    const newMessages: Record<string, Message[]> = {}
    const newUnreadCounts: Record<string, number> = {}
    let hasNewDM = false

    messagesData.forEach((message) => {
      const channel = message.channel || "general"

      // Skip messages older than the last clear timestamp for public channels
      if (!channel.startsWith("private_") && message.timestamp <= lastClearTimestamp) {
        return
      }

      // Initialize channel array if it doesn't exist
      if (!newMessages[channel]) {
        newMessages[channel] = []
      }

      // Add message to channel
      newMessages[channel].push(message)

      // Check if this is a new message (after last read)
      const lastRead = lastReadTimestamps[channel] || 0
      if (message.timestamp > lastRead && message.username !== username) {
        // Increment unread count
        newUnreadCounts[channel] = (newUnreadCounts[channel] || 0) + 1

        // Check if this is a new DM
        if (channel.startsWith("private_") && channel !== activeChannel && message.timestamp > Date.now() - 5000) {
          // Message in the last 5 seconds
          hasNewDM = true
        }
      }
    })

    // Sort messages by timestamp for each channel
    Object.keys(newMessages).forEach((channel) => {
      newMessages[channel].sort((a, b) => a.timestamp - b.timestamp)
    })

    setAllMessages(newMessages)
    setUnreadCounts(newUnreadCounts)

    // If there's a new DM, open the channel list
    if (hasNewDM && isChannelListCollapsed) {
      setIsChannelListCollapsed(false)
    }

    // Update messages for active channel
    if (newMessages[activeChannel]) {
      setMessages(newMessages[activeChannel])
    } else {
      setMessages([])
    }
  }

  // Update last read timestamp when changing channels or when new messages arrive in the active channel
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]

      // Only update if we're looking at the channel and there are messages
      setLastReadTimestamps((prev) => ({
        ...prev,
        [activeChannel]: Math.max(lastMessage.timestamp, prev[activeChannel] || 0),
      }))

      // Clear unread count for active channel
      if (unreadCounts[activeChannel]) {
        setUnreadCounts((prev) => ({
          ...prev,
          [activeChannel]: 0,
        }))
      }
    }
  }, [activeChannel, messages, unreadCounts])

  // Listen for private channels
  useEffect(() => {
    if (!isSupabaseInitialized()) return

    try {
      // Initial fetch of private channels
      const fetchPrivateChannels = async () => {
        const { data, error } = await supabase
          .from(PRIVATE_CHANNELS_TABLE)
          .select("*")
          .contains("participants", [username])

        if (error) {
          console.error("Error fetching private channels:", error)
          return
        }

        const channels: string[] = []
        data.forEach((channel) => {
          // Skip self DMs
          const channelId = channel.id
          const parts = channelId.split("_")
          if (parts.length >= 3) {
            const user1 = parts[1]
            const user2 = parts[2]
            if (user1 !== user2) {
              channels.push(channelId)
            }
          }
        })

        setPrivateChannels(channels)
      }

      fetchPrivateChannels()

      // Subscribe to private channel changes
      const privateChannelsSubscription = supabase
        .channel("private-channels-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: PRIVATE_CHANNELS_TABLE,
            filter: `participants=cs.{${username}}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const channel = payload.new as PrivateChannel

              // Skip self DMs
              const parts = channel.id.split("_")
              if (parts.length >= 3) {
                const user1 = parts[1]
                const user2 = parts[2]
                if (user1 !== user2) {
                  setPrivateChannels((prev) => [...prev, channel.id])
                }
              }
            }
          },
        )
        .subscribe()

      return () => {
        privateChannelsSubscription.unsubscribe()
      }
    } catch (e) {
      console.error("Error setting up private channels listener:", e)
    }
  }, [username])

  // Listen for online users and fetch all users for mentions

  // Scroll to bottom when messages change
  useEffect(() => {
    // Check if the new message is from someone else and we're already at the bottom
    // or if we just sent a message (in which case we always want to scroll)
    if (isAtBottom || (messages.length > 0 && messages[messages.length - 1].username === username)) {
      const scrollTimeout = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)

      return () => clearTimeout(scrollTimeout)
    } else if (messages.length > 0) {
      // If we're not at the bottom and received a new message, show the scroll button
      setShowScrollButton(true)
    }
  }, [messages, isAtBottom, username])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    setShowScrollButton(false)
  }, [])

  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea
      // Consider "at bottom" if within 100px of the bottom
      const atBottom = scrollHeight - scrollTop - clientHeight < 100
      setIsAtBottom(atBottom)
      setShowScrollButton(!atBottom && messages.length > 0)
    }

    scrollArea.addEventListener("scroll", handleScroll)
    return () => scrollArea.removeEventListener("scroll", handleScroll)
  }, [messages.length])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      alert(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`)
      e.target.value = ""
      return
    }

    setSelectedFile(file)
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !isSupabaseInitialized()) {
      console.error("Missing required data for upload:", {
        hasFile: !!selectedFile,
        isSupabaseInitialized: isSupabaseInitialized(),
      })

      if (!isSupabaseInitialized()) {
        setSupabaseError("Supabase is not properly initialized. Please check your Supabase configuration.")
      }

      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    console.log("Starting file upload for:", selectedFile.name)

    try {
      // Create a unique file path
      const filePath = `${username}/${Date.now()}_${selectedFile.name}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        throw error
      }

      console.log("Upload completed, getting public URL")

      // Get the public URL
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl
      console.log("Public URL obtained:", publicUrl)

      // Add message with file info to Supabase
      const { error: insertError } = await supabase.from(MESSAGES_TABLE).insert({
        text: "",
        username,
        timestamp: Date.now(),
        fileURL: publicUrl,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        channel: activeChannel,
      })

      if (insertError) {
        throw insertError
      }

      console.log("Message with file added to database")

      // Reset file state
      setSelectedFile(null)
      setIsUploading(false)
      setUploadProgress(100)
      if (fileInputRef.current) fileInputRef.current.value = ""

      // Scroll to bottom
      scrollToBottom()

      // Reset upload progress after a delay
      setTimeout(() => {
        setUploadProgress(0)
      }, 1000)
    } catch (error) {
      console.error("Error handling file upload:", error)
      setSupabaseError(
        `Failed to upload file: ${error instanceof Error ? error.message : String(error)}. Please check your Supabase configuration.`,
      )
      setIsUploading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    // If there's a file selected, upload it
    if (selectedFile && !isUploading) {
      console.log("Sending file message")
      await handleFileUpload()
      return
    }

    // Otherwise send a text message
    if (!newMessage.trim() || !isSupabaseInitialized()) return

    try {
      const { error } = await supabase.from(MESSAGES_TABLE).insert({
        text: newMessage,
        username,
        timestamp: Date.now(),
        channel: activeChannel,
      })

      if (error) throw error

      setNewMessage("")

      // Immediately scroll to bottom after sending a message
      scrollToBottom()
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")
    }
  }

  const cancelFileUpload = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Function to clear all messages (by updating the lastClearTimestamp)
  const clearAllMessages = async () => {
    if (!isSupabaseInitialized() || !isAdmin) {
      console.error("Cannot clear messages: Supabase not initialized or user not admin")
      return
    }

    try {
      console.log("Starting message clearing process")
      setIsDeleting(true)

      // Update the lastClearTimestamp in the admin settings
      const currentTimestamp = Date.now()
      const { error } = await supabase.from(ADMIN_SETTINGS_TABLE).upsert({
        id: "settings",
        last_clear_timestamp: currentTimestamp,
      })

      if (error) throw error
      console.log("Updated lastClearTimestamp to", currentTimestamp)

      // Add a system message indicating messages were cleared
      const { error: messageError } = await supabase.from(MESSAGES_TABLE).insert({
        text: "All messages have been cleared by the admin.",
        username: "System",
        timestamp: Date.now(),
        channel: activeChannel,
      })

      if (messageError) throw messageError
      console.log("System message added")

      setIsDeleting(false)
    } catch (error) {
      console.error("Error clearing messages:", error)
      setIsDeleting(false)
      setError("Failed to clear messages. Please try again.")
      alert("Error clearing messages: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  // Function to verify admin password
  const verifyAdminPassword = () => {
    console.log("Verifying admin password:", adminPassword)
    // This is a simple password check - in a real app, you'd want to use a more secure method
    // The password is "adminpass" - change this to your preferred password
    if (adminPassword === "adminpass") {
      console.log("Password correct")
      setAdminPasswordCorrect(true)
      setShowAdminPanel(true)
    } else {
      console.log("Password incorrect")
      setAdminPasswordCorrect(false)
      setError("Incorrect admin password")
    }
    setAdminPassword("")
  }

  const handleLogoutClick = () => {
    // Update user status to offline
    if (isSupabaseInitialized()) {
      supabase
        .from(USERS_TABLE)
        .update({
          online: false,
          last_seen: Date.now(),
        })
        .eq("username", username)
        .then(() => {
          // Call the onLogout callback
          onLogout()
        })
        .catch((e) => console.error("Error updating user status on logout:", e))
    } else {
      // Call the onLogout callback directly if Supabase is not initialized
      onLogout()
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Handle input changes for mention functionality
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewMessage(value)

    // Get cursor position
    const cursorPos = e.target.selectionStart || 0
    setCursorPosition(cursorPos)

    // Check for mention
    const textBeforeCursor = value.substring(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      const query = mentionMatch[1]
      setMentionQuery(query)

      // Calculate position for dropdown
      if (inputRef.current) {
        const inputRect = inputRef.current.getBoundingClientRect()
        // Position above the input
        setMentionPosition({
          top: inputRect.top - 150, // Position above input
          left: inputRect.left + 20, // Align with @ symbol approximately
        })
      }
    } else {
      setMentionQuery("")
      setMentionPosition(null)
    }
  }

  // Handle mention selection
  const handleMentionSelect = (selectedUsername: string) => {
    if (!selectedUsername) {
      setMentionPosition(null)
      return
    }

    const textBeforeMention = newMessage.substring(0, cursorPosition).replace(/@\w*$/, "")
    const textAfterMention = newMessage.substring(cursorPosition)

    const newText = `${textBeforeMention}@${selectedUsername} ${textAfterMention}`
    setNewMessage(newText)
    setMentionPosition(null)

    // Focus back on input and set cursor position after the inserted mention
    if (inputRef.current) {
      inputRef.current.focus()
      const newCursorPos = textBeforeMention.length + selectedUsername.length + 2 // +2 for @ and space
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    }
  }

  // Function to handle mentioning a user from the online users list
  const handleMentionUser = (user: string) => {
    // Insert mention when clicking on a user
    const mentionText = `@${user} `
    setNewMessage((prev) => {
      // If there's already text, add a space before the mention
      const prefix = prev.length > 0 && !prev.endsWith(" ") ? " " : ""
      return prev + prefix + mentionText
    })
    // Focus the input after inserting mention
    inputRef.current?.focus()
  }

  // Function to create a direct message channel
  const handleDirectMessage = async (otherUser: string) => {
    if (!isSupabaseInitialized()) return

    // Prevent DMing yourself
    if (otherUser === username) {
      console.log("Cannot DM yourself")
      return
    }

    try {
      // Create a unique channel ID for the private conversation
      // Sort usernames to ensure the same channel ID regardless of who initiates
      const users = [username, otherUser].sort()
      const channelId = `private_${users[0]}_${users[1]}`

      // Check if the channel already exists
      const { data, error } = await supabase.from(PRIVATE_CHANNELS_TABLE).select("*").eq("id", channelId).single()

      if (error && error.code === "PGRST116") {
        // Channel doesn't exist, create it
        const { error: insertError } = await supabase.from(PRIVATE_CHANNELS_TABLE).insert({
          id: channelId,
          participants: users,
          created_by: username,
        })

        if (insertError) throw insertError

        // Add a system message to the new channel
        const { error: messageError } = await supabase.from(MESSAGES_TABLE).insert({
          text: `Direct message conversation started between ${username} and ${otherUser}.`,
          username: "System",
          timestamp: Date.now(),
          channel: channelId,
        })

        if (messageError) throw messageError
      }

      // Remove from closed channels if it was closed
      if (closedChannels.includes(channelId)) {
        setClosedChannels((prev) => prev.filter((ch) => ch !== channelId))
      }

      // Switch to the private channel
      setActiveChannel(channelId)

      // Expand channel list if collapsed
      if (isChannelListCollapsed) {
        setIsChannelListCollapsed(false)
      }
    } catch (error) {
      console.error("Error creating direct message channel:", error)
      setError("Failed to create direct message. Please try again.")
    }
  }

  // Function to close a channel
  const handleCloseChannel = (channelId: string) => {
    // Only allow closing private channels
    if (!channelId.startsWith("private_")) return

    // Add to closed channels
    setClosedChannels((prev) => [...prev, channelId])

    // If the active channel is being closed, switch to general
    if (activeChannel === channelId) {
      setActiveChannel("general")
    }
  }

  // Function to render message text with highlighted mentions
  const renderMessageText = (text: string, isCurrentUser: boolean) => {
    // Regex to find mentions
    const mentionRegex = /@(\w+)/g
    const parts = []
    let lastIndex = 0
    let match

    // Find all mentions in the text
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      // Add the mention with special styling
      const mentionedUser = match[1]
      parts.push(
        <span key={`mention-${match.index}`} className="font-semibold text-amber-500">
          @{mentionedUser}
        </span>,
      )

      lastIndex = match.index + match[0].length
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts
  }

  // Check if a message mentions the current user
  const isUserMentioned = (text: string) => {
    const mentionRegex = new RegExp(`@${username}\\b`, "i")
    return mentionRegex.test(text)
  }

  // Get display name for a channel
  const getChannelDisplayName = (channelId: string) => {
    if (!channelId.startsWith("private_")) {
      return channelId
    }

    // Extract usernames from private channel ID
    const parts = channelId.split("_")
    if (parts.length < 3) return channelId

    // Find the other user's name
    const users = [parts[1], parts[2]]
    const otherUser = users.find((user) => user !== username) || "Unknown"

    return `DM: ${otherUser}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 max-w-md">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md max-w-md">
          <p className="font-medium">Troubleshooting</p>
          <ul className="text-sm list-disc pl-5 mt-2">
            <li>Check that your Supabase environment variables are correctly set in Vercel</li>
            <li>Verify that your Supabase project is properly configured</li>
            <li>Make sure your Supabase API key is valid</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      </div>
    )
  }

  // Combine public and private channels for the channel list, filtering out closed channels
  const allChannels = ["general", "testing", ...privateChannels.filter((channel) => !closedChannels.includes(channel))]

  // Add this right before the return statement in the Chat component
  // Ensure current user is always in online users list
  const effectiveOnlineUsers = onlineUsers.includes(username) ? onlineUsers : [...onlineUsers, username]

  return (
    <div className="grid grid-cols-12 gap-4 h-[80vh]">
      {/* Channel List */}
      <div
        className={cn(
          "hidden md:block transition-all duration-300",
          isChannelListCollapsed ? "md:col-span-1" : "md:col-span-3", // Wider channel list
        )}
      >
        <ChannelList
          activeChannel={activeChannel}
          onChannelChange={setActiveChannel}
          isCollapsed={isChannelListCollapsed}
          onToggleCollapse={(collapsed) => setIsChannelListCollapsed(collapsed)}
          channels={allChannels}
          getChannelDisplayName={getChannelDisplayName}
          onCloseChannel={handleCloseChannel}
          unreadCounts={unreadCounts}
          username={username}
        />
      </div>

      {/* Main Chat Area - synchronized with channel list animations */}
      <div
        className={cn(
          "col-span-12 transition-all duration-300", // Added transition for smooth movement
          isChannelListCollapsed
            ? "md:col-span-8" // When channel list is collapsed
            : "md:col-span-6", // When channel list is expanded
        )}
      >
        <Card className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>
              {activeChannel.startsWith("private_") ? getChannelDisplayName(activeChannel) : `#${activeChannel}`}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="flex items-center">
                  {!showAdminPanel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        // Show a simple prompt instead of using Dialog component
                        const password = prompt("Enter admin password:")
                        if (password) {
                          if (password === "adminpass") {
                            console.log("Password correct")
                            setShowAdminPanel(true)
                          } else {
                            console.log("Password incorrect")
                            alert("Incorrect password")
                          }
                        }
                      }}
                    >
                      Admin Panel
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-1"
                      disabled={isDeleting}
                      onClick={() => {
                        // Show a simple confirmation instead of using AlertDialog
                        if (confirm("Are you sure you want to delete all messages? This cannot be undone.")) {
                          clearAllMessages()
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "Clearing..." : "Clear All Messages"}
                    </Button>
                  )}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleLogoutClick} className="flex items-center gap-1">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsChannelListCollapsed(!isChannelListCollapsed)}
              >
                {isChannelListCollapsed ? "Show Channels" : "Hide Channels"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden pt-2 relative">
            <ScrollArea className="h-[calc(80vh-180px)]" ref={scrollAreaRef}>
              <div className="space-y-4 pr-4">
                {messages.map((msg) => {
                  const isCurrentUser = msg.username === username
                  const isMentioned = msg.text ? isUserMentioned(msg.text) : false

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-start gap-2",
                        isCurrentUser ? "flex-row-reverse" : "",
                        isMentioned && !isCurrentUser ? "bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg" : "",
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={
                            msg.username === "System"
                              ? "bg-yellow-500"
                              : msg.username === username
                                ? "bg-primary"
                                : "bg-muted"
                          }
                        >
                          {msg.username === "System" ? "SYS" : getInitials(msg.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex flex-col max-w-[80%] ${msg.username === username ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {msg.username === username ? "You" : msg.username}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        </div>

                        {/* File message */}
                        {msg.fileURL && msg.fileName && msg.fileType && (
                          <div
                            className={`rounded-lg px-3 py-2 ${
                              msg.username === username ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <FileMessage
                              fileURL={msg.fileURL}
                              fileName={msg.fileName}
                              fileType={msg.fileType}
                              fileSize={msg.fileSize || 0}
                            />
                          </div>
                        )}

                        {/* Text message */}
                        {msg.text && (
                          <div
                            className={`rounded-lg px-3 py-2 text-sm ${
                              msg.username === "System"
                                ? "bg-yellow-100 text-yellow-800"
                                : msg.username === username
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                            }`}
                          >
                            {renderMessageText(msg.text, isCurrentUser)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {showScrollButton && (
              <Button
                className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 shadow-md"
                onClick={scrollToBottom}
                size="icon"
                variant="secondary"
              >
                <ArrowDown className="h-5 w-5" />
              </Button>
            )}
          </CardContent>
          <CardFooter className="flex flex-col">
            {supabaseError && (
              <div className="w-full mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Supabase Storage Error</p>
                  <p>{supabaseError}</p>
                  <p className="mt-1">
                    Make sure your Supabase project is properly configured and has the correct permissions.
                  </p>
                </div>
              </div>
            )}

            <form ref={formRef} onSubmit={sendMessage} className="w-full">
              {selectedFile && (
                <div className="w-full mb-3 p-3 bg-background border rounded-md flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-3 text-muted-foreground">
                      <Paperclip className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  {isUploading ? (
                    <div className="flex items-center">
                      <div className="w-24 h-1 bg-muted rounded-full overflow-hidden mr-2">
                        <div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</span>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={cancelFileUpload} className="text-muted-foreground">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              <div className="flex w-full gap-2 relative">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" id="file-upload" />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !!selectedFile}
                  className="flex-shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  ref={inputRef}
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={handleInputChange}
                  className="flex-grow"
                  disabled={isUploading || !!selectedFile}
                />
                <Button type="submit" size="icon" disabled={isUploading}>
                  {isUploading ? (
                    <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>

                {/* Mention dropdown */}
                <MentionDropdown
                  query={mentionQuery}
                  users={allUsers}
                  onSelect={handleMentionSelect}
                  position={mentionPosition}
                />
              </div>
            </form>
          </CardFooter>
        </Card>
      </div>

      {/* Online Users - static, no animations */}
      <div className="hidden md:block md:col-span-3">
        {/* Then in the return statement, update the OnlineUsers component props */}
        <OnlineUsers
          onlineUsers={effectiveOnlineUsers}
          username={username}
          adminUsername={ADMIN_USERNAME}
          onMentionUser={handleMentionUser}
          onDirectMessage={handleDirectMessage}
          getInitials={getInitials}
        />
      </div>
    </div>
  )
}

