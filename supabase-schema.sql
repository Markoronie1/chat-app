-- Create tables for the chat application

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Users table for presence
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  last_seen BIGINT NOT NULL,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auth users table
CREATE TABLE IF NOT EXISTS auth_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  last_login BIGINT,
  created_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY,
  last_clear_timestamp BIGINT NOT NULL DEFAULT 0
);

-- Private channels table
CREATE TABLE IF NOT EXISTS private_channels (
  id TEXT PRIMARY KEY,
  participants TEXT[] NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_channels ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for simplicity)
-- In a production app, you would want more restrictive policies
CREATE POLICY "Allow public read access" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON users FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON auth_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON auth_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON auth_users FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON admin_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON admin_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON admin_settings FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON private_channels FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON private_channels FOR INSERT WITH CHECK (true);

-- Create realtime publication for all tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE messages, users, auth_users, admin_settings, private_channels;

-- Insert default admin settings
INSERT INTO admin_settings (id, last_clear_timestamp)
VALUES ('settings', 0)
ON CONFLICT (id) DO NOTHING;

