export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          username: string
          text: string
          timestamp: number
          fileURL: string | null
          fileName: string | null
          fileType: string | null
          fileSize: number | null
          channel: string
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          text: string
          timestamp: number
          fileURL?: string | null
          fileName?: string | null
          fileType?: string | null
          fileSize?: number | null
          channel: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          text?: string
          timestamp?: number
          fileURL?: string | null
          fileName?: string | null
          fileType?: string | null
          fileSize?: number | null
          channel?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          username: string
          last_seen: number
          online: boolean
          created_at: string
        }
        Insert: {
          username: string
          last_seen: number
          online: boolean
          created_at?: string
        }
        Update: {
          username?: string
          last_seen?: number
          online?: boolean
          created_at?: string
        }
      }
      auth_users: {
        Row: {
          username: string
          password_hash: string
          created_at: number
          last_login: number | null
        }
        Insert: {
          username: string
          password_hash: string
          created_at: number
          last_login?: number | null
        }
        Update: {
          username?: string
          password_hash?: string
          created_at?: number
          last_login?: number | null
        }
      }
      admin_settings: {
        Row: {
          id: string
          last_clear_timestamp: number
        }
        Insert: {
          id?: string
          last_clear_timestamp: number
        }
        Update: {
          id?: string
          last_clear_timestamp?: number
        }
      }
      private_channels: {
        Row: {
          id: string
          participants: string[]
          created_at: string
          created_by: string
        }
        Insert: {
          id: string
          participants: string[]
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          participants?: string[]
          created_at?: string
          created_by?: string
        }
      }
    }
  }
}

