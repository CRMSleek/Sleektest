-- Relationship-first CRM spine. Additive only: legacy customers remains as compatibility source.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS relationship_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, key)
);

CREATE TABLE IF NOT EXISTS crm_record_field_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES crm_field_definitions(id) ON DELETE CASCADE,
  target_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (record_id, field_definition_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_type TEXT,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('open', 'in_progress', 'done', 'blocked')),
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS relationship_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (record_id, tag_id)
);

CREATE TABLE IF NOT EXISTS external_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_configured',
  external_account_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  external_account_id UUID REFERENCES external_accounts(id) ON DELETE SET NULL,
  provider_key TEXT NOT NULL,
  external_object_type TEXT NOT NULL,
  external_object_id TEXT NOT NULL,
  external_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider_key, external_object_type, external_object_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  metadata JSONBc NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_number),
  CHECK (status IN ('draft', 'sent', 'paid', 'void', 'overdue'))
);

ALTER TABLE crm_ai_action_approvals
  ADD COLUMN IF NOT EXISTS risk_tier TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS target_table TEXT,
  ADD COLUMN IF NOT EXISTS target_id TEXT,
  ADD COLUMN IF NOT EXISTS source_activity_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS proposed_diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_activities_record_cursor ON activities(record_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(business_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_activities_business_cursor ON activities(business_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_field_links_record ON crm_record_field_links(record_id);
CREATE INDEX IF NOT EXISTS idx_field_links_target ON crm_record_field_links(target_record_id);
CREATE INDEX IF NOT EXISTS idx_external_links_record ON external_links(record_id);
CREATE INDEX IF NOT EXISTS idx_external_links_lookup ON external_links(business_id, provider_key, external_object_type, external_object_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_accounts_unique_provider
  ON external_accounts(business_id, provider_key, COALESCE(external_account_id, 'default'));
CREATE INDEX IF NOT EXISTS idx_tasks_record_due ON tasks(record_id, due_at);
CREATE INDEX IF NOT EXISTS idx_relationship_tags_record ON relationship_tags(record_id);
CREATE INDEX IF NOT EXISTS idx_invoices_record_status ON invoices(record_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_risk_status ON crm_ai_action_approvals(business_id, risk_tier, approval_status, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'relationship_types',
    'crm_record_field_links',
    'activities',
    'tasks',
    'tags',
    'relationship_tags',
    'external_accounts',
    'external_links',
    'invoices'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_business_owner_all', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid()))) WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())))',
      table_name || '_business_owner_all',
      table_name
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION sync_crm_record_relationship_links()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  field_row RECORD;
  raw_value TEXT;
BEGIN
  DELETE FROM crm_record_field_links WHERE record_id = NEW.id;

  FOR field_row IN
    SELECT id
    FROM crm_field_definitions
    WHERE business_id = NEW.business_id
      AND object_type_id = NEW.object_type_id
      AND field_type = 'relationship'
  LOOP
    raw_value := NEW.values ->> (SELECT api_name FROM crm_field_definitions WHERE id = field_row.id);
    IF raw_value IS NOT NULL AND raw_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      INSERT INTO crm_record_field_links (business_id, record_id, field_definition_id, target_record_id)
      SELECT NEW.business_id, NEW.id, field_row.id, raw_value::uuid
      WHERE EXISTS (
        SELECT 1 FROM crm_records target
        WHERE target.id = raw_value::uuid
          AND target.business_id = NEW.business_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_crm_record_relationship_links ON crm_records;
CREATE TRIGGER trg_sync_crm_record_relationship_links
AFTER INSERT OR UPDATE OF values ON crm_records
FOR EACH ROW EXECUTE FUNCTION sync_crm_record_relationship_links();
