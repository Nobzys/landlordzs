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