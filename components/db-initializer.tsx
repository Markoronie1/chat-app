"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase, isSupabaseInitialized } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export function DbInitializer({ onComplete }: { onComplete: () => void }) {
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const initializeDatabase = async () => {
    if (!isSupabaseInitialized()) {
      setError("Supabase is not initialized. Please check your environment variables.")
      return
    }

    setIsInitializing(true)
    setError(null)
    setStatus("Checking database tables...")

    try {
      // Check if auth_users table exists
      const { error: checkError } = await supabase.from("auth_users").select("count").limit(1)

      if (checkError && checkError.message.includes("does not exist")) {
        // Tables don't exist, create them
        setStatus("Creating database tables...")

        // Create auth_users table
        const { error: authUsersError } = await supabase.rpc("create_auth_users_table")
        if (authUsersError) {
          // Try direct SQL if RPC fails
          const { error: sqlError } = await supabase.query(`
            CREATE TABLE IF NOT EXISTS auth_users (
              username TEXT PRIMARY KEY,
              password_hash TEXT NOT NULL,
              created_at BIGINT NOT NULL,
              last_login BIGINT,
              created_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
            CREATE POLICY "Allow public read access" ON auth_users FOR SELECT USING (true);
            CREATE POLICY "Allow public insert access" ON auth_users FOR INSERT WITH CHECK (true);
            CREATE POLICY "Allow public update access" ON auth_users FOR UPDATE USING (true);
          `)

          if (sqlError) {
            throw new Error(`Failed to create auth_users table: ${sqlError.message}`)
          }
        }

        // Create users table
        setStatus("Creating users table...")
        const { error: usersError } = await supabase.query(`
          CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            last_seen BIGINT NOT NULL,
            online BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE users ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);
          CREATE POLICY "Allow public insert access" ON users FOR INSERT WITH CHECK (true);
          CREATE POLICY "Allow public update access" ON users FOR UPDATE USING (true);
        `)

        if (usersError) {
          throw new Error(`Failed to create users table: ${usersError.message}`)
        }

        // Create messages table
        setStatus("Creating messages table...")
        const { error: messagesError } = await supabase.query(`
          CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp BIGINT NOT NULL,
            fileURL TEXT,
            fileName TEXT,
            fileType TEXT,
            fileSize BIGINT,
            channel TEXT NOT NULL DEFAULT 'general',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Allow public read access" ON messages FOR SELECT USING (true);
          CREATE POLICY "Allow public insert access" ON messages FOR INSERT WITH CHECK (true);
        `)

        if (messagesError) {
          throw new Error(`Failed to create messages table: ${messagesError.message}`)
        }

        // Create admin_settings table
        setStatus("Creating admin settings table...")
        const { error: adminSettingsError } = await supabase.query(`
          CREATE TABLE IF NOT EXISTS admin_settings (
            id TEXT PRIMARY KEY,
            last_clear_timestamp BIGINT NOT NULL DEFAULT 0
          );
          ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Allow public read access" ON admin_settings FOR SELECT USING (true);
          CREATE POLICY "Allow public insert access" ON admin_settings FOR INSERT WITH CHECK (true);
          CREATE POLICY "Allow public update access" ON admin_settings FOR UPDATE USING (true);
          
          INSERT INTO admin_settings (id, last_clear_timestamp)
          VALUES ('settings', 0)
          ON CONFLICT (id) DO NOTHING;
        `)

        if (adminSettingsError) {
          throw new Error(`Failed to create admin_settings table: ${adminSettingsError.message}`)
        }

        // Create private_channels table
        setStatus("Creating private channels table...")
        const { error: privateChannelsError } = await supabase.query(`
          CREATE TABLE IF NOT EXISTS private_channels (
            id TEXT PRIMARY KEY,
            participants TEXT[] NOT NULL,
            created_by TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE private_channels ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Allow public read access" ON private_channels FOR SELECT USING (true);
          CREATE POLICY "Allow public insert access" ON private_channels FOR INSERT WITH CHECK (true);
        `)

        if (privateChannelsError) {
          throw new Error(`Failed to create private_channels table: ${privateChannelsError.message}`)
        }

        // Create realtime publication
        setStatus("Setting up realtime functionality...")
        const { error: realtimeError } = await supabase.query(`
          DROP PUBLICATION IF EXISTS supabase_realtime;
          CREATE PUBLICATION supabase_realtime FOR TABLE messages, users, auth_users, admin_settings, private_channels;
        `)

        if (realtimeError) {
          console.warn("Failed to set up realtime publication:", realtimeError)
          // Continue anyway as this might require higher privileges
        }

        setStatus("Database initialization complete!")
      } else {
        // Tables already exist
        setStatus("Database tables already exist.")
      }

      // Create storage bucket if it doesn't exist
      setStatus("Setting up storage...")
      try {
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket("chat-files")

        if (bucketError && bucketError.message.includes("does not exist")) {
          const { error: createBucketError } = await supabase.storage.createBucket("chat-files", {
            public: true,
          })

          if (createBucketError) {
            console.warn("Failed to create storage bucket:", createBucketError)
            // Continue anyway as this might require higher privileges
          } else {
            setStatus("Storage bucket created successfully.")
          }
        } else {
          setStatus("Storage bucket already exists.")
        }
      } catch (storageError) {
        console.warn("Error checking/creating storage bucket:", storageError)
        // Continue anyway as storage might be configured differently
      }

      // All done!
      setTimeout(() => {
        onComplete()
      }, 1000)
    } catch (error) {
      console.error("Database initialization error:", error)
      setError(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Database Setup Required</CardTitle>
          <CardDescription>
            The chat application needs to set up its database tables in your Supabase project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">{status}</div>}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              <p className="font-medium">Error</p>
              <p>{error}</p>
              <p className="mt-2">
                You may need to manually run the SQL setup script in your Supabase SQL editor. Check the console for
                more details.
              </p>
            </div>
          )}
          <div className="text-sm space-y-2">
            <p>This will:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create necessary database tables</li>
              <li>Set up row-level security policies</li>
              <li>Configure realtime subscriptions</li>
              <li>Create a storage bucket for file uploads</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={initializeDatabase} disabled={isInitializing} className="w-full">
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing Database...
              </>
            ) : (
              "Initialize Database"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

