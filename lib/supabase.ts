import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are not set correctly")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper function to check if Supabase is initialized
export function isSupabaseInitialized() {
  return !!supabaseUrl && !!supabaseAnonKey
}

// Helper function to get a public URL for a file
export function getSupabasePublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Collection/table names
export const MESSAGES_TABLE = "messages"
export const USERS_TABLE = "users"
export const AUTH_USERS_TABLE = "auth_users"
export const ADMIN_SETTINGS_TABLE = "admin_settings"
export const PRIVATE_CHANNELS_TABLE = "private_channels"

// Types
export interface Message {
  id: string
  username: string
  text: string
  timestamp: number
  fileURL?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  channel: string
  created_at?: string
}

export interface User {
  username: string
  last_seen: number
  online: boolean
}

export interface AuthUser {
  username: string
  password_hash: string
  created_at: number
  last_login?: number
}

export interface AdminSettings {
  id: string
  last_clear_timestamp: number
}

export interface PrivateChannel {
  id: string
  participants: string[]
  created_at: string
  created_by: string
}

// Storage bucket name
export const STORAGE_BUCKET = "chat-files"

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Helper function to check if a file is an image
export function isImageFile(fileType: string): boolean {
  return fileType.startsWith("image/")
}

// Helper function to check if a file is a video
export function isVideoFile(fileType: string): boolean {
  return fileType.startsWith("video/")
}

// Helper function to check if a file is an audio
export function isAudioFile(fileType: string): boolean {
  return fileType.startsWith("audio/")
}

// Add a function to check if the database is initialized
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    // Try to query the auth_users table
    const { error } = await supabase.from(AUTH_USERS_TABLE).select("count").limit(1)

    // If there's an error about the table not existing, the database is not initialized
    if (error && error.message.includes("does not exist")) {
      return false
    }

    // No error or a different error means the table exists
    return true
  } catch (error) {
    console.error("Error checking if database is initialized:", error)
    return false
  }
}

