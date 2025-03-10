import { supabase, AUTH_USERS_TABLE } from "@/lib/supabase"

// Simple hash function for passwords
// Note: In a production app, you should use a proper password hashing library
export function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}

// Validate password requirements
export function isValidPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters" }
  }

  return { valid: true, message: "" }
}

// Check if a user exists
export async function checkUserExists(username: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from(AUTH_USERS_TABLE).select("username").eq("username", username).single()

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message.includes("does not exist")) {
        console.error("Database table does not exist:", error.message)
        throw new Error("Database tables are not set up. Please initialize the database first.")
      }

      if (error.code === "PGRST116") {
        // PGRST116 is the error code for "no rows found"
        return false
      }

      throw error
    }

    return !!data
  } catch (error) {
    console.error("Error in checkUserExists:", error)
    throw error
  }
}

// Create a new user
export async function createUser(username: string, passwordHash: string) {
  const now = Date.now()

  const { error } = await supabase.from(AUTH_USERS_TABLE).insert({
    username,
    password_hash: passwordHash,
    created_at: now,
    last_login: now,
  })

  if (error) throw error
}

// Verify user credentials
export async function verifyUser(username: string, passwordHash: string) {
  const { data, error } = await supabase
    .from(AUTH_USERS_TABLE)
    .select("*")
    .eq("username", username)
    .eq("password_hash", passwordHash)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    throw error
  }

  return data
}

// Update last login time
export async function updateLastLogin(username: string) {
  const { error } = await supabase.from(AUTH_USERS_TABLE).update({ last_login: Date.now() }).eq("username", username)

  if (error) throw error
}

