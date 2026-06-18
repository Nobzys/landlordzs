# LANDLORDZS — MASTER SPECIFICATION AND IMPLEMENTATION ROADMAP

You are the Lead Product Manager, UX Architect, Database Architect, Cybersecurity Architect, and Senior Full-Stack Engineer for Landlordzs.

Landlordzs is an existing real estate platform for Cameroon.

Your responsibility is to transform the current codebase into a production-grade, mobile-first, multi-vendor real estate ecosystem.

This document is the permanent source of truth.

Always follow this specification.

Never ignore previous decisions.

Never rebuild the project from scratch.

---

# WORKING RULES

Before writing any code:

1. Audit the existing codebase.
2. Identify the current architecture.
3. Identify completed features.
4. Identify incomplete features.
5. Compare the implementation against this specification.
6. Produce a detailed gap analysis.
7. Create an implementation plan.
8. Identify the current implementation phase.
9. Wait for approval before coding.

After every phase:

- Run automated tests.
- Run manual user-flow tests.
- Fix defects.
- Review permissions.
- Review security.
- Review performance.
- Update documentation.
- Present a completion report.
- Wait for approval.

Never skip phases.

Always preserve backward compatibility.

---

# PLATFORM MISSION

Landlordzs connects people who want to:

- Buy property
- Rent property
- Sell property
- Manage property
- Find trusted professionals
- Purchase building materials

The platform consists of:

1. Property Marketplace
2. Professional Services Marketplace
3. Building Materials Marketplace

---

# BRAND IDENTITY

Style:

- Professional
- Modern
- Trustworthy
- Mobile-first
- Marketplace-focused

Visual inspiration:

- Dial4Trade information architecture
- Modern real estate portals
- Clean card layouts
- Minimal visual clutter

Color palette:

- Primary Red: #B71C1C
- Secondary Brown: #5D4037
- Accent Gold: #D4A017
- Background: #FFFFFF
- Surface: #F8F9FA
- Text: #222222

Rules:

- Use generous white space.
- Use red for primary actions only.
- Use brown for supporting elements.
- Use gold sparingly.
- Ensure WCAG 2.1 AA accessibility compliance.

---

# USER ROLES

## Free Users

- Visitor
- Buyer
- Tenant

## Paid Professional Users

- Property Seller
- Real Estate Agent
- Property Developer
- Property Manager
- Material Vendor
- Contractor
- Engineer
- Architect
- Property Lawyer
- Surveyor / Valuer
- Cleaning & Maintenance Provider

## Platform Users

- Moderator
- Customer Support
- Administrator
- Super Administrator

Support multiple roles per account.

---

# MONETIZATION MODEL

Registration is free.

Visitors, buyers, and tenants use the platform free of charge.

Professional users must complete:

1. Identity verification
2. Professional verification where applicable
3. Account activation payment

Only activated professionals can publish content.

Supported monetization:

- One-time activation fees
- Monthly subscriptions
- Annual subscriptions
- Featured listings
- Sponsored placements

Never use:

"Post Property Free"

Use:

- List Your Property
- Become a Seller
- Join as a Professional

Display:

"Creating an account is free. Publishing listings and services requires verification and account activation."

---

# PAYMENT METHODS

Primary currency:

- XAF

Supported payment methods:

- MTN Mobile Money
- Orange Money
- Bank Transfer

Future payment methods:

- Visa
- Mastercard

Payment use cases:

- Account activation fees
- Subscriptions
- Featured listings
- Sponsored placements
- Marketplace purchases
- Service payments

Required features:

- Payment verification
- Transaction history
- Invoices
- Receipts
- Refund workflows
- Failed payment handling
- Grace periods
- Renewal reminders

Payment statuses:

- Pending
- Successful
- Failed
- Refunded
- Cancelled

---

# ROLE PERMISSIONS

Only these roles can create property listings:

- Property Seller
- Real Estate Agent
- Property Developer
- Property Manager

All other professional roles create:

- Service profiles
- Portfolios
- Storefronts

Enforce permissions on both frontend and backend.

Implement:

- RBAC
- Row-level security
- Audit logs

---

# HEADER STRUCTURE

## Top Utility Bar

- Help Center
- Contact
- Get the App
- Customer Care Phone Number

## Main Navigation

- Buy
- Rent
- Land & Plots
- Commercial
- Agriculture
- New Developments
- Professionals
- Building Materials
- Community
- Help

## Right Side Navigation

- Messages
- Sign In / Join
- List Your Property

## Global Search

Include:

- Keyword search
- Location search
- Category filters

---

# BUY MENU

## Houses

- Bungalows
- Detached Houses
- Semi-Detached Houses
- Duplexes
- Villas
- Townhouses
- Family Compounds

## Apartments

- Studio Apartments
- One-Bedroom Apartments
- Two-Bedroom Apartments
- Three-Bedroom Apartments
- Penthouses
- Serviced Apartments

## Commercial Properties

- Shops
- Office Spaces
- Hotels
- Guest Houses
- Restaurants
- Warehouses
- Event Halls
- Petrol Stations
- Shopping Complexes

## Agricultural Properties

- Cocoa Farms
- Coffee Farms
- Palm Plantations
- Poultry Farms
- Fish Farms
- Livestock Farms
- Mixed Farms

---

# RENT MENU

- Single Rooms
- Self-Contained Units
- Family Homes
- Furnished Apartments
- Unfurnished Apartments
- Shared Accommodation
- Student Housing
- Commercial Rentals

---

# LAND & PLOTS

- Residential Plots
- Commercial Plots
- Estate Plots
- Farmland
- Mixed-Use Land
- Beachfront Land
- Undeveloped Land

Required filters:

- Region
- Division
- Subdivision
- Neighbourhood
- Size
- Number of plots
- Land title
- Land certificate
- Survey plan
- Mutation status
- Customary ownership
- Water access
- Electricity access
- Road access
- GPS coordinates

---

# COMMERCIAL

- Shops
- Office Spaces
- Hotels
- Guest Houses
- Restaurants
- Warehouses
- Event Halls
- Petrol Stations
- Shopping Complexes

---

# AGRICULTURE

- Cocoa Farms
- Coffee Farms
- Palm Plantations
- Poultry Farms
- Fish Farms
- Livestock Farms
- Mixed Farms

---

# NEW DEVELOPMENTS

- Off-plan Projects
- Estate Developments
- Apartment Complexes
- Mixed-use Developments

---

# PROFESSIONALS

- Real Estate Agents
- Property Developers
- Property Managers
- Contractors
- Engineers
- Architects
- Property Lawyers
- Surveyors / Valuers
- Cleaning & Maintenance

Cleaning & Maintenance categories:

- Home Cleaning
- Office Cleaning
- Waste Collection
- Construction Waste Removal
- Plumbing
- Electrical Repairs
- Painting
- Landscaping
- Pest Control
- HVAC Maintenance

---

# BUILDING MATERIALS

- Cement
- Sand
- Gravel
- Blocks
- Bricks
- Iron Rods
- Roofing Materials
- Electrical Supplies
- Plumbing Supplies
- Paint
- Tiles
- Doors
- Windows
- Hardware & Tools

---

# PROPERTY MODEL

Every listing must have:

- Listing Purpose
- Property Category
- Property Type

Listing purposes:

- Sale
- Rent
- Short Stay
- Lease
- Off-plan

Never create hardcoded categories such as:

- Houses for Sale
- Apartments for Rent
- Land for Sale

Generate titles dynamically.

Example:

Purpose = Sale

Category = Residential

Type = Duplex

Display:

"Duplex for Sale"

---

# LOCATION HIERARCHY

Country

→ Region

→ Division

→ Subdivision

→ Neighbourhood

---

# MAPS AND GEOLOCATION

Every physical listing must have location data.

Applicable entities:

- Properties
- Land & plots
- Commercial properties
- Agricultural properties
- Material vendors
- Professional offices

Required fields:

- Full address
- Latitude
- Longitude

During listing creation:

- Address search
- Use current location
- Drag-and-drop map pin
- Auto-fill coordinates

Display on listing pages:

- Embedded Google Map
- View on Map
- Get Directions
- Copy Address

Show nearby:

- Schools
- Hospitals
- Markets
- Major roads

Support:

- Map-based search
- Nearby search
- Search by drawing map area

---

# AUTHENTICATION

Implement:

- Sign up
- Sign in
- Sign out
- Remember me
- Email verification
- Forgot password
- Password reset
- Session management

Future:

- Google sign-in
- Phone number authentication
- Multi-factor authentication

Password requirements:

- Minimum 8 characters
- Uppercase letter
- Lowercase letter
- Number
- Special character

Never store passwords in plain text.

---

# FORGOT PASSWORD WORKFLOW

1. User clicks "Forgot Password?"
2. User enters email address.
3. System sends secure reset email.
4. User clicks reset link.
5. User creates a new password.
6. User signs in.

Requirements:

- Expiring reset links
- Single-use tokens
- Rate limiting
- Success confirmation

---

# ACCOUNT RECOVERY

Provide:

"Need help accessing your account?"

Workflow:

1. User provides:
   - Phone number
   - Full name
   - Alternative email

2. Customer support verifies identity.

3. Customer support assists with account recovery.

---

# TRUST SYSTEMS

Implement:

- Identity verification
- Professional verification
- Property ownership verification
- Verification badges
- Reviews
- Ratings
- Fraud reporting

---

# MESSAGING AND NOTIFICATIONS

Support:

- In-app messaging
- Email notifications
- SMS notifications
- WhatsApp notifications
- File attachments
- Viewing requests
- Read receipts

Examples:

- New messages
- Viewing requests
- Payment confirmations
- Verification updates
- Subscription reminders

Users can manage notification preferences.

---

# WHATSAPP CUSTOMER SUPPORT

Implement a global floating WhatsApp button.

Requirements:

- Visible on every page
- Fixed bottom-right position
- Connects only to Landlordzs customer support

Default message:

"Hello, I need assistance with Landlordzs."

Quick replies:

- Buy Property
- Rent Property
- List Property
- Verification Support
- Payment Support
- Report an Issue

Allow administrators to configure:

- WhatsApp number
- Welcome message
- Business hours
- Automated responses

Never connect the global WhatsApp button to sellers or agents.

---

# COMMUNITY STRATEGY

## Phase 1

- Property Guides
- Market Insights
- Neighbourhood Reviews
- FAQs
- Ask an Expert

## Phase 2

- Questions and Answers
- Expert Responses
- User Reviews

## Phase 3

Launch a full forum.

Forum categories:

- Buying Property
- Renting Property
- Land & Titles
- Construction
- Building Materials
- Property Law
- Neighbourhood Discussions

---

# DASHBOARDS

## Buyer Dashboard

- Saved Properties
- Messages
- Viewing Requests
- My Offers
- Profile Settings

## Seller Dashboard

- Listings
- Leads
- Analytics
- Billing

## Professional Dashboard

- Service Requests
- Quotations
- Portfolio
- Messages
- Billing

## Admin Dashboard

- Users
- Roles
- Listings
- Verification
- Analytics
- Billing
- Audit Logs

---

# FOOTER

## Company

- About Us
- Contact Us
- Help Center
- Careers

## Properties

- Buy Property
- Rent Property
- Land & Plots
- Commercial
- Agriculture
- New Developments

## Professionals

- Agents
- Property Lawyers
- Contractors
- Engineers
- Architects
- Surveyors
- Cleaning & Maintenance

## Marketplace

- Building Materials
- Become a Seller
- Join as a Professional
- Pricing & Plans

## Legal

- Terms of Service
- Privacy Policy
- Cookie Policy
- Sitemap

Footer tagline:

"Everything Property. One Trusted Platform."

---

# CONTACT INFORMATION

Phone:

+237 676 770 358

Email:

info@landlordzs.com

Display these details in:

- Header
- Footer
- Contact page
- About page
- Help Center
- Verification emails
- Password reset emails
- Payment notifications
- WhatsApp support

---

# RESPONSIVE DESIGN

The platform must be mobile-first.

Support:

- Mobile phones
- Tablets
- Laptops
- Desktop computers

Requirements:

- Responsive layouts
- Touch-friendly controls
- Responsive images
- Collapsible navigation
- Fast page loads

Users should complete major actions in three clicks or less.

---

# PERFORMANCE

Target metrics:

- Initial load under 3 seconds
- Largest Contentful Paint under 2.5 seconds
- Time to Interactive under 3 seconds

Implement:

- Server-side rendering
- Code splitting
- Lazy loading
- Image optimization
- CDN support
- Caching
- Database indexing

---

# IMPLEMENTATION ROADMAP

## Phase 1

- Authentication
- User onboarding
- Role management
- RBAC
- Property listings
- Search
- Buyer dashboard
- Seller dashboard

## Phase 2

- Public profiles
- Verification
- Reviews
- Portfolios
- Storefronts

## Phase 3

- Messaging
- Notifications
- Viewing scheduling

## Phase 4

- Billing
- Activation fees
- Subscriptions
- MTN Mobile Money
- Orange Money
- Bank transfer integration

## Phase 5

- Service requests
- Quotations
- Building materials marketplace

## Phase 6

- Community features
- Property guides
- Market insights
- Neighbourhood reviews
- Ask an Expert

## Phase 7

- Advanced analytics
- Recommendations
- Performance optimization

## Phase 8

- Security audits
- Backup testing
- Launch readiness

Do not implement future phases until earlier phases are complete.

---

# FINAL IMPLEMENTATION RULE

Before writing code, always answer:

1. Which phase is currently active?
2. What already exists?
3. What is missing?
4. What are the risks?
5. What database changes are required?
6. What API changes are required?
7. What UI changes are required?
8. What security changes are required?

Only after answering these questions may implementation begin.

Always audit first.

Always follow this specification.

Always treat this document as permanent project memory.

---

# IMPLEMENTATION LOG

This section records decisions made while implementing the roadmap above. It
is appended to, never rewritten — each entry reflects the codebase state and
decisions at the time it was written.

## Phase 1 — Sprint 1, Task 1: RBAC enforcement for property creation (2026-06-18)

**Branch:** `feature/phase1-sprint1-security`

**Scope:** Restrict property listing creation to `seller`, `agent`, `admin`.
All other roles denied at every layer (frontend, server action, RLS).

**Decisions:**

- The spec names `seller, agent, developer, property_manager` as allowed
  listing creators. This codebase's `UserRole` type (`src/types/auth.ts`)
  only has 9 roles and does not include `developer` or `property_manager` —
  those exist only on a different branch (`feature/payment-gateways-clean`).
  Per explicit instruction, this task enforces only the 3 roles that exist
  today (`seller`, `agent`, `admin`). Adding `developer`/`property_manager`
  is deferred to a separate future task — it requires its own scope (enum
  migration, registration/onboarding, nav config) and is not "RBAC
  enforcement" of an existing role set.
- Phase 1 keeps one role per account (`profiles.role` remains a single
  enum column). Multi-role accounts are explicitly out of scope until a
  later phase, per instruction.
- Found and fixed a pre-existing routing bug while implementing this task:
  `middleware.ts` mapped `/seller` to the single role `'seller'`, which
  silently blocked `agent` users from ever reaching `/seller/listings/new`
  even though the page itself, the nav config, and the permission map all
  already intended to allow agents. `ROLE_PROTECTED_PREFIXES` was
  generalized from `Record<string, UserRole>` to `Record<string, UserRole[]>`
  to fix this without changing behavior for any other role-protected prefix.
- No test framework existed in this repo prior to this task. Vitest was
  added (scoped to this feature) as the project's first test runner,
  per explicit approval, rather than building an ad-hoc DB-dependent
  script. `npm test` now runs `vitest run`.

**Changed files:**
- `src/lib/actions/properties.ts` — `createProperty` now fetches `role`
  alongside `account_status` and rejects any role outside
  `PROPERTY_CREATOR_ROLES` before the existing active-account check.
- `src/lib/utils/constants.ts` — added `PROPERTY_CREATOR_ROLES = ['seller',
  'agent', 'admin']`; changed `ROLE_PROTECTED_PREFIXES` to
  `Record<string, UserRole[]>`, allowing `/seller` to admit both `seller`
  and `agent`.
- `middleware.ts` — updated the route-protection check to use
  `allowedRoles.includes(userRole)` instead of single-role equality.
- `supabase/migrations/20260618000001_property_creator_rbac.sql` — new
  additive migration: adds `is_property_creator()` (SECURITY DEFINER helper,
  same pattern as `is_admin()`/`has_active_account()`), tightens the
  `prop_insert` RLS policy to require it. No tables/columns dropped, no
  data modified — only the `prop_insert` policy object is replaced.
- `src/lib/actions/properties.rbac.test.ts` — new Vitest unit tests
  covering all 9 roles (3 allowed, 6 denied), inactive-account-but-allowed-role,
  unauthenticated, and missing-profile cases.
- `package.json`, `vitest.config.ts` — added Vitest as a dev dependency
  and test runner config (alias `@/` → `src/`, matching `tsconfig.json`).

**Deferred (explicitly out of scope for this task):**
- `updateProperty`, `deleteProperty`, `publishProperty` in the same file
  still rely on ownership only, with no role re-check. Same class of gap
  as the one just fixed; left untouched per "Task 1 only" instruction.
- Adding `developer`/`property_manager` roles (see Decisions above).
- No ESLint is configured anywhere in this repo; `npm run lint` could not
  be run as requested. This is a pre-existing gap, not introduced by this
  task.

**Test results:**
- `npx vitest run` — 12/12 passed (all 9 roles, inactive-account,
  unauthenticated, missing-profile cases).
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeded, all 45 routes compiled including
  `/seller/listings/new`.
- `npm run lint` — could not run; no ESLint config exists anywhere in
  this repo (pre-existing gap, not introduced by this task).

**Rollback:**
- Code: `git revert 160b724`
- Database (only if the migration was applied via `supabase db push`):
  ```sql
  DROP POLICY IF EXISTS "prop_insert" ON public.properties;
  CREATE POLICY "prop_insert" ON public.properties
    FOR INSERT WITH CHECK (
      owner_id = auth.uid()
      AND (public.is_admin() OR public.has_active_account())
    );
  DROP FUNCTION IF EXISTS public.is_property_creator();
  ```

## Phase 1 — Sprint 1, Task 2: Password complexity enforcement (2026-06-18)

**Branch:** `feature/phase1-sprint1-security`

**Scope:** Enforce password complexity (min 8 chars, uppercase, lowercase,
number, special character) consistently across Registration, Password
reset, and Change password, with clear user-facing messages and automated
tests.

**Decisions:**

- `registerSchema` and `resetPasswordSchema` already enforced 4 of the 5
  rules (missing only the special-character check). Extracted both into a
  single shared `passwordSchema` constant in `src/lib/validations/auth.ts`
  rather than leaving the rules duplicated, so the two flows cannot drift
  apart again.
- `updatePassword` (change-password) had **no validation at all** — it
  accepted a raw `{ current_password, new_password }` object with no Zod
  schema and no UI. Added a new `changePasswordSchema` (reuses
  `passwordSchema` for `new_password`, requires `confirm_password` to
  match, and rejects `new_password === current_password`) and wired
  `updatePassword` to validate against it before any Supabase call.
- No change-password UI existed in the codebase prior to this task. Built
  `ChangePasswordForm.tsx`, mirroring `ResetPasswordForm.tsx`'s exact
  conventions (react-hook-form + zodResolver, show/hide toggle, `Alert`
  for server errors), and mounted it on `account/profile/page.tsx` below
  the existing KYC section.
- No database or RLS changes required — Supabase Auth owns password
  storage/hashing; this task is application-layer validation only.

**Changed files:**
- `src/lib/validations/auth.ts` — added shared `passwordSchema` (now
  includes the special-character rule); `registerSchema` and
  `resetPasswordSchema` reuse it; added `changePasswordSchema`.
- `src/lib/actions/auth.ts` — `updatePassword` now validates input via
  `changePasswordSchema.safeParse()` before re-authenticating and calling
  `supabase.auth.updateUser()`.
- `src/components/auth/RegisterForm.tsx`,
  `src/components/auth/ResetPasswordForm.tsx` — password field placeholder
  updated to reflect all 5 rules (previously omitted lowercase and special
  character from the hint text).
- `src/components/auth/ChangePasswordForm.tsx` — new component, the first
  UI for the previously-unused `updatePassword` action.
- `src/app/(dashboard)/account/profile/page.tsx` — mounts
  `<ChangePasswordForm />`.
- `src/lib/validations/auth.test.ts`, `src/lib/actions/updatePassword.test.ts`
  — new Vitest suites (20 tests) covering each complexity rule in
  isolation, schema-level refine checks, and the `updatePassword` action's
  validation/re-auth/Supabase-error branches.

**Deferred:** none — this task's scope (registration, reset, change) is
fully covered.

**Manual QA steps:**
1. Register with a password missing a special character (e.g.
   `Str0ngPass`) on `/register` → rejected with "Must contain at least
   one special character".
2. Same check on `/reset-password`.
3. On `/account/profile`, in the new "Change Password" section, enter an
   incorrect current password → "Current password is incorrect."
4. Enter a new password identical to the current password → blocked with
   "New password must be different from your current password".
5. Enter a compliant new password with a matching confirmation → success
   message shown; sign out and back in with the new password to confirm
   it actually changed.

**Test results:**
- `npx vitest run` — 32/32 passed (12 from Task 1's suite + 20 new:
  per-rule complexity checks, schema refine checks, and
  `updatePassword`'s validation/re-auth/Supabase-error branches).
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeded, all 45 routes compiled.
- `npm run lint` — could not run; no ESLint config exists anywhere in
  this repo (same pre-existing gap noted in Task 1).

**Rollback:**
- Code: `git revert 7adbf84`
- No database changes were made in this task, so no database rollback
  step is required.

## Phase 1 — Sprint 1, Task 3: Pre-implementation decisions (2026-06-18)

This entry records decisions made in response to clarifying questions,
**before any code was written**, per the working rule "wait for approval
before coding."

**Scope:** Password reset token expiration handling, password reset rate
limiting, and a capture-only secure account recovery workflow.

**1. Token expiration — CONFIRMED VALUE: 60 minutes (3600 seconds)**
- No custom expiration logic is implemented. The app relies entirely on
  Supabase Auth's own recovery-code TTL (enforced inside
  `exchangeCodeForSession`); we do not re-implement or duplicate that
  check.
- **Exact mechanism, verified directly (not assumed):** the controlling
  key is `[auth.email] otp_expiry` in `supabase/config.toml`, confirmed
  by generating a fresh default config with the project's installed
  Supabase CLI (`v2.105.0`, `supabase init` into a scratch directory)
  and inspecting its output — the CLI's own default is
  `otp_expiry = 3600` (comment: "Number of seconds before the email OTP
  expires (defaults to 1 hour)"). This same key governs password-reset
  email link validity, since Supabase's recovery flow uses the email
  OTP/PKCE-code mechanism under the hood.
- Prior to this change, this repo's `supabase/config.toml` did not
  declare `otp_expiry` at all, so it silently inherited the CLI's
  `3600`-second default. **This matches the Phase 1 decision below
  exactly, so no behavior changes — only the value is now explicit in
  source instead of implicit.** `otp_expiry = 3600` has been added
  under `[auth.email]` in `supabase/config.toml`.
- **Required dashboard configuration for all environments:** local dev
  (`supabase start`) and any environment driven by
  `supabase config push` against a linked project will now pick up
  `otp_expiry = 3600` automatically from this file. However, if the
  hosted production project's Auth settings are managed directly via
  the Supabase Dashboard (Authentication → Email → "Email OTP expiration")
  rather than via `supabase config push`, the dashboard value is the
  actual source of truth and can drift from this file independently.
  **Action item for whoever administers the production project:**
  confirm "Email OTP expiration" reads **3600 seconds (60 minutes)** in
  the Dashboard, or run `supabase config push` against the linked
  production project to sync this file's value. This codebase has no
  credentials or API access to read or set that Dashboard value
  directly, so this step must be performed manually outside this repo.
- This task's app-layer change only fixes what happens *after* Supabase
  reports a code as expired/invalid (redirect to
  `/forgot-password?error=link_expired` instead of the unrelated
  `/verify-email` page) — it does not itself change the TTL; the TTL is
  now pinned at 3600s via the config file as documented above.

**2. Rate limiting**
- Confirmed rule: a request is blocked if **either** the target email
  **or** the requesting IP has reached 3 attempts within the trailing 15
  minutes (OR logic — whichever limit is hit first blocks the request).
  Both counters are recorded on every attempt (even blocked ones aren't
  double-recorded — the check runs before the insert).
- IP source: production deploys behind **Vercel** (confirmed). Vercel's
  edge network sets `x-forwarded-for` to the verified client IP and
  overwrites any client-supplied value before it reaches the app, so it
  is safe to read directly via `headers().get('x-forwarded-for')`
  (first entry in the list) with no additional spoofing defense needed.
  If `x-forwarded-for` is ever absent (e.g. local dev), the literal
  string `'unknown'` is used as the IP bucket — meaning all local
  requests share one IP bucket, which is acceptable for dev and does not
  affect production behavior.
- On exceeding the limit: `forgotPassword` returns
  `{ error: 'Too many requests. Please try again later.' }` and exits
  before calling `supabase.auth.resetPasswordForEmail` (no email is
  sent, no further state changes). This response is distinguishable
  from the normal `{ success: true }`, but the distinguishing signal is
  "this exact input was used 3+ times in 15 minutes" — fully
  attacker-controlled and identical regardless of whether the target
  email is a real account, so it does not weaken the existing
  email-enumeration protection (see item 4).

**3. Account recovery workflow — full end-to-end definition**
- Entry points: a "Need help accessing your account?" link on `/login`
  and `/forgot-password`, leading to a new public page `/account-recovery`.
- Evidence collected (capture-only, minimal PII by design): full name,
  phone number, alternative email, and a free-text note. No passwords,
  no security questions, no document uploads are collected by this task.
- On submit: a row is inserted into `account_recovery_requests` with
  `status = 'pending'` via the service-role admin client (never exposed
  to anonymous RLS). The user sees a static confirmation ("Your request
  has been received. Our support team will contact you.") — submitting
  this form never changes any account state by itself.
- Review process (capture-only scope, confirmed with user): there is
  **no in-app admin queue** in this task. Support/admin staff review
  pending rows directly via the Supabase Studio/Dashboard table view.
  Approval/rejection and the actual recovery assistance (e.g. verifying
  identity by calling the phone number provided, then manually helping
  the user regain access) happen **out-of-band**, matching the master
  spec's "Customer support verifies identity… assists with account
  recovery" wording, which describes a human process, not an automated
  one.
- **Expiry policy (Phase 1 decision): unresolved requests expire after 7
  days.** The table includes an `expires_at` column, set at insert time
  to `created_at + interval '7 days'`. Because this task's scope is
  capture-only (no in-app admin queue, no scheduled job infrastructure
  exists in this repo), expiry is **recorded, not automatically
  enforced** — there is no cron/edge function that auto-marks rows
  `expired` or deletes them. Support reviewing the table via Supabase
  Studio should treat any `pending` row past its `expires_at` as stale
  and ask the user to resubmit rather than act on it. Automatic
  enforcement (e.g. a scheduled function flipping status to `expired`)
  would require new scheduling infrastructure and is deferred — it can
  be added later without a breaking change, since `expires_at` is
  already being recorded now.
- Audit trail: the table includes `status`, `reviewed_at`, and
  `reviewed_by` columns so that when support updates a row's status
  (manually, via SQL/Studio), a record persists. **Explicit limitation:**
  because there is no in-app review action, nothing forces `reviewed_by`
  to be set correctly — it depends on whoever performs the manual update
  filling it in. This is the known tradeoff of the capture-only scope;
  if stronger audit guarantees are needed later, that requires the
  in-app admin-queue scope, which was explicitly deferred this round.

**4. Security confirmations**
- No plaintext reset tokens are logged anywhere. Confirmed by reading
  `src/app/api/auth/callback/route.ts`: the only `console.error` calls
  log `errorMsg`/`error.message`, never the `code` query param. The new
  redirect-on-expiry change does not add any logging of the code either.
- No recovery-request PII (full name, phone, alternative email, note) is
  ever passed to `console.*` — it is written only to the database via
  the service-role client.
- Account enumeration remains prevented: `forgotPassword` already
  returns `{ success: true }` unconditionally regardless of whether the
  email exists (pre-existing behavior, unchanged). The new rate-limit
  branch returns early only when an input (email or IP) has itself been
  reused 3+ times in 15 minutes — see item 2's reasoning for why this
  adds no enumeration signal.
- Service-role (`createAdminClient()`) calls occur only inside
  `'use server'` files in `src/lib/actions/auth.ts` — never in a client
  component, never in a route handler reachable without going through a
  validated server action. This task preserves that existing invariant.
- Both new tables (`password_reset_attempts`, `account_recovery_requests`)
  will have `ENABLE ROW LEVEL SECURITY` with **zero policies created**.
  In Postgres, RLS-enabled-with-no-policies denies all access to any
  role subject to RLS (`anon`, `authenticated`) — only the Supabase
  service role, which bypasses RLS by design, can read or write. This is
  the same pattern already used for `is_admin()`-gated tables elsewhere
  in this project, applied here by omitting policies entirely rather
  than gating by role.

## Phase 1 — Sprint 1, Task 3: Implementation (2026-06-18)

**Status: implemented, tested, pending commit/push/PR.**

### Changed files

- `supabase/config.toml` — added `otp_expiry = 3600` under `[auth.email]`,
  making the previously-implicit 60-minute token TTL explicit (no
  behavior change).
- `supabase/migrations/20260618000002_password_reset_rate_limit.sql`
  (new) — two purely additive tables: `password_reset_attempts`
  (rate-limit ledger) and `account_recovery_requests` (capture-only
  recovery intake), both RLS-enabled with zero policies. **Not yet
  applied to any database** — no `supabase db push` has been run.
- `src/lib/validations/auth.ts` — added `accountRecoverySchema` /
  `AccountRecoveryInput`.
- `src/lib/actions/auth.ts` — added `PASSWORD_RESET_RATE_LIMIT` (3),
  `PASSWORD_RESET_RATE_WINDOW_MS` (15 min), and `getClientIp()`.
  Rewrote `forgotPassword` to check both counters before sending the
  reset email and to record every attempt. Added new
  `submitAccountRecoveryRequest` action. `resetPassword` was reviewed
  and intentionally left unchanged — no custom expiration logic, per
  item 1 above.
- `src/app/api/auth/callback/route.ts` — when `exchangeCodeForSession`
  fails and `next === '/reset-password'`, redirect to
  `/forgot-password?error=link_expired` instead of the generic
  `/verify-email?error=...` path.
- `src/components/auth/ForgotPasswordForm.tsx` — reads
  `?error=link_expired` via `useSearchParams()` and shows an inline
  "Your reset link expired or was already used" message; added a
  "Need help accessing your account?" link to `/account-recovery`.
- `src/app/(auth)/forgot-password/page.tsx` — wrapped `<ForgotPasswordForm />`
  in `<Suspense>`, required because the component now calls
  `useSearchParams()` (same convention as `login/page.tsx` + `LoginForm`).
- `src/components/auth/LoginForm.tsx` — added the same "Need help
  accessing your account?" link to `/account-recovery`.
- `src/components/auth/AccountRecoveryForm.tsx` (new) — capture-only
  form (full name, phone, alternative email, optional note) that calls
  `submitAccountRecoveryRequest`.
- `src/app/(auth)/account-recovery/page.tsx` (new) — public page hosting
  `AccountRecoveryForm`, inherits the shared `(auth)` layout.
- `src/lib/actions/passwordResetRateLimit.test.ts` (new) — 9 unit tests
  covering both new/changed actions (see below).

### Test results

- `npx vitest run` → **41 passed (41)** — 32 pre-existing + 9 new:
  - `forgotPassword`: sends email under the limit; blocks on email
    count ≥ 3; blocks on IP count ≥ 3 with a *different* email
    (confirms OR logic, not just per-email); falls back to `'unknown'`
    IP without throwing when `x-forwarded-for` is absent; rejects
    invalid email before touching Supabase; surfaces a
    `resetPasswordForEmail` error.
  - `submitAccountRecoveryRequest`: captures a valid request; rejects
    an invalid phone before touching Supabase; surfaces an insert
    failure as a generic `'Could not submit your request...'` error
    (no raw DB error leaked to the client).
- `npx tsc --noEmit` → clean, no errors.
- `npm run build` → succeeded. 46/46 routes generated, including the
  new `/account-recovery` route as a dynamic (ƒ) page. No Suspense
  boundary warnings.
- Lint: not run (no working `npm run lint` script in this environment,
  consistent with Tasks 1 and 2).

### Manual QA steps (for whoever applies the migration and tests against a live Supabase project)

1. Run `supabase db push` (or apply the migration via Studio) to create
   `password_reset_attempts` and `account_recovery_requests`.
2. Submit `/forgot-password` 3 times in under 15 minutes with the same
   email → 4th attempt should show "Too many requests. Please try
   again later." instead of sending another email.
3. Submit `/forgot-password` 3 times in under 15 minutes from the same
   IP using 3 *different* emails → 4th attempt (any email) should also
   be blocked, confirming the IP-based counter independently of the
   email-based one.
4. Wait out (or manually backdate rows past) the 15-minute window and
   confirm a new attempt succeeds again.
5. Request a reset link, wait for it to be consumed or for >60 minutes
   to pass, then click it → should land on
   `/forgot-password?error=link_expired` with the inline expired-link
   message, not the generic `/verify-email` error page.
6. Visit `/login` and `/forgot-password` → confirm the "Need help
   accessing your account?" link is visible on both and navigates to
   `/account-recovery`.
7. Submit `/account-recovery` with valid data → confirm the
   confirmation screen appears and a row lands in
   `account_recovery_requests` with `status = 'pending'` and
   `expires_at` ≈ `created_at + 7 days` (verify via Supabase Studio,
   since there is no in-app admin queue by design).
8. Submit `/account-recovery` with an invalid phone number → confirm
   client-side validation blocks submission before any network call.
9. Confirm anon/authenticated Supabase clients cannot read or write
   either new table directly (e.g. via the Supabase JS client in the
   browser console) — both should fail with a permission-denied/RLS
   error, since zero policies were created for either role.

### Deferred items

- Automatic enforcement of the 7-day account-recovery expiry (status
  flip to `'expired'`) — requires scheduling infrastructure that
  doesn't exist in this repo yet; `expires_at` is recorded now so this
  can be added later without a breaking change.
- In-app admin queue / review UI for `account_recovery_requests` —
  explicitly out of scope per the user-confirmed "capture-only" design;
  support reviews via Supabase Studio directly.
- Confirming the hosted production Supabase project's Dashboard "Email
  OTP expiration" setting matches `otp_expiry = 3600`, or running
  `supabase config push` — this repo has no credentials to verify or
  set that value directly; flagged as a manual action item for whoever
  administers the production project.

### Rollback

1. Revert the application code: `git revert <task-3-commit-sha>`
   (replace with the actual SHA once committed) — this reverts every
   file listed above except the new migration (migrations are not
   touched by `git revert` if already applied to a database).
2. If the migration has been applied to any database, manually reverse
   it (no `supabase db push` rollback command exists for already-applied
   migrations):
   ```sql
   DROP TABLE IF EXISTS public.account_recovery_requests;
   DROP TABLE IF EXISTS public.password_reset_attempts;
   ```
3. If `supabase config push` was run against a linked project to sync
   `otp_expiry = 3600`, no reversal is needed — `3600` was already the
   pre-existing implicit default, so removing the explicit line from
   `supabase/config.toml` (via the `git revert` in step 1) restores the
   prior (identical) implicit behavior.