-- RLS + regulated-data hardening for SleekCRM.
-- App server uses SUPABASE_SERVICE_ROLE_KEY and must keep explicit user/business filters.
-- Browser clients use anon key and should not access tenant tables directly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS compliance_mode TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS regulated_data_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_retention_days INTEGER NOT NULL DEFAULT 2555;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_compliance_mode_check'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_compliance_mode_check
      CHECK (compliance_mode IN ('standard', 'hipaa', 'ferpa', 'hipaa_ferpa'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  row_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_compliance_mode ON businesses(compliance_mode);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_created ON audit_logs(business_id, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'businesses',
    'customers',
    'surveys',
    'survey_responses',
    'emails',
    'email_settings',
    'email_relationship_mappings',
    'email_auto_assignment_rules',
    'user_preferences',
    'analytics_assistant_messages',
    'analytics_assistant_chats',
    'crm_data_analyses',
    'crm_agent_tasks',
    'audit_logs'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    DROP POLICY IF EXISTS users_select_own ON users;
    DROP POLICY IF EXISTS users_update_own ON users;
    CREATE POLICY users_select_own ON users
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = id);
    CREATE POLICY users_update_own ON users
      FOR UPDATE TO authenticated
      USING ((SELECT auth.uid()) = id)
      WITH CHECK ((SELECT auth.uid()) = id);
  END IF;

  IF to_regclass('public.businesses') IS NOT NULL THEN
    DROP POLICY IF EXISTS businesses_owner_all ON businesses;
    CREATE POLICY businesses_owner_all ON businesses
      FOR ALL TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF to_regclass('public.customers') IS NOT NULL THEN
    DROP POLICY IF EXISTS customers_business_owner_all ON customers;
    CREATE POLICY customers_business_owner_all ON customers
      FOR ALL TO authenticated
      USING (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF to_regclass('public.surveys') IS NOT NULL THEN
    DROP POLICY IF EXISTS surveys_owner_all ON surveys;
    CREATE POLICY surveys_owner_all ON surveys
      FOR ALL TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF to_regclass('public.survey_responses') IS NOT NULL THEN
    DROP POLICY IF EXISTS survey_responses_business_owner_all ON survey_responses;
    CREATE POLICY survey_responses_business_owner_all ON survey_responses
      FOR ALL TO authenticated
      USING (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'emails',
    'email_settings',
    'email_relationship_mappings',
    'email_auto_assignment_rules',
    'user_preferences',
    'analytics_assistant_messages',
    'analytics_assistant_chats',
    'crm_data_analyses',
    'crm_agent_tasks'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_owner_all', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id)',
        table_name || '_owner_all',
        table_name
      );
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(user_id)', 'idx_' || table_name || '_user_id', table_name);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS audit_logs_owner_select ON audit_logs;
CREATE POLICY audit_logs_owner_select ON audit_logs
  FOR SELECT TO authenticated
  USING (
    actor_user_id = (SELECT auth.uid())
    OR business_id IN (
      SELECT id FROM businesses WHERE user_id = (SELECT auth.uid())
    )
  );
