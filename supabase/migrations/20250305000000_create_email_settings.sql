-- Email settings per user for SMTP/IMAP (send and receive email from dashboard).
-- Run this in the Supabase SQL editor if the table does not exist yet.

CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  app_password TEXT NOT NULL,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_secure BOOLEAN DEFAULT false,
  imap_host TEXT,
  imap_port INTEGER,
  imap_secure BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- If your users table uses TEXT id instead of UUID, use this instead:
-- CREATE TABLE IF NOT EXISTS email_settings (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   email TEXT NOT NULL,
--   app_password TEXT NOT NULL,
--   smtp_host TEXT,
--   smtp_port INTEGER,
--   smtp_secure BOOLEAN DEFAULT false,
--   imap_host TEXT,
--   imap_port INTEGER,
--   imap_secure BOOLEAN DEFAULT true,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(user_id)
-- );

CREATE INDEX IF NOT EXISTS idx_email_settings_user_id ON email_settings(user_id);
