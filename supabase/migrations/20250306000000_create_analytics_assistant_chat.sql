-- Analytics assistant: per-user chat history + rolling summary for long threads.
-- Run in Supabase SQL editor. If users.id is TEXT, change user_id column types to TEXT.

CREATE TABLE IF NOT EXISTS analytics_assistant_context (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rolling_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_assistant_messages_user_created
  ON analytics_assistant_messages(user_id, created_at);
