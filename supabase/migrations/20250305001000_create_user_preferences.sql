CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT,
  email_notifications BOOLEAN DEFAULT true,
  survey_responses BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT false,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- If users.id is TEXT in your project, use TEXT here instead of UUID.
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
