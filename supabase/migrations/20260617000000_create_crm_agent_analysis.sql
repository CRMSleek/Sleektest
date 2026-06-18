-- CRM agent analysis cache and task proposals.
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS crm_data_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID,
  analysis_type TEXT NOT NULL,
  description TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_data_analyses_lookup
  ON crm_data_analyses(user_id, business_id, analysis_type, source_hash, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_data_analyses_expiry
  ON crm_data_analyses(expires_at);

CREATE TABLE IF NOT EXISTS crm_agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  reasoning TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_agent_tasks_user_status
  ON crm_agent_tasks(user_id, status, created_at DESC);
