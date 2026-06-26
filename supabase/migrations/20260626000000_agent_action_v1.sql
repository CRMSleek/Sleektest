-- Agent-action V1: durable proposals and donor research request shell.

ALTER TABLE crm_ai_action_approvals
  ADD COLUMN IF NOT EXISTS proposal_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_ai_action_approvals_proposal
  ON crm_ai_action_approvals(business_id, user_id, proposal_id)
  WHERE proposal_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_donor_research_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  donor_record_id UUID REFERENCES crm_records(id) ON DELETE SET NULL,
  provider_key TEXT NOT NULL DEFAULT 'donorsearch',
  status TEXT NOT NULL DEFAULT 'review_requested',
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_donor_research_requests_business_created
  ON crm_donor_research_requests(business_id, created_at DESC);

ALTER TABLE crm_donor_research_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_donor_research_requests_business_owner_all ON crm_donor_research_requests;
CREATE POLICY crm_donor_research_requests_business_owner_all ON crm_donor_research_requests
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
