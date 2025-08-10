# SleekCRM - Customer Relationship Management Platform

A modern, minimalistic CRM platform built with Next.js, Prisma, and PostgreSQL. SleekCRM allows businesses to create customizable surveys, manage customer profiles, and gain AI-driven insights from customer data.

## Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Survey Builder**: Create customizable surveys with various question types
- **Customer Management**: Automatically generate customer profiles from survey responses
- **Analytics Dashboard**: Real-time analytics with charts and metrics
- **AI Insights**: Generate intelligent insights from customer data using OpenAI
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Public Survey Links**: Share surveys with customers via unique URLs

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with HTTP-only cookies
- **AI**: OpenAI GPT-4 for insights generation
- **UI Components**: shadcn/ui, Radix UI
- **Charts**: Recharts
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key (optional, for AI insights)

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
DATABASE_URL="postgresql://username:password@localhost:5432/sleekcrm"
JWT_SECRET="your-super-secret-jwt-key"
OPENAI_API_KEY="your-openai-api-key"
NEXTAUTH_URL="http://localhost:3000"
\`\`\`

4. Set up the database:
\`\`\`bash
npx prisma generate
npx prisma db push
npm run db:seed
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
- `POST /api/analytics/insights` - Generate AI insights

## Database Schema

The application uses the following main entities:

- **User**: Business owners and staff members
- **Business**: Business profiles and settings
- **Customer**: Customer profiles and information
- **Survey**: Survey definitions and questions
- **SurveyResponse**: Customer responses to surveys

## Deployment


## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `OPENAI_API_KEY` | OpenAI API key for insights | No |
| `NEXTAUTH_URL` | Application URL | Yes |


## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.
