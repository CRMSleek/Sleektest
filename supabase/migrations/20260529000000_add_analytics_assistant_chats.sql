-- Analytics assistant chats: one chat per insight run, with isolated summaries.
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS analytics_assistant_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Insight chat',
  rolling_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analytics_assistant_messages
  ADD COLUMN IF NOT EXISTS chat_id UUID;

CREATE INDEX IF NOT EXISTS idx_analytics_assistant_chats_user_updated
  ON analytics_assistant_chats(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_assistant_messages_chat_created
  ON analytics_assistant_messages(chat_id, created_at);

DO $$
DECLARE
  r RECORD;
  v_chat_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id FROM analytics_assistant_messages
  LOOP
    SELECT id INTO v_chat_id
    FROM analytics_assistant_chats
    WHERE user_id = r.user_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_chat_id IS NULL THEN
      INSERT INTO analytics_assistant_chats (user_id, title, rolling_summary, created_at, updated_at)
      VALUES (r.user_id, 'Legacy insight chat', '', NOW(), NOW())
      RETURNING id INTO v_chat_id;
    END IF;

    UPDATE analytics_assistant_messages
    SET chat_id = v_chat_id
    WHERE user_id = r.user_id
      AND chat_id IS NULL;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'analytics_assistant_messages'
      AND constraint_name = 'analytics_assistant_messages_chat_id_fkey'
  ) THEN
    ALTER TABLE analytics_assistant_messages
      ADD CONSTRAINT analytics_assistant_messages_chat_id_fkey
      FOREIGN KEY (chat_id) REFERENCES analytics_assistant_chats(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE analytics_assistant_messages
  ALTER COLUMN chat_id SET NOT NULL;
