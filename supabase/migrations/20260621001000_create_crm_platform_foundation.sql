-- Configurable CRM platform foundation.
-- Additive migration: existing customers, surveys, emails, analytics, and agent tables stay intact.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS account_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS usage_limits JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS crm_object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  api_name TEXT NOT NULL,
  label TEXT NOT NULL,
  plural_label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT,
  module TEXT NOT NULL DEFAULT 'records',
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_field TEXT NOT NULL DEFAULT 'name',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, api_name)
);

CREATE TABLE IF NOT EXISTS crm_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  object_type_id UUID NOT NULL REFERENCES crm_object_types(id) ON DELETE CASCADE,
  api_name TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_unique BOOLEAN NOT NULL DEFAULT false,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  relationship_object_type_id UUID REFERENCES crm_object_types(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  help_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (object_type_id, api_name),
  CHECK (field_type IN (
    'text',
    'number',
    'date',
    'boolean',
    'select',
    'multi_select',
    'email',
    'phone',
    'url',
    'currency',
    'long_text',
    'relationship'
  ))
);

CREATE TABLE IF NOT EXISTS crm_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  object_type_id UUID NOT NULL REFERENCES crm_object_types(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source_table TEXT,
  source_id TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  values JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  duplicate_key TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_record_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  to_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'related',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_record_id, to_record_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS crm_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_id UUID REFERENCES crm_records(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_table TEXT,
  source_id TEXT,
  status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_duplicate_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  object_type_id UUID REFERENCES crm_object_types(id) ON DELETE CASCADE,
  match_key TEXT NOT NULL,
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  record_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  suggested_primary_record_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (channel IN ('email', 'sms', 'receipt', 'event'))
);

CREATE TABLE IF NOT EXISTS crm_public_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  object_type_id UUID REFERENCES crm_object_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'record',
  custom_domain TEXT,
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  automation_rule_id UUID REFERENCES crm_automation_rules(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  trigger_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions_run JSONB NOT NULL DEFAULT '[]'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  report_type TEXT NOT NULL DEFAULT 'table',
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES crm_dashboards(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  title TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  campaign_type TEXT NOT NULL DEFAULT 'fundraising',
  goal_amount NUMERIC(12,2),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  donor_record_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE SET NULL,
  fund_id UUID REFERENCES crm_funds(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_provider TEXT NOT NULL DEFAULT 'mock',
  payment_status TEXT NOT NULL DEFAULT 'recorded',
  receipt_status TEXT NOT NULL DEFAULT 'not_sent',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  donor_record_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES crm_campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  external_calendar_provider TEXT,
  external_calendar_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES crm_events(id) ON DELETE CASCADE,
  record_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  attendee_name TEXT NOT NULL DEFAULT '',
  attendee_email TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  checked_in_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_configured',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_ref TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider_key)
);

CREATE TABLE IF NOT EXISTS crm_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  provider_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS crm_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES crm_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS crm_consent_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  record_id UUID REFERENCES crm_records(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  source TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (channel IN ('email', 'sms', 'phone', 'mail'))
);

CREATE TABLE IF NOT EXISTS crm_suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  value TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, channel, value)
);

CREATE TABLE IF NOT EXISTS crm_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metric TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_ai_action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  reasoning TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  execution_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_object_types_business_module ON crm_object_types(business_id, module, is_active);
CREATE INDEX IF NOT EXISTS idx_crm_fields_object_position ON crm_field_definitions(object_type_id, position);
CREATE INDEX IF NOT EXISTS idx_crm_records_business_object_updated ON crm_records(business_id, object_type_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_records_duplicate_key ON crm_records(business_id, duplicate_key);
CREATE INDEX IF NOT EXISTS idx_crm_records_values_gin ON crm_records USING gin(values);
CREATE INDEX IF NOT EXISTS idx_crm_relationships_from ON crm_record_relationships(from_record_id);
CREATE INDEX IF NOT EXISTS idx_crm_relationships_to ON crm_record_relationships(to_record_id);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_record_time ON crm_engagement_events(record_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_engagement_business_time ON crm_engagement_events(business_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_automation_runs_business_created ON crm_automation_runs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_reports_business_updated ON crm_reports(business_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_donations_business_date ON crm_donations(business_id, donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_events_business_start ON crm_events(business_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_integrations_business_type ON crm_integration_configs(business_id, provider_type);
CREATE INDEX IF NOT EXISTS idx_crm_webhook_events_provider_received ON crm_webhook_events(provider_key, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_usage_events_business_metric ON crm_usage_events(business_id, metric, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'crm_object_types',
    'crm_field_definitions',
    'crm_records',
    'crm_record_relationships',
    'crm_engagement_events',
    'crm_duplicate_sets',
    'crm_communication_templates',
    'crm_public_forms',
    'crm_automation_rules',
    'crm_automation_runs',
    'crm_reports',
    'crm_dashboards',
    'crm_dashboard_widgets',
    'crm_campaigns',
    'crm_funds',
    'crm_donations',
    'crm_pledges',
    'crm_events',
    'crm_event_registrations',
    'crm_integration_configs',
    'crm_webhook_events',
    'crm_roles',
    'crm_user_roles',
    'crm_consent_preferences',
    'crm_suppression_list',
    'crm_usage_events',
    'crm_ai_action_approvals'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_business_owner_all', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid()))) WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())))',
        table_name || '_business_owner_all',
        table_name
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE crm_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_plans_authenticated_select ON crm_plans;
CREATE POLICY crm_plans_authenticated_select ON crm_plans
  FOR SELECT TO authenticated
  USING (is_active = true);

INSERT INTO crm_plans (key, name, limits, features)
VALUES
  ('free', 'Free', '{"records":1000,"users":2,"storageMb":250,"apiCallsPerMonth":1000}'::jsonb, '{"customObjects":true,"fundraising":false,"automations":false}'::jsonb),
  ('team', 'Team', '{"records":25000,"users":25,"storageMb":10240,"apiCallsPerMonth":50000}'::jsonb, '{"customObjects":true,"fundraising":true,"automations":true}'::jsonb),
  ('nonprofit', 'Nonprofit', '{"records":50000,"users":50,"storageMb":20480,"apiCallsPerMonth":100000}'::jsonb, '{"customObjects":true,"fundraising":true,"events":true,"receipts":true}'::jsonb),
  ('enterprise', 'Enterprise', '{"records":250000,"users":500,"storageMb":102400,"apiCallsPerMonth":1000000}'::jsonb, '{"customObjects":true,"fundraising":true,"automations":true,"complianceReadiness":true,"advancedIntegrations":true}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features,
    is_active = true;

CREATE OR REPLACE FUNCTION ensure_default_crm_platform(seed_business_id UUID, seed_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  people_id UUID;
  org_id UUID;
  donation_id UUID;
  campaign_id UUID;
  event_id UUID;
  task_id UUID;
BEGIN
  INSERT INTO crm_object_types (business_id, api_name, label, plural_label, description, icon, module, is_system, display_field)
  VALUES
    (seed_business_id, 'people', 'Person', 'People', 'Default person/contact object mapped from existing relationships.', 'users', 'records', true, 'name'),
    (seed_business_id, 'organizations', 'Organization', 'Organizations', 'Companies, nonprofits, vendors, partners, and household entities.', 'building', 'records', true, 'name'),
    (seed_business_id, 'donations', 'Donation', 'Donations', 'Giving records for fundraising modules.', 'heart', 'fundraising', true, 'amount'),
    (seed_business_id, 'campaigns', 'Campaign', 'Campaigns', 'Fundraising, outreach, and engagement campaigns.', 'megaphone', 'fundraising', true, 'name'),
    (seed_business_id, 'events', 'Event', 'Events', 'Internal events and external registration programs.', 'calendar', 'events', true, 'name'),
    (seed_business_id, 'tasks', 'Task', 'Tasks', 'Tasks, reminders, and scheduled work.', 'check-square', 'automations', true, 'title')
  ON CONFLICT (business_id, api_name) DO NOTHING;

  SELECT id INTO people_id FROM crm_object_types WHERE business_id = seed_business_id AND api_name = 'people';
  SELECT id INTO org_id FROM crm_object_types WHERE business_id = seed_business_id AND api_name = 'organizations';
  SELECT id INTO donation_id FROM crm_object_types WHERE business_id = seed_business_id AND api_name = 'donations';
  SELECT id INTO campaign_id FROM crm_object_types WHERE business_id = seed_business_id AND api_name = 'campaigns';
  SELECT id INTO event_id FROM crm_object_types WHERE business_id = seed_business_id AND api_name = 'events';
  SELECT id INTO task_id FROM crm_object_types WHERE business_id = seed_business_id AND api_name = 'tasks';

  INSERT INTO crm_field_definitions (business_id, object_type_id, api_name, label, field_type, is_system, is_required, position, options)
  VALUES
    (seed_business_id, people_id, 'name', 'Name', 'text', true, true, 10, '[]'::jsonb),
    (seed_business_id, people_id, 'email', 'Email', 'email', true, false, 20, '[]'::jsonb),
    (seed_business_id, people_id, 'phone', 'Phone', 'phone', true, false, 30, '[]'::jsonb),
    (seed_business_id, people_id, 'relationship_type', 'Relationship Type', 'select', true, false, 40, '["customer","lead","partner","vendor","supplier","contractor","affiliate","donor","volunteer","other"]'::jsonb),
    (seed_business_id, people_id, 'sms_consent', 'SMS Consent', 'select', true, false, 50, '["unknown","opted_in","opted_out"]'::jsonb),
    (seed_business_id, people_id, 'email_consent', 'Email Consent', 'select', true, false, 60, '["unknown","opted_in","opted_out"]'::jsonb),
    (seed_business_id, people_id, 'notes', 'Notes', 'long_text', true, false, 70, '[]'::jsonb),
    (seed_business_id, org_id, 'name', 'Name', 'text', true, true, 10, '[]'::jsonb),
    (seed_business_id, org_id, 'website', 'Website', 'url', true, false, 20, '[]'::jsonb),
    (seed_business_id, donation_id, 'amount', 'Amount', 'currency', true, true, 10, '[]'::jsonb),
    (seed_business_id, donation_id, 'donation_date', 'Donation Date', 'date', true, true, 20, '[]'::jsonb),
    (seed_business_id, campaign_id, 'name', 'Name', 'text', true, true, 10, '[]'::jsonb),
    (seed_business_id, campaign_id, 'goal_amount', 'Goal Amount', 'currency', true, false, 20, '[]'::jsonb),
    (seed_business_id, event_id, 'name', 'Name', 'text', true, true, 10, '[]'::jsonb),
    (seed_business_id, event_id, 'starts_at', 'Starts At', 'date', true, false, 20, '[]'::jsonb),
    (seed_business_id, task_id, 'title', 'Title', 'text', true, true, 10, '[]'::jsonb),
    (seed_business_id, task_id, 'due_date', 'Due Date', 'date', true, false, 20, '[]'::jsonb),
    (seed_business_id, task_id, 'status', 'Status', 'select', true, false, 30, '["open","in_progress","done","blocked"]'::jsonb)
  ON CONFLICT (object_type_id, api_name) DO NOTHING;

  INSERT INTO crm_records (business_id, object_type_id, owner_user_id, source_table, source_id, display_name, values, duplicate_key, created_by, updated_by, created_at, updated_at)
  SELECT
    c.business_id,
    people_id,
    seed_user_id,
    'customers',
    c.id::text,
    COALESCE(NULLIF(c.name, ''), NULLIF(c.email, ''), 'Unnamed person'),
    jsonb_strip_nulls(jsonb_build_object(
      'name', c.name,
      'email', c.email,
      'phone', c.phone,
      'location', c.location,
      'age', c.age,
      'notes', c.notes,
      'relationship_type', COALESCE(c.relationship_type, 'customer'),
      'legacy_customer_id', c.id
    )),
    lower(COALESCE(NULLIF(c.email, ''), regexp_replace(COALESCE(c.name, ''), '\s+', '', 'g'))),
    seed_user_id,
    seed_user_id,
    c.created_at,
    c.updated_at
  FROM customers c
  WHERE c.business_id = seed_business_id
    AND NOT EXISTS (
      SELECT 1
      FROM crm_records r
      WHERE r.business_id = c.business_id
        AND r.source_table = 'customers'
        AND r.source_id = c.id::text
    );

  INSERT INTO crm_roles (business_id, name, permissions, is_system)
  VALUES
    (seed_business_id, 'Owner', '{"admin":true,"records":"write","automations":"approve","integrations":"configure","exports":"allow"}'::jsonb, true),
    (seed_business_id, 'Member', '{"records":"write","automations":"draft","integrations":"read","exports":"request"}'::jsonb, true),
    (seed_business_id, 'Viewer', '{"records":"read","automations":"read","integrations":"read","exports":"none"}'::jsonb, true)
  ON CONFLICT (business_id, name) DO NOTHING;
END;
$$;
