# SleekCRM - Customer Relationship Management Platform

A modern CRM platform built with Next.js, React, TypeScript, Supabase, and PostgreSQL. SleekCRM supports relationship management, surveys, email workflows, analytics, and an approval-gated AI agent. The current platform foundation adds configurable CRM objects, dynamic records, engagement timelines, automations, reports, fundraising/event scaffolds, integrations, governance controls, and compliance-readiness administration.

## Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Survey Builder**: Create customizable surveys with various question types
- **Customer Management**: Automatically generate customer profiles from survey responses
- **Analytics Dashboard**: Real-time analytics with charts and metrics
- **Interactive CRM Agent**: Ask CRM questions, choose next steps with buttons, and approve actions before execution
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Public Survey Links**: Share surveys with customers via unique URLs
- **Configurable CRM Objects**: Custom object types, custom fields, dynamic records, and record relationships
- **Unified Engagement Timeline**: Notes, email events, survey/form responses, donations, events, tasks, and AI actions share one model
- **Automation Scaffolding**: Rule triggers, approval-gated actions, and run logs
- **Reporting Foundation**: Saved reports, dashboards, widgets, filters, and export-ready audit/usage primitives
- **Nonprofit Modules**: Donations, donor history, campaigns, funds, pledges, receipt scaffolding, and mock payment provider flow
- **Event Modules**: Event records, attendee registrations, check-in status, and calendar sync scaffolding
- **Provider-Based Integrations**: Email, SMS, donations/payments, wealth research, surveys, calendar, accounting, analytics, and webhooks
- **Governance Controls**: Roles, permissions, audit logs, consent, suppression lists, usage tracking, plans, feature flags, and AI approval logs

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with Supabase server client
- **Database**: Supabase PostgreSQL
- **Authentication**: JWT with HTTP-only cookies
- **AI**: OpenRouter-compatible chat completions for the approval-gated CRM agent
- **UI Components**: shadcn/ui, Radix UI
- **Charts**: Recharts
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenRouter API key (optional, for the CRM agent)

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd sleek-crm
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` with your configuration:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
AUTH_SECRET="your-32-byte-auth-secret"
\`\`\`

Run `npm run check:env` before deploying.

4. Set up the database:
\`\`\`bash
# Apply files in supabase/migrations through Supabase CLI or SQL editor.
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000` to see the application.

### Demo Account

After seeding, you can log in with:
- Email: `demo@sleekcrm.com`
- Password: `demo123`

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── survey/           # Public survey pages
│   └── (auth)/           # Authentication pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── dashboard/        # Dashboard-specific components
├── lib/                  # Utility functions
│   ├── auth.ts           # Authentication utilities
│   ├── prisma.ts         # Database client
│   └── validations.ts    # Zod schemas
├── prisma/               # Database schema and migrations
└── scripts/              # Database scripts
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

### Surveys
- `GET /api/surveys` - List surveys
- `POST /api/surveys` - Create survey
- `GET /api/surveys/[id]` - Get survey details
- `PUT /api/surveys/[id]` - Update survey
- `DELETE /api/surveys/[id]` - Delete survey
- `GET /api/surveys/public/[id]` - Get public survey
- `POST /api/surveys/[id]/responses` - Submit survey response

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET|POST /api/analytics/assistant` - CRM agent chat, guided choices, approvals, and workspace context

### Configurable CRM Platform
- `GET /api/crm/platform` - Platform summary, metrics, object model, integrations, compliance-readiness note
- `GET /api/crm/object-types` / `POST /api/crm/object-types` - List or create CRM object types
- `GET /api/crm/object-types/[id]/fields` / `POST /api/crm/object-types/[id]/fields` - Manage custom fields
- `GET /api/crm/records` / `POST /api/crm/records` - Search, filter, paginate, and create dynamic records
- `GET /api/crm/records/[id]` / `PUT /api/crm/records/[id]` - Render and update record pages from schema
- `GET /api/crm/engagements` / `POST /api/crm/engagements` - Unified engagement timeline
- `GET /api/crm/duplicates` - Likely duplicate groups
- `GET /api/crm/integrations` / `POST /api/crm/integrations` - Provider configuration without exposing secrets
- `POST /api/crm/integrations/[id]/test` - Scaffolded integration test hook
- `GET|POST /api/crm/modules/[module]` - Module rows for automations, reports, dashboards, donations, campaigns, funds, pledges, events, registrations, templates, forms, approvals, suppressions, and usage
- `POST /api/crm/webhooks/[provider]` - Inbound webhook event capture

## Database Schema

The application uses the following main entities:

- **User**: Business owners and staff members
- **Business**: Business profiles and settings
- **Customer**: Customer profiles and information
- **Survey**: Survey definitions and questions
- **SurveyResponse**: Customer responses to surveys
- **CRMObjectType / CRMFieldDefinition**: Configurable schema for dynamic CRM records
- **CRMRecord / CRMRecordRelationship**: Dynamic records and typed relationships
- **CRMEngagementEvent**: Unified timeline for communications, notes, tasks, forms, donations, events, and AI actions
- **CRMAutomationRule / CRMAutomationRun**: Rule definitions and execution logs
- **CRMReport / CRMDashboard / CRMDashboardWidget**: Saved reporting and dashboard primitives
- **CRMDonation / CRMCampaign / CRMFund / CRMPledge**: Optional nonprofit and fundraising module tables
- **CRMEvent / CRMEventRegistration**: Optional event planning module tables
- **CRMIntegrationConfig / CRMWebhookEvent**: Provider abstraction and inbound event scaffolding
- **CRMRole / CRMUserRole / CRMConsentPreference / CRMSuppressionList**: Governance, RBAC, consent, and suppression foundations
- **CRMPlan / CRMUsageEvent**: Pricing, feature flag, and usage-tracking foundations
- **CRMAIActionApproval**: Approval log for risky or externally visible AI actions

## Deployment


## Environment Variables

For Vercel, set these in Project Settings -> Environment Variables for Production and Preview, then redeploy. Public browser variables must use the `NEXT_PUBLIC_` prefix. Server secrets must not use that prefix.

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, safe for browser use | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key, server-side only | Yes |
| `AUTH_SECRET` | Preferred production auth secret for Vercel/Auth.js | Yes, unless `NEXTAUTH_SECRET` or `JWT_SECRET` is set |
| `NEXTAUTH_SECRET` | Supported fallback auth secret | Yes, unless `AUTH_SECRET` or `JWT_SECRET` is set |
| `JWT_SECRET` | Legacy fallback for existing custom auth cookies | Yes, unless `AUTH_SECRET` or `NEXTAUTH_SECRET` is set |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth client for sign-in/Gmail access | No |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth secret, server-side only | No |
| `OPENROUTER_KEY` | OpenRouter key for the CRM agent console | No |
| `OPENROUTER_MODEL` | OpenRouter model name for CRM agent console | No |
| `EMAIL_ADDRESS` | Optional contact form sender account | No |
| `APP_PASSWORD` | Optional contact form sender app password | No |
| `DEFAULT_IMAP_HOST` | Optional default inbox host override | No |
| `DEFAULT_IMAP_PORT` | Optional default inbox port override | No |
| `COMPLIANCE_ENCRYPTION_KEY` | Optional 32-byte or base64-encoded 32-byte secret for stored integration secrets | No |

Vercel notes:
- Changing environment variables affects only new deployments. Redeploy after edits.
- `NEXT_PUBLIC_*` values are included in browser bundles at build time, so do not store secrets there.
- `SUPABASE_SERVICE_ROLE_KEY`, auth secrets, OAuth secrets, email passwords, and integration credentials must stay server-side.
- Paste Supabase keys as raw values in Vercel, without surrounding quotes. `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be the `anon` key, and `SUPABASE_SERVICE_ROLE_KEY` must be the `service_role` key.
- Google OAuth variables must be set as a pair. If both are absent, password login still works and Google sign-in stays disabled.

## Integration Status

SleekCRM uses provider abstractions. Current email SMTP/IMAP settings are active. SMS, donation/payment processing, wealth research, external survey sync, calendar sync, accounting sync, analytics destinations, and inbound webhooks are scaffolded until provider credentials, webhook verification, and production policies are configured. Secrets stay server-side and are not stored in browser-visible configuration.

## Compliance Note

HIPAA-readiness and FERPA-readiness controls are administrative foundations only. Legal compliance requires deployment controls, contracts, policies, training, and operating procedures outside this codebase.


## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.
