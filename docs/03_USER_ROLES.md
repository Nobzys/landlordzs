# LANDLORDZS — User Roles Reference

Version: 1.0  
Source of truth: `supabase/migrations/`, `src/types/auth.ts`, `src/lib/utils/constants.ts`, `middleware.ts`, `src/lib/actions/auth.ts`  
Last updated: 2026-07-13  

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Role Definitions](#2-role-definitions)
   - [Guest](#21-guest)
   - [Buyer](#22-buyer-buyer)
   - [Seller](#23-seller-seller)
   - [Real Estate Agent](#24-real-estate-agent-agent)
   - [Real Estate Agency](#25-real-estate-agency--not-in-db)
   - [Contractor](#26-contractor-contractor)
   - [Engineer](#27-engineer-engineer)
   - [Architect](#28-architect-architect)
   - [Quantity Surveyor](#29-quantity-surveyor--not-in-db)
   - [Interior Designer](#210-interior-designer--not-in-db)
   - [Building Materials Vendor](#211-building-materials-vendor-vendor)
   - [Hardware Store](#212-hardware-store--not-in-db)
   - [Property Lawyer](#213-property-lawyer-lawyer)
   - [Property Manager](#214-property-manager--not-in-db)
   - [Cleaning Service](#215-cleaning-service--not-in-db)
   - [Maintenance Service](#216-maintenance-service--not-in-db)
   - [Moving Service](#217-moving-service--not-in-db)
   - [Surveyor](#218-surveyor--not-in-db)
   - [Moderator](#219-moderator-moderator--partial)
   - [Admin](#220-admin-admin)
   - [Super Admin](#221-super-admin--not-in-db)
3. [Permission Matrix](#3-permission-matrix)
4. [Final Summary](#4-final-summary)

---

## 1. Role Overview

| # | Role | DB Enum | TS Type | Status | Approval Required | Dashboard |
|---|------|---------|---------|--------|-------------------|-----------|
| 1 | Guest | — | — | ✅ | — | None |
| 2 | Buyer | `buyer` | ✅ | ✅ | No | `/buyer/favorites` |
| 3 | Seller | `seller` | ✅ | 🚧 | Yes | `/seller/listings` |
| 4 | Real Estate Agent | `agent` | ✅ | 🚧 | Yes | `/agent/commissions` |
| 5 | Real Estate Agency | — | — | 📋 | — | — |
| 6 | Contractor | `contractor` | ✅ | 🚧 | Yes | `/contractor` |
| 7 | Engineer | `engineer` | ✅ | 🚧 | Yes | `/engineer` |
| 8 | Architect | `architect` | ✅ | 🚧 | Yes | `/architect` |
| 9 | Quantity Surveyor | — | — | 📋 | — | — |
| 10 | Interior Designer | — | — | 📋 | — | — |
| 11 | Building Materials Vendor | `vendor` | ✅ | 🚧 | Yes | `/vendor` |
| 12 | Hardware Store | — | — | 📋 | — | — |
| 13 | Property Lawyer | `lawyer` | ✅ | 🚧 | Yes | `/lawyer` |
| 14 | Property Manager | — | — | 📋 | — | — |
| 15 | Cleaning Service | — | — | 📋 | — | — |
| 16 | Maintenance Service | — | — | 📋 | — | — |
| 17 | Moving Service | — | — | 📋 | — | — |
| 18 | Surveyor | — | — | 📋 | — | — |
| 19 | Moderator | `moderator` | ❌ | 🚧 | Admin-assigned | None |
| 20 | Admin | `admin` | ✅ | ✅ | Admin-assigned | `/admin` |
| 21 | Super Admin | — | — | 📋 | — | — |

**Status key:**
- ✅ Implemented — code, DB, and RLS fully in place
- 🚧 Partially Implemented — DB role exists, onboarding works, but dashboard pages are stub/empty
- 📋 Planned — referenced in specification; no DB enum value, no code

---

## 2. Role Definitions

---

### 2.1 Guest

**Status: ✅ Implemented**

**Purpose:** Unauthenticated visitors. No account, no session, no `auth.uid()`. Can explore public-facing content and initiate registration.

**Registration process:** None. Guest becomes a user by clicking Register and completing the sign-up form.

**Verification requirements:** None.

**Dashboard:** None. Redirected to `/login` if they attempt to access any protected route.

**Navigation menu:** Public marketing nav only: Home, Properties, About, Contact, Login, Register.

**Permissions:**
- Read public property listings (anon SELECT on `properties` allowed by RLS)
- Read public `profiles` data (anon SELECT allowed by `profiles_select_all` policy after migration 20260714000001)
- No write access to any table

**Pages accessible:**
- `/` — home
- `/login`, `/register`, `/forgot-password`, `/reset-password` — auth routes
- `/onboarding` — after first login (before profile created)
- `/properties` — public listing browse (page file planned; not yet implemented)
- `/about`, `/contact` — public pages (not yet implemented)

**Tables accessed:**
- `properties` — anonymous SELECT (public listings only, RLS `USING (true)` on `prop_select`)
- `profiles` — anonymous SELECT (public data only, `profiles_select_all`)
- `property_categories`, `service_categories`, `product_categories`, `rental_categories` — public read (seeded data)
- `platform_settings` — public read (commission rates etc.)

**Storage buckets used:** None. Unauthenticated users have no storage access.

**Server actions:** None available pre-login.

**Features available:**
- Browse property listings (when implemented)
- View professional directory (when implemented)
- Create an account

**Restrictions:**
- No write access to any table
- Cannot save favorites, send inquiries, or access any `/buyer/*`, `/seller/*`, etc. route
- Redirected to `/login?redirectTo=<path>` for any protected route (enforced in `middleware.ts:61-66`)

**Upgrade path:** Register → become Buyer (default) or any registerable role.

**Suspension rules:** N/A — no account.

**Admin controls:** N/A.

**Planned future permissions:** Guest user can submit property inquiry without an account (lead-capture form).

---

### 2.2 Buyer (`buyer`)

**Status: ✅ Implemented**

**Purpose:** The default role for all new registrations. Property seekers who browse listings, save favorites, send inquiries, and manage their search.

**Registration process:**
1. Sign up at `/register` with role = `buyer` (or no role selected — buyer is default)
2. Complete onboarding flow at `/onboarding` (basic profile: name, city, phone)
3. `profiles.onboarding_completed` set to `true` via `completeOnboarding()` action
4. Redirected to `/buyer/favorites`

**Verification requirements:** None. Buyer accounts are active (`account_status = 'active'`) immediately after onboarding.

**Dashboard:** `/buyer/favorites`

**Navigation menu:** Browse Properties, My Favorites, My Inquiries, Account Settings, Wallet.

**Permissions:**
- SELECT own profile row; UPDATE own non-protected fields (name, city, phone, bio, avatar)
- INSERT/DELETE own `property_favorites`
- INSERT own `property_inquiries`
- SELECT/INSERT own `notifications`
- SELECT/INSERT own `wallets` (wallet created automatically on profile creation via `on_profile_created` trigger)
- No INSERT on `properties` (not a `PROPERTY_CREATOR_ROLES` member)

**Pages accessible:**
- All public routes
- `/buyer/*` (enforced: `ROLE_PROTECTED_PREFIXES['/buyer'] = ['buyer']`)
- `/account/*` — profile settings
- `/onboarding` — bypasses route guard
- `/admin` — blocked (redirected to `/buyer/favorites`)
- Any seller/agent/vendor/etc. route — blocked

**Tables accessed:**

| Table | Operations |
|-------|-----------|
| `profiles` | SELECT (own), UPDATE (own non-protected fields) |
| `property_favorites` | SELECT, INSERT, DELETE (own) |
| `property_inquiries` | SELECT, INSERT (own) |
| `properties` | SELECT (all active listings) |
| `property_images` | SELECT (public) |
| `property_categories` | SELECT |
| `wallets` | SELECT (own balance) |
| `notifications` | SELECT, UPDATE (own) |
| `activity_logs` | INSERT (own actions) |
| `reviews` | INSERT (own, after completed service) |

**Storage buckets used:**
- `avatars` — own avatar upload (INSERT own `{user_id}/{uuid}`)

**Server actions (from `src/lib/actions/auth.ts`):**
- `signIn` — authenticates and reads profile
- `signUp` — creates auth user + profile row
- `updateBasicProfile` — updates `profiles` basic fields
- `verifyPhoneOtp` — updates `profiles.phone, phone_verified`
- `completeOnboarding` — sets `profiles.onboarding_completed = true`
- `submitKycDocuments` — INSERT into `kyc_records` (buyer can submit KYC for premium features; not required for basic access)
- `submitAppeal` — INSERT into `account_appeals`

**Features available:**
- Browse all active property listings
- Save/unsave favorites
- Send inquiries to sellers/agents
- Receive notifications
- Basic profile management
- Wallet (view balance; top up planned)
- Submit KYC for premium features (optional)

**Restrictions:**
- Cannot list properties
- Cannot access `/seller`, `/agent`, `/vendor`, `/contractor`, `/engineer`, `/architect`, `/lawyer`, `/admin` routes
- Cannot earn commissions
- Cannot access verification documents of other users

**Upgrade path:**
- Admin can use `adminAssignRole()` to change role to any other role
- Role change takes effect on next page load (middleware reads `profiles.role`)

**Suspension rules:**
- Admin calls `adminSuspendAccount(userId, reason)` → sets `profiles.account_status = 'suspended'`
- On next request, middleware detects `account_status === 'suspended'`, calls `supabase.auth.signOut()`, redirects to `/login?error=account_suspended`
- `account_notices` row inserted automatically (type = 'suspension')

**Admin controls:**
- View at `/admin/users/[id]`
- Suspend / Activate via buttons (calls `adminSuspendAccount` / `adminActivateAccount`)
- Assign Role via dropdown (calls `adminAssignRole`)
- View wallet balance, registration date, recent activity

**Planned future permissions:**
- Mortgage calculator / financial pre-qualification tools
- Property comparison (side-by-side listings)
- Saved searches with email alerts
- Rental application submission
- Scheduled property viewings

---

### 2.3 Seller (`seller`)

**Status: 🚧 Partially Implemented**

**What works:** DB enum, RLS policies, onboarding (KYC submission), approval flow, `profiles.account_status` gate  
**What's missing:** `/seller/listings` dashboard page content, seller-specific property management UI

**Purpose:** Individuals who list their own properties for sale or rent on the platform.

**Registration process:**
1. Sign up at `/register` with role = `seller`
2. Complete basic onboarding at `/onboarding`
3. After basic onboarding, redirected to professional KYC sub-flow: upload national ID (front/back) → submits `kyc_records` (level='basic', status='pending')
4. `profiles.account_status` set to `'pending_verification'` (via `completeAgentProfile` / similar — NOTE: no dedicated `completeSellerProfile` action exists; `submitKycDocuments` handles KYC, but `account_status` update to `pending_verification` is missing for seller in current code — see inconsistency I-SELLER-1)
5. Admin reviews at `/admin/professionals` → calls `adminApproveProfessional()` → sets `profiles.account_status = 'active'`, `profiles.is_verified = true`
6. NOTE: `adminApproveProfessional` does not handle the `seller` branch specifically — this is a known gap (inconsistency I1 in `docs/02_DATABASE_SCHEMA.md`)

**Verification requirements:**
- National ID (front + back) — uploaded to `verification-documents` bucket
- Documents reviewed by admin/moderator
- No license verification required (unlike agents/professionals)

**Dashboard:** `/seller/listings` (route exists; page content is stub/minimal)

**Navigation menu:** My Listings, Add Property, Inquiries, Wallet, Account Settings.

**Permissions:**
- All Buyer permissions
- INSERT `properties` (`prop_insert` policy: `is_property_creator() AND has_active_account()`)
- UPDATE own `properties`
- DELETE own `properties`
- INSERT `property_images` (own properties)
- INSERT `property_verifications` (`propverif_owner_insert` policy, migration 20260615000003)
- SELECT own `kyc_records`
- INSERT own `kyc_records`

**Pages accessible:**
- All Buyer-accessible routes
- `/seller/*` (enforced by `ROLE_PROTECTED_PREFIXES['/seller'] = ['seller', 'agent']`)
- Note: cannot access `/agent/*` (agent-only prefix)

**Tables accessed:**

| Table | Operations |
|-------|-----------|
| `profiles` | SELECT (own), UPDATE (own) |
| `properties` | SELECT (all), INSERT (own), UPDATE (own), DELETE (own) |
| `property_images` | SELECT, INSERT, DELETE (own properties) |
| `property_verifications` | SELECT (own), INSERT (own) |
| `property_inquiries` | SELECT (incoming, on own properties) |
| `property_favorites` | SELECT (own) |
| `kyc_records` | SELECT (own), INSERT (own) |
| `wallets` | SELECT (own) |
| `escrow_transactions` | SELECT (own as payee) |
| `notifications` | SELECT, UPDATE (own) |
| `reviews` | SELECT (own received) |

**Storage buckets used:**
- `avatars` — profile avatar
- `property-images` — property listing photos (`{user_id}/{property_id}/{uuid}.ext`)
- `verification-documents` — KYC document upload (`{user_id}/{uuid}.ext`)

**Server actions:**
- All Buyer actions
- `submitKycDocuments` — INSERT `kyc_records` (level='basic', status='pending')
- (No dedicated `completeSellerProfile` action — gap in current implementation)

**Features available (when `account_status = 'active'`):**
- List properties for sale or rent
- Upload up to 20 property images (platform setting `max_property_images=20`)
- Receive inquiries from buyers
- Manage listing status (active/pending/sold/rented)
- View wallet balance (escrow releases)
- Request property verification (submit to `property_verifications`)

**Restrictions:**
- Cannot list properties when `account_status = 'pending_verification'` or `'suspended'` (enforced by `has_active_account()` in RLS `prop_insert` policy)
- Cannot access `/agent` route (agent-only)
- Cannot earn agent commissions (no `agent_profiles` row)
- Cannot access vendor/professional routes

**Upgrade path:**
- Admin can reassign to `agent` role (via `adminAssignRole`)

**Suspension rules:** Same as Buyer (middleware catches suspended status on next request).

**Admin controls:**
- View at `/admin/users/[id]`, `/admin/professionals`
- Approve / Reject KYC at `/admin/professionals`
- Suspend / Activate / Assign Role

**Planned future permissions:**
- Featured listing promotion (fee: 15,000 XAF per `platform_settings.featured_listing_fee_xaf`)
- Rental management panel (tenant payments, maintenance requests)
- Analytics dashboard (views, inquiries, conversion rates)

---

### 2.4 Real Estate Agent (`agent`)

**Status: 🚧 Partially Implemented**

**What works:** DB enum, RLS, onboarding flow (`completeAgentProfile`), approval flow, agent_profiles table, commissions table  
**What's missing:** `/agent/commissions` page content, commission calculation logic, client management UI

**Purpose:** Licensed real estate professionals who represent buyers or sellers and earn commissions on transactions.

**Registration process:**
1. Sign up at `/register` with role = `agent`
2. Complete basic onboarding
3. Complete professional sub-flow: `completeAgentProfile()` — upserts `agent_profiles` (license_number, specialization, agency_name, years_experience); sets `profiles.account_status = 'pending_verification'`
4. Upload KYC documents (national ID + professional license) via `submitKycDocuments()`
5. Admin reviews at `/admin/professionals` → `adminApproveProfessional()` → sets `profiles.account_status = 'active'`, `profiles.is_verified = true`, `agent_profiles.license_verified = true`

**Verification requirements:**
- National ID (front + back)
- Professional license number (stored in `agent_profiles.license_number`)
- License verification by admin (`agent_profiles.license_verified` boolean)

**Dashboard:** `/agent/commissions` (route defined; page is stub)

**Navigation menu:** My Listings, Client Requests, Commissions, Wallet, Account Settings.

**Permissions:**
- All Seller permissions (agent is also a property creator)
- Agent also has `/seller` route access: `ROLE_PROTECTED_PREFIXES['/seller'] = ['seller', 'agent']`
- Agent-exclusive `/agent` route access: `ROLE_PROTECTED_PREFIXES['/agent'] = ['agent']`
- INSERT `properties` (as property creator)
- SELECT/INSERT `commissions` (own)
- SELECT/INSERT `agent_profiles` (own)

**Specializations (from `ROLE_SPECIALIZATIONS`):**
- `buyer_agent`, `seller_agent`, `commercial_agent`, `rental_agent`, `property_manager`

**Pages accessible:**
- All Buyer-accessible routes
- `/seller/*` (shared with seller role)
- `/agent/*` (agent-exclusive)
- Cannot access `/admin`, `/vendor`, `/contractor`, `/engineer`, `/architect`, `/lawyer`

**Tables accessed:**

| Table | Operations |
|-------|-----------|
| `profiles` | SELECT (own + client profiles), UPDATE (own) |
| `properties` | SELECT (all), INSERT (own), UPDATE (own) |
| `agent_profiles` | SELECT (own), INSERT/UPDATE (own) |
| `commissions` | SELECT (own), INSERT (own) |
| `property_inquiries` | SELECT (incoming on own listings) |
| `property_images` | INSERT/DELETE (own listings) |
| `property_verifications` | INSERT (own listings) |
| `kyc_records` | SELECT (own), INSERT (own) |
| `wallets` | SELECT (own) |
| `escrow_transactions` | SELECT (as agent party) |
| `notifications` | SELECT, UPDATE (own) |

**Storage buckets used:**
- `avatars` — profile photo
- `property-images` — listing images
- `verification-documents` — national ID + license
- `service-portfolios` — portfolio of past work (planned)

**Server actions:**
- All Buyer actions
- `completeAgentProfile` — upserts `agent_profiles`, sets `account_status = 'pending_verification'`
- `submitKycDocuments` — INSERT `kyc_records`

**Features available (when active):**
- List properties on behalf of clients
- Access to `/seller` routes (same listing management UI as sellers)
- Earn commissions (SELECT `commissions` table; INSERT by system on transaction completion)
- Professional profile visible in `/professionals` directory
- Request property verification

**Restrictions:**
- Cannot list properties when `account_status ≠ 'active'` (enforced by `has_active_account()` in RLS)
- Cannot access vendor/contractor/engineer/architect/lawyer routes

**Upgrade path:** N/A (agent is a top-tier professional role; can be reassigned by admin to other roles).

**Suspension rules:** Same as Buyer.

**Admin controls:**
- View at `/admin/professionals` and `/admin/users/[id]`
- Approve license via `adminApproveProfessional()` (sets `agent_profiles.license_verified = true`)
- Reject with reason (inserts `account_notices` type='rejection')
- Suspend / Activate / Assign Role

**Planned future permissions:**
- Multi-listing management
- Client pipeline (CRM)
- Commission split with agency
- Property tour booking management
- Automated commission calculation on escrow release

---

### 2.5 Real Estate Agency — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Umbrella entity that groups multiple agents under one licensed agency brand. Allows agency admins to manage their agents, share listings, and aggregate commissions.

**Registration process:** Not implemented.

**Verification requirements:** Business registration certificate + real estate agency license.

**Dashboard:** Planned — `/agency/dashboard`

**Navigation menu:** Not defined.

**Permissions:** Not defined. Planned: manage sub-agents, view agency-level analytics, bulk list properties.

**Pages accessible:** None.

**Tables accessed:** None (no schema).

**Storage buckets used:** Planned: `verification-documents` for business registration.

**Server actions:** None.

**Features available:** None.

**Restrictions:** N/A.

**Upgrade path:** N/A.

**Suspension rules:** N/A.

**Admin controls:** N/A.

**Planned future permissions:**
- Sub-agent management (invite, remove agents)
- Agency-branded profile page
- Commission aggregation report
- Agency verification badge
- Multiple office locations

**Database work needed:** New `user_role` enum value `agency`, new `agency_profiles` table (name, license_number, license_verified, agency_admin_id), relationship table `agency_agents`.

---

### 2.6 Contractor (`contractor`)

**Status: 🚧 Partially Implemented**

**What works:** DB enum, RLS, professional onboarding flow (`completeProfessionalProfile`), `professional_profiles` table, KYC flow, approval via `adminApproveProfessional`  
**What's missing:** `/contractor` dashboard page content, job board UI, service listing management

**Purpose:** Construction and renovation professionals who offer skilled trade services on the platform.

**Registration process:**
1. Sign up with role = `contractor`
2. Complete basic onboarding
3. `completeProfessionalProfile()` — upserts `professional_profiles` (profession_type='contractor', company_name, day_rate, service_areas, experience_years, is_available); sets `profiles.account_status = 'pending_verification'`
4. Upload KYC: national ID + business registration
5. Admin approves: `adminApproveProfessional()` → sets `account_status = 'active'`, `is_verified = true`, `professional_profiles.is_verified = true`, `professional_profiles.license_verified = true`

**Verification requirements:**
- National ID
- Business registration or trade license
- KYC level: 'basic'

**Dashboard:** `/contractor` (stub page)

**Specializations (from `ROLE_SPECIALIZATIONS`):**
`general_construction`, `plumbing`, `electrical`, `tiling`, `roofing`, `painting`, `carpentry`, `glass_aluminum`

**Permissions:**
- All Buyer permissions
- SELECT/INSERT/UPDATE own `professional_profiles`
- INSERT `service_listings` (own)
- SELECT/INSERT/UPDATE `service_requests` (own as provider)
- SELECT own `kyc_records`, INSERT own
- SELECT own `wallets`, `escrow_transactions`
- INSERT `portfolio_items` (own)

**Pages accessible:**
- All Buyer routes
- `/contractor/*` (`ROLE_PROTECTED_PREFIXES['/contractor'] = ['contractor']`)
- Cannot access `/seller`, `/agent`, `/vendor`, `/engineer`, `/architect`, `/lawyer`, `/admin`

**Tables accessed:**

| Table | Operations |
|-------|-----------|
| `profiles` | SELECT (own), UPDATE (own) |
| `professional_profiles` | SELECT (own), INSERT/UPDATE (own) |
| `service_listings` | SELECT (all), INSERT/UPDATE/DELETE (own) |
| `service_requests` | SELECT (own as provider), UPDATE (status) |
| `portfolio_items` | SELECT, INSERT, DELETE (own) |
| `kyc_records` | SELECT (own), INSERT (own) |
| `wallets` | SELECT (own) |
| `escrow_transactions` | SELECT (own as payee) |
| `jobs` | SELECT (all relevant jobs), INSERT (own job postings) |
| `job_applications` | SELECT (own), INSERT (own) |
| `notifications` | SELECT, UPDATE (own) |
| `reviews` | SELECT (received), INSERT (for completed services) |

**Storage buckets used:**
- `avatars`
- `verification-documents` — national ID + business registration
- `service-portfolios` — portfolio images/documents (`{user_id}/{uuid}`)

**Server actions:**
- All Buyer actions
- `completeProfessionalProfile` — upserts `professional_profiles`, sets `account_status = 'pending_verification'`
- `submitKycDocuments` — INSERT `kyc_records`

**Features available (when active):**
- Create service listings
- Receive service requests from buyers/property owners
- Apply to construction jobs (from `jobs` table)
- Manage portfolio
- Receive payments via escrow

**Restrictions:**
- Cannot list properties
- Cannot access other professional routes
- Service listings only visible when `account_status = 'active'`

**Upgrade path:** Admin role reassignment only.

**Suspension rules:** Same as Buyer.

**Admin controls:** Same as Agent (approve/reject KYC, suspend/activate, assign role).

**Planned future permissions:**
- Milestone-based payment tracking
- Team/worker management
- Material procurement through marketplace
- Tender application submission
- Project management dashboard

---

### 2.7 Engineer (`engineer`)

**Status: 🚧 Partially Implemented**

**What works:** DB enum, RLS, professional onboarding, `professional_profiles`, KYC, approval  
**What's missing:** `/engineer` dashboard page content

**Purpose:** Civil, structural, electrical, and other engineering professionals who provide technical consultancy and design services.

**Registration process:** Same pattern as Contractor (using `completeProfessionalProfile` with `profession_type = 'engineer'`).

**Verification requirements:** National ID + professional engineering license + licensing board registration.

**Dashboard:** `/engineer` (stub page)

**Specializations (from `ROLE_SPECIALIZATIONS`):**
`civil`, `structural`, `mechanical`, `electrical`, `geotechnical`, `environmental`, `quantity_surveying`

Note: `quantity_surveying` is an engineer specialization in the DB, but Quantity Surveyor is listed as a separate role in the specification. This is an inconsistency.

**Permissions:** Same pattern as Contractor (substitute `professional_profiles` with `profession_type='engineer'`).

**Pages accessible:**
- All Buyer routes
- `/engineer/*` (`ROLE_PROTECTED_PREFIXES['/engineer'] = ['engineer']`)

**Tables accessed:** Same as Contractor.

**Storage buckets used:** Same as Contractor.

**Server actions:** Same as Contractor (`completeProfessionalProfile` with profession_type='engineer').

**Features available (when active):**
- Create engineering service listings
- Accept consultancy service requests
- Manage project portfolio
- Tender applications
- Escrow-gated project payments

**Restrictions:** Same pattern as Contractor.

**Upgrade path:** Admin role reassignment only.

**Suspension rules / Admin controls:** Same as Contractor.

**Planned future permissions:**
- Structural report generation tools
- Integration with building permit submission (government API planned)
- Engineering calculation tools

---

### 2.8 Architect (`architect`)

**Status: 🚧 Partially Implemented**

**What works:** DB enum, RLS, professional onboarding, `professional_profiles`, KYC, approval  
**What's missing:** `/architect` dashboard page content

**Purpose:** Licensed architects who offer architectural design, planning, and urban planning services.

**Registration process:** Same as Contractor (profession_type = 'architect').

**Verification requirements:** National ID + architectural license + Order of Architects registration.

**Dashboard:** `/architect` (stub page)

**Specializations (from `ROLE_SPECIALIZATIONS`):**
`residential`, `commercial`, `landscape`, `urban_planning`, `interior_design`

Note: `interior_design` is an architect specialization in the DB, but Interior Designer is listed as a separate role in the specification. This is an inconsistency.

**Permissions / Pages / Tables / Buckets / Actions:** Same pattern as Contractor.

**Features available (when active):**
- Create architectural service listings
- Accept design project requests
- Portfolio showcasing (renders, floor plans, 3D models)
- Tender applications

**Planned future permissions:**
- AR/VR property visualization integration
- CAD file sharing per project
- Planning permit status tracking

**Suspension rules / Admin controls:** Same as Contractor.

---

### 2.9 Quantity Surveyor — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Professionals who estimate and manage costs in construction projects. Currently represented as a specialization under the `engineer` role (`ROLE_SPECIALIZATIONS.engineer` includes `quantity_surveying`).

**Why it's split in the specification:** Quantity Surveying is a distinct profession (QS) with different licensing requirements from civil/structural engineering. The specification calls for a dedicated role.

**Planned DB work needed:**
- New `user_role` enum value `quantity_surveyor`
- New `ROLE_SPECIALIZATIONS.quantity_surveyor` entries
- Dashboard route `/quantity-surveyor`
- Middleware route prefix entry

**All other fields:** Not defined. Will follow same pattern as Engineer when implemented.

---

### 2.10 Interior Designer — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Design professionals specializing in interior space planning and decoration. Currently represented as a specialization under `architect` role (`ROLE_SPECIALIZATIONS.architect` includes `interior_design`).

**Planned DB work needed:**
- New `user_role` enum value `interior_designer`
- Dashboard route `/interior-designer`
- Middleware route prefix entry

**All other fields:** Not defined. Will follow same pattern as Architect when implemented.

---

### 2.11 Building Materials Vendor (`vendor`)

**Status: 🚧 Partially Implemented**

**What works:** DB enum, RLS, onboarding (`completeVendorProfile`), `vendor_profiles` table, KYC flow, approval (partial — `adminApproveProfessional` missing vendor branch — inconsistency I1)  
**What's missing:** `/vendor` dashboard page content, product listing UI, order management UI

**Purpose:** Businesses or individuals who sell building materials, construction supplies, and related products through the platform marketplace.

**Registration process:**
1. Sign up with role = `vendor`
2. Complete basic onboarding
3. `completeVendorProfile()` — upserts `vendor_profiles` (store_name, store_slug, store_description); sets `profiles.account_status = 'pending_verification'`
4. Upload KYC: business registration documents
5. Admin approves: `adminApproveProfessional()` — NOTE: vendor branch is missing in current implementation (inconsistency I1 in schema doc). Does NOT set `vendor_profiles.is_verified`. This is a known code gap.

**Verification requirements:**
- Business registration certificate
- Store information (name, slug, description)

**Dashboard:** `/vendor` (stub page)

**Permissions:**
- All Buyer permissions
- SELECT/INSERT/UPDATE own `vendor_profiles`
- INSERT `marketplace_products` (own store; storage INSERT requires `vendor_profiles` row in RLS)
- UPDATE/DELETE own `marketplace_products`
- SELECT `orders` (own as seller)
- SELECT/UPDATE `order_items` (own as seller)
- SELECT own `wallets`, `escrow_transactions`

**Pages accessible:**
- All Buyer routes
- `/vendor/*` (`ROLE_PROTECTED_PREFIXES['/vendor'] = ['vendor']`)

**Tables accessed:**

| Table | Operations |
|-------|-----------|
| `profiles` | SELECT (own), UPDATE (own) |
| `vendor_profiles` | SELECT (own), INSERT/UPDATE (own) |
| `marketplace_products` | SELECT (all active), INSERT/UPDATE/DELETE (own) |
| `product_images` | INSERT/DELETE (own products) |
| `orders` | SELECT (own as vendor) |
| `order_items` | SELECT, UPDATE (own as vendor) |
| `kyc_records` | SELECT (own), INSERT (own) |
| `wallets` | SELECT (own) |
| `escrow_transactions` | SELECT (own as payee) |
| `notifications` | SELECT, UPDATE (own) |
| `reviews` | SELECT (received for own products) |

**Storage buckets used:**
- `avatars`
- `verification-documents` — business registration
- `marketplace-products` — product photos (INSERT requires `vendor_profiles` row existence, enforced in storage RLS)

**Server actions:**
- All Buyer actions
- `completeVendorProfile` — upserts `vendor_profiles` (store_name, store_slug), sets `account_status = 'pending_verification'`
- `submitKycDocuments` — INSERT `kyc_records`

**Features available (when active):**
- Create and manage product listings
- Receive orders
- Manage order status
- Receive payments via escrow

**Restrictions:**
- Cannot list properties
- Cannot access professional routes
- Product listings only visible when `account_status = 'active'`

**Known code gap:** `adminApproveProfessional` in `auth.ts` has no `vendor` branch — does not set `vendor_profiles.is_verified`. Must be fixed before vendor approval flow is complete.

**Suspension rules / Admin controls:** Same pattern as other roles.

**Planned future permissions:**
- Inventory management
- Discount and promotional pricing
- Bulk upload
- Delivery tracking integration
- MTN Mobile Money payout (already enabled in platform_settings: `mtn_momo_enabled=true`)

---

### 2.12 Hardware Store — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Brick-and-mortar hardware stores that want to list products online. Distinguished from Building Materials Vendor by physical location focus and hardware product category.

**Planned DB work needed:**
- New `user_role` enum value `hardware_store`
- Dashboard route `/hardware-store`
- Middleware route prefix entry
- Possible `hardware_store_profiles` table

**All other fields:** Not defined. Will follow same pattern as Vendor when implemented.

---

### 2.13 Property Lawyer (`lawyer`)

**Status: 🚧 Partially Implemented**

**What works:** DB enum, RLS, professional onboarding, `professional_profiles`, KYC, approval  
**What's missing:** `/lawyer` dashboard page content, legal service booking UI

**Purpose:** Licensed legal professionals specializing in property law — conveyancing, land title verification, dispute resolution, and commercial leasing.

**Registration process:** Same as Contractor (profession_type = 'lawyer').

**Verification requirements:** National ID + bar association membership + law license number.

**Dashboard:** `/lawyer` (stub page)

**Specializations (from `ROLE_SPECIALIZATIONS`):**
`conveyancing`, `land_disputes`, `property_tax`, `commercial_leasing`, `development_law`, `estate_planning`

**Permissions / Pages / Tables / Buckets / Actions:** Same pattern as Contractor.

**Pages accessible:**
- All Buyer routes
- `/lawyer/*` (`ROLE_PROTECTED_PREFIXES['/lawyer'] = ['lawyer']`)

**Features available (when active):**
- Legal service listings
- Consultation booking
- Document review services (via service_requests)
- Escrow-gated consultation fees

**Planned future permissions:**
- e-conveyancing integration
- Land title search tool
- Contract template library
- Document e-signing

**Suspension rules / Admin controls:** Same as Contractor.

---

### 2.14 Property Manager — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Professionals who manage rental properties on behalf of landlords — tenant screening, rent collection, maintenance coordination.

**Registration process:** Not implemented.

**Verification requirements:** Planned: property management license or company registration.

**Dashboard:** Planned: `/property-manager`

**Planned DB work needed:**
- New `user_role` enum value `property_manager`
- New `property_manager_profiles` table
- Middleware route prefix
- Tables for managed property relationships (link manager ↔ properties owned by others)

**All other fields:** Not defined.

---

### 2.15 Cleaning Service — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Professional cleaning companies or freelancers offering residential and commercial cleaning services.

**Planned DB work needed:** New `user_role` enum value `cleaning_service`, dashboard route, middleware prefix, service-specific profile data.

**All other fields:** Not defined. Will follow professional role pattern.

---

### 2.16 Maintenance Service — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Property maintenance professionals (HVAC, plumbing repair, electrical repair, general maintenance).

**Planned DB work needed:** New `user_role` enum value `maintenance_service`, dashboard route, middleware prefix.

**Note:** Some maintenance services overlap with `contractor` specializations (`plumbing`, `electrical`). The specification intends Maintenance Service for ongoing/recurring property upkeep vs. Contractor for construction projects.

**All other fields:** Not defined.

---

### 2.17 Moving Service — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Removal and relocation companies offering furniture moving, packing, and transport services within and between cities.

**Planned DB work needed:** New `user_role` enum value `moving_service`, dashboard route, middleware prefix.

**All other fields:** Not defined.

---

### 2.18 Surveyor — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Land surveyors who provide boundary surveys, topographic surveys, and land measurement services — critical for property disputes and land title registration in Cameroon.

**Registration process:** Not implemented.

**Planned DB work needed:** New `user_role` enum value `surveyor`, dashboard route, middleware prefix, surveyor-specific profile table.

**All other fields:** Not defined.

---

### 2.19 Moderator (`moderator`) — 🚧 Partial

**Status: 🚧 Partially Implemented**

**What exists in DB:** `moderator` is a valid value in the `user_role` enum (`20260610000002_enums.sql`)

**What is missing from code:**
- NOT in TypeScript `UserRole` type (`src/types/auth.ts`) — major gap
- NOT in `ROLE_DASHBOARDS` — no dashboard route defined
- NOT in `ROLE_LABELS` / `ROLE_DESCRIPTIONS`
- Cannot be assigned via `adminAssignRole()` because `UserRole` type doesn't include it
- Cannot complete normal onboarding flow (no ROLE_DASHBOARDS entry to redirect to)

**What partially works:**
- `is_moderator()` SECURITY DEFINER function returns `true` for both `admin` AND `moderator` roles
- KYC review: `kyc_mod_all` RLS policy grants moderators ALL access to `kyc_records`
- Storage: `lzs_verifydoc_select` storage policy allows moderators to SELECT verification documents
- Storage: `lzs_propimg_select` policy allows moderators access to all property images

**Purpose (intended):** A sub-admin role that can review verification documents and moderate content without having full admin access (e.g., cannot assign roles, cannot view admin audit logs).

**How to assign currently:** Only possible via direct DB UPDATE: `UPDATE profiles SET role = 'moderator' WHERE id = '...'` — cannot be done through the application UI.

**Admin controls:** Cannot manage moderators through UI (not in TypeScript types).

**Planned future permissions:**
- Own dashboard (e.g., `/moderator/queue`)
- Review KYC documents
- Approve/reject professional verifications
- Content moderation (flag/remove listings)
- View reports

**DB work needed to complete:**
- Add `'moderator'` to `UserRole` type in `src/types/auth.ts`
- Add to `ROLE_DASHBOARDS`, `ROLE_LABELS`, `ROLE_DESCRIPTIONS`
- Add to `ROLE_PROTECTED_PREFIXES` for `/moderator` route
- Create `/moderator` dashboard pages
- Add to admin role-assignment UI (currently `ALL_ROLES` in `/admin/users/page.tsx` doesn't include moderator)

---

### 2.20 Admin (`admin`)

**Status: ✅ Implemented**

**Purpose:** Platform administrators with full access to all data, user management, verification workflows, and system configuration.

**Registration process:**
- Admin accounts are created via a special code path in `signUp()`:
  - PATH A (admin): When `email` matches an environment variable (`ADMIN_EMAIL` or similar), `signUp` calls `createAdminClient().from('profiles').upsert(...)` directly — bypasses normal Supabase auth flow
  - PATH B: Existing users can be promoted to admin via `adminAssignRole(userId, 'admin')`
- Admin accounts should have `onboarding_completed = true` set directly (migration 20260610000020 backfills this for existing admins)

**Verification requirements:** None (admin accounts are created or promoted by existing admins; trust is implicit).

**Dashboard:** `/admin`

**Navigation menu:** Dashboard, Users, Professionals (Verifications), Audit Logs (planned), Settings.

**Permissions (middleware):**
- `userRole === 'admin'` → passes through ALL `ROLE_PROTECTED_PREFIXES` checks unconditionally (`middleware.ts:118-121`)
- Admin can access `/buyer/*`, `/seller/*`, `/agent/*`, `/vendor/*`, `/contractor/*`, `/engineer/*`, `/architect/*`, `/lawyer/*`, `/admin/*` — all dashboards

**RLS-level permissions:**
- `profiles_admin_all` — ALL on `profiles` (SELECT, INSERT, UPDATE, DELETE) via `is_admin()`
- `kyc_mod_all` — ALL on `kyc_records` via `is_moderator()` (admin qualifies)
- All SECURITY DEFINER functions: `get_admin_metrics()`, `get_admin_activity()`, `is_admin()`, `is_moderator()`
- `admin_logs` — SELECT (own logs) and system-inserted rows
- `activity_logs` — ALL (via admin policy)

**Pages accessible:**
- All routes on the platform (middleware grants admin universal access)
- `/admin` — dashboard with metrics, activity feed, recent users
- `/admin/users` — paginated user list with role/status filters
- `/admin/users/[id]` — user detail page (implemented this session)
- `/admin/professionals` — pending verification queue

**Tables accessed:**

| Table | Operations |
|-------|-----------|
| `profiles` | ALL (via `profiles_admin_all`) |
| `kyc_records` | ALL (via `kyc_mod_all`) |
| `admin_logs` | SELECT, INSERT |
| `activity_logs` | ALL |
| `account_notices` | SELECT, INSERT, UPDATE (via server actions with adminClient) |
| `account_appeals` | SELECT, UPDATE (via server actions with adminClient) |
| `wallets` | SELECT (any user) |
| `properties` | ALL (via admin passthrough) |
| `commissions` | SELECT |
| `escrow_transactions` | SELECT |
| `orders` | SELECT |
| `notifications` | SELECT, INSERT (for approval/rejection notifications) |
| `platform_settings` | SELECT, UPDATE (planned) |
| `password_reset_attempts` | SELECT, INSERT (via adminClient in `forgotPassword`) |
| `account_recovery_requests` | SELECT, INSERT (via adminClient in `submitAccountRecoveryRequest`) |

**Storage buckets used:**
- All buckets — admin can access all storage via `createAdminClient().storage` (service-role bypass)
- Specifically: `verification-documents` — signed URL generation for KYC review (3600s TTL)

**Server actions (admin-only, from `src/lib/actions/auth.ts`):**

| Action | What it does |
|--------|--------------|
| `adminAssignRole(userId, role)` | UPDATE `profiles.role` via adminClient |
| `adminSuspendAccount(userId, reason)` | UPDATE `profiles.account_status = 'suspended'`; INSERT `admin_logs`; INSERT `account_notices` (type='suspension') via adminClient |
| `adminActivateAccount(userId)` | UPDATE `profiles.account_status = 'active'` via adminClient |
| `adminApproveProfessional(userId)` | UPDATE `profiles.account_status='active'`, `is_verified=true`; UPDATE `agent_profiles.license_verified` OR `professional_profiles.is_verified, license_verified`; UPDATE `kyc_records.status='approved'` (missing seller/vendor branches — known gap) |
| `adminRejectProfessional(userId, reason)` | UPDATE `kyc_records.status='rejected'`; INSERT `account_notices` (type='rejection') via adminClient |

**RPC functions used:**
- `get_admin_metrics()` — returns JSONB with 12 platform metrics (used on `/admin` page)
- `get_admin_activity(p_limit)` — returns activity feed rows (used on `/admin` page)

**Features available:**
- Full user management (view, suspend, activate, assign roles)
- Verification document review (signed URL access to `verification-documents` bucket)
- Professional approval/rejection workflow
- Platform metrics dashboard
- Activity feed
- Direct DB-level access via admin client (service_role key)

**Restrictions:**
- Admin cannot self-suspend (UI check: `u.id !== profile.id` before showing suspend button in `/admin/users`)
- Admin cannot delete their own account through UI
- `get_admin_metrics()` and `get_admin_activity()` raise exceptions for non-admin callers (SECURITY DEFINER guard)

**Upgrade path:** N/A (highest implemented role).

**Suspension rules:** Admin cannot be suspended via UI (self-protection). Another admin can update via direct DB or override.

**Admin controls:** Managed by other admins. No dedicated super-admin override exists.

**Planned future permissions:**
- Platform settings management (commission rates, feature flags)
- Financial oversight (payout approvals, escrow management)
- Content moderation
- Bulk user actions
- Export reports (CSV/PDF)
- Audit log viewer (`/admin/audit` — planned but not implemented)

---

### 2.21 Super Admin — 📋 Not in DB

**Status: 📋 Planned**

**Purpose:** Highest privilege level. Can manage admin accounts, override any admin action, access financial controls, and configure platform-wide settings. Intended to be held by platform founders only.

**Registration process:** Not implemented.

**Planned capabilities:**
- All Admin permissions
- Manage/demote/suspend other admin accounts
- Approve platform-level financial operations (large payouts, escrow overrides)
- Enable/disable platform features globally
- Access raw database export
- View all admin audit logs including other admins' actions

**Planned DB work needed:**
- New `user_role` enum value `super_admin`
- New `is_super_admin()` SECURITY DEFINER function
- Dedicated RLS policies for super-admin-only tables
- Dashboard at `/super-admin`
- Middleware prefix entry `['/super-admin'] = ['super_admin']`

**Current workaround:** Super admin responsibilities are handled manually via direct Supabase dashboard access by the platform founders.

---

## 3. Permission Matrix

**Legend:** ✅ Full access | 🚧 Partial/conditional | ❌ No access | 📋 Planned only

| Capability | Guest | Buyer | Seller | Agent | Vendor | Contractor | Engineer | Architect | Lawyer | Moderator | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Authentication** | | | | | | | | | | | |
| Register account | ✅ | — | — | — | — | — | — | — | — | — | — |
| Log in | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚧¹ | ✅ |
| Complete onboarding | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚧 | ✅ |
| Reset password | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚧 | ✅ |
| **Profile** | | | | | | | | | | | |
| View own profile | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View other profiles | ✅² | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change own role | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Set own is_verified | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Properties** | | | | | | | | | | | |
| Browse listings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create listing | ❌ | ❌ | 🚧³ | 🚧³ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit own listing | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete own listing | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Upload property images | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Submit property verification | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Save favorites | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send inquiry | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Marketplace** | | | | | | | | | | | |
| Browse products | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| List products for sale | ❌ | ❌ | ❌ | ❌ | 🚧⁴ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Place product order | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage own orders (vendor) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Services** | | | | | | | | | | | |
| Browse services | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| List own services | ❌ | ❌ | ❌ | ❌ | ❌ | 🚧⁵ | 🚧⁵ | 🚧⁵ | 🚧⁵ | ❌ | ✅ |
| Book a service | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage service requests | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Jobs / Tenders** | | | | | | | | | | | |
| Browse jobs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Apply for jobs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Post jobs/tenders | ❌ | ✅ | ✅ | ✅ | ✅ | 📋 | 📋 | 📋 | 📋 | ❌ | ✅ |
| **KYC / Verification** | | | | | | | | | | | |
| Submit KYC documents | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View own KYC records | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| View all KYC records | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve/reject KYC | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚧⁶ | ✅ |
| View verification docs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Wallet / Payments** | | | | | | | | | | | |
| View own wallet | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Initiate transfer | ❌ | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | ❌ | ✅ |
| Receive escrow payment | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Earn commissions | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Request payout | ❌ | ❌ | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | ❌ | ✅ |
| **Notifications** | | | | | | | | | | | |
| Receive notifications | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Community / Forum** | | | | | | | | | | | |
| View forum posts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create forum posts | ❌ | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | ❌ | ✅ |
| React to posts | ❌ | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 | ❌ | ✅ |
| **Admin Panel** | | | | | | | | | | | |
| Access `/admin` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Suspend/activate accounts | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Assign roles | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View platform metrics | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View admin activity feed | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Generate signed doc URLs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅⁷ | ✅ |

**Notes:**
1. Moderator can log in if a row exists in `profiles` with `role='moderator'`, but has no dashboard (`ROLE_DASHBOARDS` has no entry), so the redirect fails. Currently broken.
2. Guests can SELECT `profiles` because `profiles_select_all` policy has `USING (true)` and grants SELECT to `anon` role (restored in migration 20260714000001).
3. Seller/Agent can only create listings when `account_status = 'active'` (enforced by `has_active_account()` in `prop_insert` RLS policy).
4. Vendor can only list products when `account_status = 'active'` AND a `vendor_profiles` row exists (enforced in storage RLS for `marketplace-products`).
5. Professional services listing UI is not yet built, though the DB tables and RLS exist.
6. Moderator CAN review KYC (RLS `kyc_mod_all` policy uses `is_moderator()` which includes moderator role), but has no UI (no moderator dashboard). Storage access for verification docs also works at RLS level.
7. Moderator has RLS SELECT access to `verification-documents` bucket (`lzs_verifydoc_select` policy uses `is_moderator()`), but no admin client means they cannot generate signed URLs — the UI for this uses `createAdminClient()` which requires `is_admin()`.

---

## 4. Final Summary

### Role counts

| Category | Count |
|----------|-------|
| Roles with DB enum value | 10 (`admin`, `moderator`, `buyer`, `seller`, `agent`, `vendor`, `contractor`, `engineer`, `architect`, `lawyer`) |
| Roles in TypeScript `UserRole` type | 9 (excludes `moderator`) |
| Roles self-registerable | 8 (excludes `admin`, `moderator`) |
| Roles requiring approval | 7 (`seller`, `vendor`, `agent`, `contractor`, `engineer`, `architect`, `lawyer`) |
| Roles with working dashboard pages | 3 (`admin`, `buyer`, `seller`/`agent` stub only) |
| Planned roles with no DB implementation | 10 (`real_estate_agency`, `quantity_surveyor`, `interior_designer`, `hardware_store`, `property_manager`, `cleaning_service`, `maintenance_service`, `moving_service`, `surveyor`, `super_admin`) |

### Implemented vs planned

| Status | Roles |
|--------|-------|
| ✅ Fully implemented | Guest, Buyer, Admin |
| 🚧 Partially implemented | Seller, Agent, Vendor, Contractor, Engineer, Architect, Lawyer, Moderator |
| 📋 Planned only | Real Estate Agency, Quantity Surveyor, Interior Designer, Hardware Store, Property Manager, Cleaning Service, Maintenance Service, Moving Service, Surveyor, Super Admin |

### Route protection summary

| Route prefix | Allowed roles | Enforced by |
|---|---|---|
| `/buyer` | `buyer` | `ROLE_PROTECTED_PREFIXES` + middleware |
| `/seller` | `seller`, `agent` | `ROLE_PROTECTED_PREFIXES` + middleware |
| `/agent` | `agent` | `ROLE_PROTECTED_PREFIXES` + middleware |
| `/vendor` | `vendor` | `ROLE_PROTECTED_PREFIXES` + middleware |
| `/contractor` | `contractor` | `ROLE_PROTECTED_PREFIXES` + middleware |
| `/engineer` | `engineer` | `ROLE_PROTECTED_PREFIXES` + middleware |
| `/architect` | `architect` | `ROLE_PROTECTED_PREFIXES` + middleware |
| `/lawyer` | `lawyer` | `ROLE_PROTECTED_PREFIXES` + middleware |
| `/admin` | `admin` | `ROLE_PROTECTED_PREFIXES` + middleware |
| All other protected routes | Any authenticated role (with completed onboarding) | middleware onboarding gate |

Note: Admin bypasses ALL prefix checks (`middleware.ts:118-121`). Moderator has no prefix entry and would fall through to the default allow.

### Inconsistencies discovered

| ID | Inconsistency | Impact |
|----|---------------|--------|
| R1 | `moderator` is in DB `user_role` enum but absent from TypeScript `UserRole` type | Moderator role cannot be assigned via UI; moderator cannot have a dashboard; `is_moderator()` RLS function works at DB level but the role is unreachable through the application |
| R2 | `adminApproveProfessional` has no `seller` branch | Approving a seller via the UI does not work correctly (sets `is_verified=true` on `profiles` but no `seller_profiles` table exists; no `account_status` update via server action for seller path) |
| R3 | `adminApproveProfessional` has no `vendor` branch | Approving a vendor does not set `vendor_profiles.is_verified = true` |
| R4 | No `completeSellerProfile` server action | Sellers complete KYC via `submitKycDocuments` only; `account_status` is not set to `'pending_verification'` for sellers through a dedicated action |
| R5 | `quantity_surveying` is an engineer specialization in DB but Quantity Surveyor is a separate role in the specification | Creates ambiguity: should a quantity surveyor register as `engineer` with specialization, or wait for a dedicated role? |
| R6 | `interior_design` is an architect specialization in DB but Interior Designer is a separate role in the specification | Same ambiguity as R5 |
| R7 | Moderator storage access (`lzs_verifydoc_select`) works at RLS level but signed URL generation requires `createAdminClient()` (service role) which checks `is_admin()` only | Moderators can SELECT `verification-documents` in theory but cannot use the admin UI to generate signed URLs |
| R8 | `Real Estate Agency` role is referenced in the constitution/specification but has no DB enum, no profile table, no code, and no clear migration path | Agency entities cannot be registered; agents who belong to agencies have no way to declare this |
| R9 | Guest users can read `profiles` (anon SELECT restored in migration 20260714000001), but most public browse pages (`/properties`, `/professionals`, `/services`) have no page files yet | Platform's public-facing value proposition is inaccessible to unauthenticated visitors |
| R10 | Super Admin is referenced in the project constitution as the highest privilege level but has no DB enum, no code, and no planned migration — all super-admin tasks are done directly in the Supabase dashboard | No audit trail for founder-level DB operations; no controlled privilege escalation path |

### Missing permissions (gaps between specification and implementation)

| Gap | Affected roles | Notes |
|-----|----------------|-------|
| Cannot write reviews after service completion | All non-admin | `reviews` table exists; `service_request.status='completed'` gate exists; no service request flow UI |
| Cannot submit payout request | Seller, Agent, Vendor, Contractor, Engineer, Architect, Lawyer | `payouts` table exists; no payout request UI or server action |
| Cannot top up wallet | All roles | `wallets` table exists; `wallet_transfer()` function exists; no payment provider UI |
| Cannot post forum content | All roles | `posts`, `comments`, `reactions` tables exist; no community UI |
| Cannot submit tender application | Contractor, Engineer, Architect | `tenders`, `tender_applications` tables exist; no UI |
| Cannot report a user/listing | All roles | `reports` table exists; no report UI |
| Cannot view own audit history | All roles | `activity_logs` table exists; no per-user activity page |
| Cannot manage rentals | Seller, Agent | `rental_categories` seeded; no rental-specific listing or management UI |
