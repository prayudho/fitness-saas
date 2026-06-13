# CLAUDE.md — FitnessPlace SaaS

This file gives Claude Code persistent context about the FitnessPlace SaaS project.
Read this before writing any code, generating any file, or making architectural decisions.

---

## Project overview

**FitnessPlace** is a multi-tenant SaaS platform for managing fitness businesses.
It allows multiple fitness brands to operate on one platform, each with isolated data.
Members, trainers, front desk staff, and brand admins all have separate portals.
A super-admin (platform owner) can see and manage all brands from one dashboard.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Database & Auth | Supabase (Postgres + RLS + Auth + Storage + Realtime) |
| Styling | Tailwind CSS + shadcn/ui |
| Client state | Zustand |
| Server state | TanStack Query (React Query v5) |
| Forms & validation | React Hook Form + Zod |
| Charts | Recharts |
| PDF generation | @react-pdf/renderer |
| QR codes | qrcode (npm) |
| Payments | Midtrans (primary, Indonesia), Stripe (future) |
| Email | Resend (via Supabase Edge Functions) |
| Deployment | Vercel |
| i18n | next-intl (prepared, not yet implemented) |

---

## Multi-tenancy model

- Each fitness brand has a unique `slug` and gets a subdomain: `brandslug.fitnessplace.com`
- Tenant is resolved in `middleware.ts` from the subdomain and injected into request headers as `x-brand-id`
- All database tables have a `brand_id` column (UUID, FK to `brands.id`)
- Supabase Row Level Security (RLS) isolates all data by `brand_id` using the helper function `get_my_brand_id()`
- The super-admin role uses the Supabase service role key to bypass RLS

---

## User roles & route groups

| Role | Route group | Access |
|---|---|---|
| `superadmin` | `/app/(superadmin)` | All brands, platform settings, billing |
| `admin` | `/app/(admin)` | Own brand: members, packages, trainers, classes, reports |
| `staff` | `/app/(staff)` | Check-in, member search, walk-in, manual payment entry |
| `trainer` | `/app/(trainer)` | Own schedule, sessions, clients, availability, commission |
| `member` | `/app/(member)` | Dashboard, QR card, class booking, PT booking, invoices |

After login, redirect based on role:
- `superadmin` → `/superadmin`
- `admin` → `/admin`
- `staff` → `/staff/checkin`
- `trainer` → `/trainer`
- `member` → `/member`

---

## Folder structure

```
fitnessplace-saas/
├── app/
│   ├── (auth)/              # login, register, forgot-password, reset-password
│   ├── (superadmin)/        # platform owner dashboard
│   ├── (admin)/             # brand admin: members, packages, trainers, classes, billing, reports, settings
│   ├── (staff)/             # front desk: check-in, walk-in
│   ├── (trainer)/           # trainer portal
│   ├── (member)/            # member portal
│   └── api/                 # API route handlers (webhooks, etc.)
├── components/
│   ├── ui/                  # shadcn/ui base components (do not edit manually)
│   └── shared/              # shared business components (DataTable, EmptyState, StatusBadge, etc.)
├── lib/
│   ├── supabase/            # supabase browser client, server client, middleware client
│   ├── actions/             # Next.js server actions, one file per module
│   ├── validations/         # Zod schemas, one file per module
│   ├── hooks/               # custom React hooks
│   └── utils/               # shared helpers (formatCurrency, formatDate, cn, etc.)
├── types/
│   ├── database.ts          # auto-generated Supabase types (regenerate with: supabase gen types)
│   └── index.ts             # app-level TypeScript types
├── supabase/
│   ├── migrations/          # SQL migration files
│   └── seed.sql             # demo data seed
└── middleware.ts            # tenant resolution + route protection
```

---

## Database tables (summary)

### Platform
- `brands` — one row per fitness brand
- `profiles` — extends `auth.users`, holds role + brand_id

### Membership
- `membership_packages` — package templates per brand
  - `package_category`: `'gym_access'` | `'pt_sessions'` | `'bundled'` — determines access behavior
  - `gym_access_days` — number of calendar days of gym entry granted
  - `pt_session_credits` — number of PT sessions included (null for gym_access)
  - `pt_session_expiry_days` — days before PT credits expire from activation (null for gym_access)
- `memberships` — active member subscriptions
  - `gym_access_expires_at` — independent gym entry expiry date
  - `pt_sessions_expires_at` — independent PT credit expiry date
  - `gym_access_status`: `'active'` | `'expired'`
  - `pt_sessions_status`: `'active'` | `'exhausted'` | `'expired'`
- `membership_freezes` — freeze records
- `membership_reminders_sent` — dedup log; unique on `(membership_id, reminder_type, reminder_day)`
  - `reminder_type`: `'gym_expiry'` | `'pt_expiry'` | `'pt_low_sessions'`

### Payments
- `invoices` — all payment records (gateway + manual)
- `promo_codes` — discount codes per brand

### Personal trainer
- `trainers` — trainer profile + commission config
- `trainer_availability` — weekly recurring slots
- `trainer_sessions` — booked sessions
  - `pt_assignment_id` — FK to `pt_assignments.id` (nullable)
  - `session_commission_amount` — fixed amount earned by trainer for this session
  - `commission_status`: `'pending'` | `'approved'` | `'paid'` | `'cancelled'`
- `pt_assignments` — links a trainer to a member's PT membership
  - `status`: `'active'` | `'grace_period'` | `'released'` | `'reassigned'`
  - `grace_started_at` — when grace period began (auto-started by edge function)
  - `sales_commission_claimed` — whether a sales commission payout was created
  - Partial unique index: only one `active`/`grace_period` assignment per `(member_id, membership_id)` at a time
- `pt_commission_payouts` — all commission payout records
  - `payout_type`: `'session'` | `'sales'`
  - `status`: `'pending'` | `'approved'` | `'paid'`
  - Session commission: created when a trainer session is marked `completed`
  - Sales commission: created when a PT assignment is first created

### Classes
- `class_types` — categories (yoga, HIIT, pilates, etc.)
- `classes` — scheduled class instances
- `class_bookings` — member bookings + waitlist

### Access
- `checkins` — every entry scan event
  - `staff_override`: `true` = allowed by staff, `false` = denied by staff, `null` = normal check-in
  - `warning_message` — reason text logged when `staff_override` is non-null

### Views (Postgres)
- `v_active_members`
- `v_daily_revenue`
- `v_class_attendance_summary`
- `v_trainer_commission_summary`
- `v_active_memberships` — active memberships with computed `days_until_gym_expiry`, `days_until_pt_expiry`, `is_gym_expiring_soon`, `is_pt_sessions_low`
- `v_expiry_report` — full expiry report with member info, joined package details, all computed flags

---

## Key conventions

### Server actions
- All mutations go in `/lib/actions/` as Next.js server actions
- File naming: `membership.actions.ts`, `trainer.actions.ts`, `class.actions.ts`, etc.
- Every action must validate input with Zod before touching Supabase
- Return type: `{ data: T | null, error: string | null }`

### Data fetching
- Use TanStack Query for all client-side data fetching
- Query keys follow the pattern: `['module', 'entity', id?, filters?]`
  - Example: `['members', 'list', { brandId, status: 'active' }]`
- Use server components for initial page data, TanStack Query for subsequent interactions

### Forms
- All forms use React Hook Form with a Zod resolver
- Zod schemas live in `/lib/validations/` matching the module name
- Show inline field errors (never alert/toast for validation errors)
- Disable submit button and show spinner during submission

### Data tables
- Use a shared `<DataTable>` component built on TanStack Table
- Every table must have: search input, column filters, pagination (25 rows default), CSV export button
- Empty state: use `<EmptyState>` component with an icon, title, and optional CTA

### Notifications
- Use shadcn/ui `<Toaster>` for all success/error feedback on mutations
- Success: green toast, e.g. "Member updated successfully"
- Error: red toast, show the error message from the server action

### Loading states
- List pages: skeleton rows while loading
- Form submit: spinner on button, disable all fields
- Every route group has `loading.tsx` and `error.tsx`

### Supabase client usage
- **Browser components**: `import { createBrowserClient } from '@/lib/supabase/browser'`
- **Server components / actions**: `import { createServerClient } from '@/lib/supabase/server'`
- **Middleware**: `import { createMiddlewareClient } from '@/lib/supabase/middleware'`
- Never use the service role key on the client side

### TypeScript
- Always use types from `/types/database.ts` for Supabase rows
- Prefer explicit return types on all functions and server actions
- No `any` — use `unknown` + type guards if necessary

### Styling
- Use Tailwind utility classes only — no inline `style` props unless unavoidable
- Use `cn()` from `/lib/utils` for conditional class merging
- Brand primary color is available as CSS variable `--brand-primary` at the layout level
- Dark mode is supported via Tailwind's `dark:` prefix

---

## Brand customization

Each brand can set:
- `logo_url` — shown in sidebar top bar
- `primary_color` — hex, applied as `--brand-primary` CSS variable
- `secondary_color` — hex, applied as `--brand-secondary`
- `timezone` — default for all date/time display
- `currency` — IDR, USD, MYR, etc.

Apply brand colors in the admin layout root via a `style` attribute on the root `<div>`:
```tsx
style={{ '--brand-primary': brand.primary_color, '--brand-secondary': brand.secondary_color } as React.CSSProperties}
```

---

## Payment integration

### Midtrans (primary)
- SDK: `midtrans-client` (npm)
- Sandbox credentials in `.env.local`
- Payment flow: create transaction → redirect member to Midtrans hosted checkout → receive webhook at `/api/webhooks/midtrans` → update invoice status
- Webhook handler must verify Midtrans signature before processing
- Environment variables: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`

### Manual payments
- Staff enters amount, method (cash/transfer), optional reference number, notes
- Creates invoice with `status: 'paid'` and `payment_method: 'cash'` or `'transfer'` directly

---

## Automated background jobs (Supabase Edge Functions)

| Function | Schedule | Purpose |
|---|---|---|
| `membership_expiry_checker` | Daily 08:00 WIB | Find memberships expiring in 7, 3, 1 days → send reminder email via Resend |
| `auto_renew_memberships` | Daily 01:00 WIB | Find memberships with `auto_renew: true` expiring today → trigger Midtrans recurring charge or flag for manual renewal |

Edge functions live in `/supabase/functions/`.

---

## QR code check-in flow

1. Member opens `/member/card` — full-screen QR code generated from `memberships.id` (UUID)
2. Staff opens `/staff/checkin` — camera-based QR scanner (use `html5-qrcode` library)
3. On scan, call server action `checkInMember(membershipId)`:
   - Validate membership is active and not expired
   - Create row in `checkins`
   - Return member name, photo, status (green = OK, orange = expiring soon, red = expired/inactive)
4. Result shown on screen for 3 seconds, then scanner resets

---

## Realtime subscriptions

Use Supabase Realtime for:
- `/staff/checkin` — live occupancy counter (subscribe to `checkins` INSERT events for today)
- `/admin/dashboard` — live new member sign-up counter (optional, V2)

Pattern:
```ts
const channel = supabase
  .channel('checkins-today')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins', filter: `brand_id=eq.${brandId}` }, handleInsert)
  .subscribe()
```
Always unsubscribe on component unmount.

---

## Environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://fitnessplace.com
NEXT_PUBLIC_APP_ENV=development

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# Email (Resend)
RESEND_API_KEY=

# Auth
NEXTAUTH_SECRET=
```

---

## Supabase CLI commands

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Regenerate TypeScript types (run after any schema change)
supabase gen types typescript --local > types/database.ts

# Deploy edge functions
supabase functions deploy membership_expiry_checker
supabase functions deploy auto_renew_memberships

# Reset local DB and reseed
supabase db reset
```

---

## What NOT to do

- Do not use `getServerSideProps` or `getStaticProps` — this is App Router only
- Do not import the Supabase service role key in any client component or browser-side code
- Do not bypass Zod validation in server actions
- Do not hardcode `brand_id` — always derive it from the authenticated user's profile
- Do not use `any` TypeScript type
- Do not put business logic inside page components — keep pages thin, logic in server actions and hooks
- Do not create new shadcn components manually — use `npx shadcn-ui@latest add <component>`
- Do not use `localStorage` for auth state — Supabase Auth handles this via cookies
- PT sessions and gym access have **independent expiry dates**. Use `checkMemberAccessStatus()` for all access validation — never check expiry dates directly in components.

---

## Module status tracker

Update this section as you build each module.

| Module | Schema | Server actions | Pages | Tests |
|---|---|---|---|---|
| Auth & roles | ✅ | ✅ | ✅ | ⬜ |
| Multi-tenant scaffold | ✅ | ✅ | ✅ | ⬜ |
| Super-admin panel | ✅ | ✅ | ✅ | ⬜ |
| Membership management | ✅ | ✅ | ✅ | ⬜ |
| Membership packages (+ category split) | ✅ | ✅ | ✅ | ⬜ |
| PT assignment + commission | ✅ | ✅ | ✅ | ⬜ |
| Personal trainer mgmt | ✅ | ✅ | ✅ | ⬜ |
| Fitness class mgmt | ✅ | ✅ | ✅ | ⬜ |
| Check-in & access | ✅ | ✅ | ✅ | ⬜ |
| Payment & billing | ✅ | ✅ | ✅ | ⬜ |
| Reporting dashboard | ✅ | ✅ | ✅ | ⬜ |
| Member portal | ✅ | ✅ | ✅ | ⬜ |
| Brand customization | ✅ | ✅ | ✅ | ⬜ |
| Email automation | ✅ | ✅ | ✅ | ⬜ |
| Team management | ✅ | ✅ | ✅ | ⬜ |
| Member registration (admin) | ✅ | ✅ | ✅ | ⬜ |

Legend: ⬜ not started · 🔄 in progress · ✅ done
