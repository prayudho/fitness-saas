# FitnessPlace SaaS

Multi-tenant fitness gym management SaaS. Manage members, classes, personal trainers, check-ins, and billing across multiple gym brands — all from one platform.

## Features

- **Multi-tenancy** — subdomain-based brand isolation (brand.fitnessplace.com)
- **Members** — profiles, memberships, freeze/unfreeze, QR cards
- **Packages** — flexible package builder with promo codes
- **Classes** — weekly schedule, booking, waitlist, attendance
- **Personal Trainers** — session booking, availability, commissions
- **Check-in** — QR scanner, manual search, walk-in day pass, real-time occupancy
- **Billing** — invoices, Midtrans payment gateway, PDF download
- **Reports** — KPI dashboard, revenue, member analytics, class performance
- **Super Admin** — platform-wide brand management, onboarding wizard, impersonation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Auth & DB | Supabase |
| UI | shadcn/ui + Tailwind CSS |
| State | TanStack Query v5 + Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| PDF | @react-pdf/renderer |
| Payments | Midtrans |
| Email | Resend |

## Quick Start

```bash
git clone https://github.com/prayudho/fitness-saas
cd fitness-saas
npm install
cp .env.local.example .env.local
# Fill in your Supabase and other credentials
npm run dev
```

## Environment Variables

See `.env.local.example` for all required variables.

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the SQL migrations in `supabase/migrations/`
4. Create Storage buckets: `avatars` (public), `brand-assets` (public)
5. Enable Google OAuth in Authentication > Providers
6. Set up RLS policies (see `supabase/policies.sql`)

## Edge Functions (Cron Jobs)

```bash
# Deploy functions
supabase functions deploy membership-expiry-checker
supabase functions deploy auto-renew-memberships

# Set secrets
supabase secrets set CRON_SECRET=your-secret RESEND_API_KEY=your-key

# Schedule via Supabase Dashboard > Edge Functions > Schedule
# membership-expiry-checker: 0 8 * * * (daily at 8am UTC)
# auto-renew-memberships: 0 6 * * * (daily at 6am UTC)
```

## Superadmin Setup

After first deployment, set your account as superadmin via Supabase Dashboard:
1. Go to Authentication > Users
2. Find your user → Edit
3. Set `app_metadata`: `{"role": "superadmin"}`
4. Visit `/superadmin/dashboard`

## Deployment

Deploy to Vercel:
```bash
vercel --prod
```
Add all environment variables in Vercel Project Settings > Environment Variables.
