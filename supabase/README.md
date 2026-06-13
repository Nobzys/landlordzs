# LANDLORDZS — Supabase Deployment Guide

Complete instructions for deploying the LANDLORDZS database schema, Edge Functions, and storage to Supabase.

---

## Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| Supabase CLI | 1.166+ | `npm i -g supabase` |
| Node.js | 18+ | https://nodejs.org |
| Docker Desktop | 4.x | Required for `supabase start` |
| Git | any | |

---

## Project Structure

```
supabase/
├── config.toml                        — Local dev configuration
├── migrations/
│   ├── 20260610000001_extensions.sql  — PostgreSQL extensions
│   ├── 20260610000002_enums.sql       — 21 custom enum types
│   ├── 20260610000003_functions.sql   — SQL utility + business functions
│   ├── 20260610000004_auth_profiles.sql
│   ├── 20260610000005_agencies_agents.sql
│   ├── 20260610000006_properties.sql
│   ├── 20260610000007_vendors_marketplace.sql
│   ├── 20260610000008_professional_services.sql
│   ├── 20260610000009_rentals.sql
│   ├── 20260610000010_forum.sql
│   ├── 20260610000011_messaging.sql
│   ├── 20260610000012_notifications_reviews.sql
│   ├── 20260610000013_payments_escrow.sql
│   ├── 20260610000014_jobs_tenders.sql
│   ├── 20260610000015_admin.sql
│   ├── 20260610000016_rls_policies.sql
│   ├── 20260610000017_realtime_storage.sql
│   └── 20260610000018_seed_categories.sql
├── seeds/
│   └── seed.sql                       — Sample Cameroon development data
├── functions/
│   ├── send-notification/index.ts
│   ├── release-escrow/index.ts
│   └── payment-webhook/index.ts
└── schema.sql                         — Full schema reference (not used by CLI)
```

---

## Local Development

### 1. Initialise (first time only)

```bash
# From the project root
supabase init
# Config already exists — skip if supabase/config.toml is present
```

### 2. Start local stack

```bash
supabase start
```

This starts PostgreSQL (port 54322), API (54321), Studio (54323), and Edge Runtime.

### 3. Apply migrations + seed

```bash
# Apply all migrations in order then run seeds/seed.sql
supabase db reset
```

`db reset` drops and recreates the local database, runs every migration file in numerical order, then executes all files in `supabase/seeds/`.

### 4. Open Supabase Studio

```
http://localhost:54323
```

Default credentials: `postgres` / `postgres`

### 5. Test an Edge Function locally

```bash
supabase functions serve send-notification --env-file .env.local
```

Then in another terminal:
```bash
curl -i -X POST http://localhost:54321/functions/v1/send-notification \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000004","type":"test","title":"Hello","body":"Test notification"}'
```

---

## Production Deployment

### Step 1 — Create a Supabase project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Name: `landlordzs-prod`
4. Database password: generate a strong password and save it
5. Region: **West EU (Frankfurt)** — closest to Cameroon
6. Wait for provisioning (~2 min)

### Step 2 — Link your local project

```bash
supabase login
supabase link --project-ref <your-project-ref>
# Project ref is in: Settings > General > Reference ID
```

### Step 3 — Set environment variables

Create `.env.local` (never commit this):

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Email — get from https://resend.com
RESEND_API_KEY=re_xxxxxxxxxxxx

# MTN Mobile Money — get from https://momodeveloper.mtn.com
MTN_MOMO_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MTN_MOMO_SUBSCRIPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MTN_MOMO_ENVIRONMENT=production

# Orange Money — get from https://developer.orange.com/apis/om-cameroun
ORANGE_MONEY_SECRET=xxxxxxxxxxxxxxxxxxxx
ORANGE_MONEY_CLIENT_ID=xxxxxxxxxxxxxx
ORANGE_MONEY_CLIENT_SECRET=xxxxxxxxxxxxxx
```

### Step 4 — Push migrations to production

```bash
supabase db push
```

This runs every migration file against the remote database in order. If the remote is already partially migrated, only new files run.

**Verify:**
```bash
supabase db diff --schema public
# Should show no diff if fully applied
```

### Step 5 — Deploy Edge Functions

```bash
# Deploy all three functions at once
supabase functions deploy send-notification
supabase functions deploy release-escrow
supabase functions deploy payment-webhook
```

Set production secrets:
```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxx \
  MTN_MOMO_API_KEY=xxxx \
  ORANGE_MONEY_SECRET=xxxx
```

Verify deployment:
```bash
supabase functions list
```

### Step 6 — Schedule the escrow release cron

1. Dashboard → **Edge Functions** → `release-escrow`
2. Click **Add Schedule**
3. Cron expression: `0 2 * * *` (daily at 02:00 UTC)
4. HTTP method: POST, body: `{}`

### Step 7 — Configure Storage buckets

The migration `20260610000017` inserts bucket records. Verify in Dashboard → **Storage** that all 10 buckets exist:

**Public** (direct URL access):
- `property-images` — 10 MB, JPEG/PNG/WebP
- `product-images` — 10 MB, JPEG/PNG/WebP
- `portfolio-images` — 10 MB, JPEG/PNG/WebP
- `rental-images` — 10 MB, JPEG/PNG/WebP
- `avatars` — 5 MB, JPEG/PNG/WebP/GIF
- `forum-attachments` — 20 MB, images + PDF

**Private** (signed URL required):
- `message-attachments` — 50 MB
- `verification-docs` — 20 MB, images + PDF
- `tender-documents` — 50 MB, PDF/Word
- `service-contracts` — 20 MB, PDF

### Step 8 — Configure Authentication

Dashboard → **Authentication** → **Providers**:

1. **Email** — Enable, set "Confirm email" to ON
2. **Phone** (optional) — Enable for SMS OTP
3. **Google** — Add OAuth credentials (optional)

Dashboard → **Authentication** → **URL Configuration**:
- Site URL: `https://landlordzs.com`
- Redirect URLs: `https://landlordzs.com/auth/callback`

Dashboard → **Authentication** → **Email Templates** — customise registration and reset emails in French/English.

### Step 9 — Register payment webhooks

**MTN Mobile Money:**
1. Log in to https://momodeveloper.mtn.com
2. Subscription → Collections → Add callback URL:
   `https://<project-ref>.supabase.co/functions/v1/payment-webhook?provider=mtn_momo`

**Orange Money:**
1. Log in to https://developer.orange.com
2. My Apps → your app → Webhook URL:
   `https://<project-ref>.supabase.co/functions/v1/payment-webhook?provider=orange_money`

---

## Post-Deployment Verification

```bash
# 1. Check migration status
supabase db diff --schema public

# 2. Count tables (should be 63+)
supabase db execute --command "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 3. Verify RLS is enabled everywhere
supabase db execute --command "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false ORDER BY tablename;"
# Should return 0 rows

# 4. Verify functions exist
supabase db execute --command "SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;"

# 5. Smoke test Edge Function (replace <anon-key>)
curl https://<project-ref>.supabase.co/functions/v1/send-notification \
  -H "Authorization: Bearer <anon-key>" \
  -X POST \
  -d '{"user_id":"test","type":"ping","title":"Test","body":"Hello"}'
```

---

## Rollback

To roll back to a specific migration:

```bash
# Locally: reset and replay up to a specific file
supabase db reset
# Then manually run only the migrations you need

# Production: create a new DOWN migration
# e.g. supabase/migrations/20260610000019_rollback_xxx.sql
```

Supabase CLI does not support automatic down-migrations. Always write reversible migrations.

---

## Useful Commands

```bash
supabase status              # Show local service URLs and keys
supabase db dump -f dump.sql # Dump full remote schema
supabase logs --tail         # Stream edge function logs
supabase functions logs send-notification  # Logs for a specific function
supabase db lint             # Static SQL analysis
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (Edge Functions only) |
| `SUPABASE_ANON_KEY` | Yes | Public anon key (frontend) |
| `RESEND_API_KEY` | No | Email delivery via Resend |
| `MTN_MOMO_API_KEY` | No | MTN MoMo Collections API key |
| `MTN_MOMO_SUBSCRIPTION_KEY` | No | MTN MoMo Ocp-Apim-Subscription-Key |
| `ORANGE_MONEY_SECRET` | No | Orange Money notification token |
| `ORANGE_MONEY_CLIENT_ID` | No | Orange Money OAuth client ID |
| `ORANGE_MONEY_CLIENT_SECRET` | No | Orange Money OAuth client secret |

---

## Database Roles

| Role | Tables | Notes |
|------|--------|-------|
| `anon` | Properties, products, profiles (public) | Read-only, no auth required |
| `authenticated` | All public tables | Filtered by RLS policies |
| `service_role` | All tables, bypasses RLS | Edge Functions only |

---

## Support

- Supabase Docs: https://supabase.com/docs
- MTN MoMo Developer: https://momodeveloper.mtn.com
- Orange Money API: https://developer.orange.com/apis/om-cameroun
- Issues: contact@landlordzs.com
