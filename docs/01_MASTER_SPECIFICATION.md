# LANDLORDZS — Master Platform Specification

Version: 1.0
Status: Living Document — Source of Truth
Governing Document: [00_PROJECT_CONSTITUTION.md](00_PROJECT_CONSTITUTION.md)
Last scanned: 2026-07-13

**Status key used throughout this document:**
- ✅ Implemented — working code exists in the repository
- 🚧 Partially Implemented — code exists but incomplete or not fully wired
- 📋 Planned — in the DB schema or specification but no UI/action yet

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Business Goals](#2-business-goals)
3. [User Types](#3-user-types)
4. [Authentication](#4-authentication)
5. [User Profiles](#5-user-profiles)
6. [Dashboards by Role](#6-dashboards-by-role)
7. [Property Management](#7-property-management)
8. [Marketplace (Vendor / Building Materials)](#8-marketplace)
9. [Professional Services](#9-professional-services)
10. [Messaging](#10-messaging)
11. [Notifications](#11-notifications)
12. [Verification (KYC)](#12-verification-kyc)
13. [Reviews & Ratings](#13-reviews--ratings)
14. [Favorites & Saved Items](#14-favorites--saved-items)
15. [Escrow & Payments](#15-escrow--payments)
16. [Wallet](#16-wallet)
17. [Admin Dashboard](#17-admin-dashboard)
18. [Analytics](#18-analytics)
19. [Search & Filters](#19-search--filters)
20. [Mobile Responsiveness](#20-mobile-responsiveness)
21. [Security Requirements](#21-security-requirements)
22. [API & Server Actions](#22-api--server-actions)
23. [Database Dependencies](#23-database-dependencies)
24. [Storage Buckets](#24-storage-buckets)
25. [Future Features](#25-future-features)
26. [Known Gaps & Inconsistencies](#26-known-gaps--inconsistencies)

---

## 1. Platform Overview

**Name:** LANDLORDZS
**Tagline:** Everything Property. One Trusted Platform.
**Market:** Cameroon (primary), expandable to broader Africa
**Primary currency:** XAF (CFA Franc); USD and EUR supported in schema
**Language:** English (French fields present in schema for bilingual support)

### Technical Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, Server Components) |
| Language | TypeScript |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Styling | Tailwind CSS + shadcn/ui components |
| State | Zustand (auth store, filter store) |
| Data fetching | TanStack Query (React Query) |
| Payments | MTN Mobile Money, Orange Money, Stripe (planned) |
| Push notifications | Expo (push token stored in profiles) |
| Hosting | Vercel (inferred from Next.js App Router architecture) |

### Architecture Pattern

- **Server Components** for all data-fetching pages (admin, dashboard, property detail)
- **Server Actions** for all mutations (auth, properties, payments, reviews)
- **`createClient()`** (SSR, cookie-based) for user-scoped reads
- **`createAdminClient()`** (service-role, bypasses RLS) for admin mutations and sensitive reads
- **RLS (Row Level Security)** enforced at the PostgreSQL layer for every table
- **Middleware** (`middleware.ts`) enforces auth, onboarding gate, and role-based routing before any page renders

---

## 2. Business Goals

| # | Goal | Status |
|---|---|---|
| 1 | Be the single platform covering the complete Cameroon property lifecycle | 🚧 Core real estate done; services/rentals/forum planned |
| 2 | Create verified trust between users through KYC and document review | ✅ KYC upload and admin review implemented |
| 3 | Enable secure peer-to-peer financial transactions via escrow | ✅ Escrow with milestones implemented |
| 4 | Connect property buyers/sellers with qualified professionals | 🚧 Professional profiles exist; service request flow not yet UI-wired |
| 5 | Provide a building materials marketplace | 🚧 Vendor schema complete; no product management UI |
| 6 | Support equipment/vehicle rentals for construction | 📋 Tables exist; no UI |
| 7 | Offer a jobs and tenders board for the construction sector | 📋 Tables exist; no UI |
| 8 | Host a community forum for property knowledge sharing | 📋 Tables exist; no UI |
| 9 | Provide admins with full platform oversight and moderation tools | 🚧 Core admin done; verification centre and audit log UI missing |
| 10 | Support mobile app via Expo push notifications | 📋 Token field in profiles; no mobile-specific API |

**Platform fee:** 2.5% on all payment transactions (implemented in `escrow.ts` and `payments.ts`).
**Commission structure:** Agents earn a configurable commission rate (default 3%) paid from escrow release.

---

## 3. User Types

### 3.1 Buyer ✅

**Purpose:** Browse, save, and inquire about properties for purchase or rent.

**Business rules:**
- Self-registers; no admin approval required
- Cannot create property listings
- Can favorite properties
- Can submit inquiries on active listings
- Can initiate escrow for a property purchase
- Cannot post reviews until a service request is completed

**Dashboard:** `/buyer/favorites` — saved properties grid
**Nav items:** Saved Properties, Browse, My Profile, Wallet

**Database tables:** `profiles`, `property_favorites`, `property_inquiries`, `wallets`, `transactions`, `notifications`, `reviews` (as reviewer)

**Server actions:** `signUp`, `signIn`, `signOut`, `toggleFavorite` (via hook), `submitInquiry`, `createEscrow`, `initiatePayment`

**Current status:** Core features implemented. Missing: inquiry management page, offer flow UI.

---

### 3.2 Seller ✅

**Purpose:** List properties for sale or rent on the platform.

**Business rules:**
- Requires admin approval (`account_status: active`) before listings go live
- Can create, edit, and manage property listings
- Listings start as `draft`; move to `pending_review` on submit
- Admin approves/rejects to set `active` or `rejected`
- Can only edit their own listings (RLS enforced)
- PROPERTY_CREATOR_ROLES = seller, agent, admin

**Dashboard:** `/seller/listings` — list of own properties
**Nav items:** My Listings, New Listing, My Profile, Wallet

**Database tables:** `profiles`, `properties`, `property_images`, `property_videos`, `property_amenities`, `property_verifications`, `kyc_records`, `wallets`, `transactions`

**Server actions:** `createProperty`, `updateProperty`, `deleteProperty`, `submitKycDocuments`

**Current status:** Listing CRUD fully implemented. Missing: inquiries received page (referenced in `PUBLIC_ROUTES` as `/seller/inquiries` but no page file exists).

---

### 3.3 Agent ✅

**Purpose:** Represent buyers/sellers and earn commissions on completed transactions.

**Business rules:**
- Can list properties (same as seller, shares `/seller/listings` route)
- Earns commission at `agent_profiles.commission_rate` (default 3%) when a property they're assigned to sells
- Commission credited to wallet on escrow release
- Requires KYC and admin approval
- May belong to an agency (`agent_profiles.agency_id`)

**Dashboard:** `/agent/commissions` — commission records
**Nav items:** Commissions, My Listings, New Listing, My Profile, Wallet

**Database tables:** `profiles`, `agent_profiles`, `agencies`, `properties`, `commission_records`, `wallets`, `kyc_records`

**Server actions:** `createProperty`, `updateProperty`, `recordAgentCommission`, `payCommission`

**Current status:** Commission tracking implemented. Missing: agency management, client management, showing schedule.

---

### 3.4 Contractor ✅ (profile) / 📋 (services)

**Purpose:** Offer construction and renovation services to property owners and developers.

**Business rules:**
- Requires KYC and admin approval
- Has `professional_profiles` row with `profession_type = 'contractor'`
- Can set availability, hourly/day rate, service areas, specializations
- Receives service requests from clients
- Earns via service payment (escrow)
- Can be rated after service completion

**Specializations:** Residential Construction, Commercial Construction, Renovation, Masonry, Tiling, Roofing, Plumbing, Electrical

**Dashboard:** `/contractor` — stub using `ProfessionalDashboard` component
**Nav items:** Dashboard, My Profile, Wallet

**Database tables:** `profiles`, `professional_profiles`, `portfolio_items`, `portfolio_images`, `service_listings`, `service_requests`, `service_quotations`, `kyc_records`, `wallets`

**Current status:** Profile setup via onboarding. Dashboard is a stub. Service listing creation, request management, and quotation flow have no UI pages.

---

### 3.5 Engineer ✅ (profile) / 📋 (services)

**Purpose:** Civil, structural, mechanical, and electrical engineering consultancy.

**Business rules:** Same pattern as Contractor. `profession_type = 'engineer'`.

**Specializations:** Structural Engineering, Civil Engineering, Soil Testing, Project Supervision, Bill of Quantities, Mechanical, Electrical Engineering

**Dashboard:** `/engineer` — stub
**Status:** Same as Contractor above.

---

### 3.6 Architect ✅ (profile) / 📋 (services)

**Purpose:** Architectural design, planning, and interior design services.

**Business rules:** Same pattern as Contractor. `profession_type = 'architect'`.

**Specializations:** Residential Design, Commercial Design, Interior Design, Urban Planning, Landscape Design

**Dashboard:** `/architect` — stub
**Status:** Same as Contractor above.

---

### 3.7 Lawyer ✅ (profile) / 📋 (services)

**Purpose:** Property law, conveyancing, contract review, land dispute resolution.

**Business rules:** Same pattern as Contractor. `profession_type = 'lawyer'`.

**Specializations:** Property Law, Contract Law, Land Disputes, Conveyancing, Tenant Rights, Commercial Law

**Dashboard:** `/lawyer` — stub
**Status:** Same as Contractor above.

---

### 3.8 Vendor / Building Materials Supplier 🚧

**Purpose:** Sell building materials and construction supplies through an integrated marketplace.

**Business rules:**
- Requires KYC and admin approval
- Has `vendor_profiles` row (store_name, store_slug, store_logo, city, commission_rate default 5%)
- Lists products in `products` table
- Receives orders via `orders` / `order_items`
- Platform takes 5% commission on orders
- Can be rated

**Dashboard:** `/vendor` — store overview (stub — `ProfessionalDashboard` pattern)
**Nav items:** Store Overview, My Profile, Wallet

**Database tables:** `profiles`, `vendor_profiles`, `products`, `product_categories`, `orders`, `order_items`, `wallets`, `kyc_records`

**Current status:** Vendor profile created during onboarding. Vendor dashboard page exists but is a stub. No product management UI, no order management UI, no storefront page.

---

### 3.9 Property Manager 📋

**Purpose:** Manage properties on behalf of owners; collect rent; handle tenant relations.

**Business rules:** Not yet in TypeScript `UserRole` type or DB enum. Referenced in Constitution.

**Status:** Not implemented. Requires new role enum value, profile table, and dashboard.

---

### 3.10 Cleaning Services 📋

**Purpose:** Offer cleaning services for residential and commercial properties.

**Status:** Not implemented. Referenced in Constitution. Would use the `professional_services` pattern.

---

### 3.11 Maintenance Services 📋

**Purpose:** General property maintenance, repairs, and facility management.

**Status:** Not implemented. Referenced in Constitution. Would use the `professional_services` pattern.

---

### 3.12 Admin ✅

**Purpose:** Full platform moderation and oversight.

**Business rules:**
- Assigned manually (not self-registerable)
- Can access all dashboards (middleware allows admin passthrough to any `/role/*` path)
- Can suspend, activate, ban any user account
- Can assign/change any user's role
- Can approve or reject property listings
- Can approve or reject KYC/professional verification
- Can view and manage all escrow accounts
- Can approve pending commission payouts
- Can review and resolve moderation reports
- Can manage platform settings

**Dashboard:** `/admin` with 9 nav sections: Overview, Users, Properties, Professionals, Escrow, Commissions, Reports, Payouts, Settings

**Database tables:** All tables via `createAdminClient()` (service-role)
RPCs: `get_admin_metrics()`, `get_admin_activity(p_limit)`

**Server actions:** `adminSuspendAccount`, `adminActivateAccount`, `adminAssignRole`, `adminApproveProfessional`, `adminRejectProfessional`, `payCommission`, `approveProperty`, `rejectProperty`

**Current status:** Core admin dashboard fully implemented. Missing: user detail action buttons (Feature 2+), verification centre UI, audit log page, "View As User" preview.

---

### 3.13 Super Admin 📋

**Purpose:** Platform owner with elevated privileges beyond standard admin (e.g., managing admins, financial overrides).

**Status:** Not implemented. No DB role for super_admin. Planned distinction from admin role.

---

## 4. Authentication

### 4.1 Registration ✅

**Purpose:** Allow new users to create accounts with email and password.

**User flow:**
1. User visits `/register`
2. Fills: full_name, email, password, role (from REGISTERABLE_ROLES)
3. `signUp()` server action creates Supabase auth user
4. If email confirmation required: user redirected to `/verify-email`; confirmation email sent
5. User clicks link → `/api/auth/callback` → PKCE exchange → session created → `/onboarding`
6. If confirmation not required: session created immediately → `/onboarding`

**Business rules:**
- Admin role NOT self-registerable (blocked in validation schema)
- Password minimum 8 characters
- Email must be unique (Supabase enforces)
- Roles available: buyer, seller, agent, vendor, contractor, engineer, architect, lawyer
- Account starts with `account_status: 'pending_verification'` for APPROVAL_REQUIRED_ROLES, `'active'` for buyer

**Pages:** `/register`, `/verify-email`, `/confirm`
**Server action:** `signUp` (`src/lib/actions/auth.ts`)
**DB tables:** Supabase Auth (`auth.users`), `public.profiles` (created via trigger)

---

### 4.2 Sign In ✅

**Purpose:** Authenticate returning users.

**User flow:**
1. User visits `/login`
2. Enters email and password
3. `signIn()` validates credentials
4. Checks account status (suspended/banned → error, no session)
5. Redirects to: `/onboarding` if not complete, else role dashboard

**Business rules:**
- Suspended/banned accounts blocked at login (session immediately signed out)
- PKCE code verifier missing errors given distinct actionable message
- Rate limiting: password reset limited to 3 attempts per 15 minutes

**Pages:** `/login`
**Server action:** `signIn`
**DB tables:** `auth.users`, `profiles`

---

### 4.3 Password Reset ✅

**User flow:**
1. `/forgot-password` → `sendPasswordReset()` → email with reset link
2. Link → `/api/auth/callback` → `/reset-password`
3. User enters new password → `resetPassword()`

**Business rules:**
- Rate limited: 3 attempts per 15 minutes per IP (stored in `password_reset_rate_limits` table)
- Reset link expires (Supabase default: 1 hour)
- `/reset-password` allowed through middleware even when authenticated (password-recovery session)

**Pages:** `/forgot-password`, `/reset-password`
**Server actions:** `sendPasswordReset`, `resetPassword`
**DB tables:** `password_reset_rate_limits`

---

### 4.4 Email Confirmation ✅

**Pages:** `/verify-email` (holding page), `/confirm` (ConfirmEmailForm), `/api/auth/callback` (PKCE exchange)

---

### 4.5 Phone Verification 🚧

**Purpose:** Verify user phone number via OTP.

**Status:** `PhoneVerificationForm` component exists. `sendPhoneOtp`, `verifyPhoneOtp` server actions exist. UI appears to be used in onboarding but not mandatory.

**DB fields:** `profiles.phone`, `profiles.phone_verified`

---

### 4.6 Account Recovery ✅

**Purpose:** Allow users to recover accounts when primary email is unavailable.

**Page:** `/account-recovery`
**Component:** `AccountRecoveryForm`
**Server action:** `recoverAccount`

---

### 4.7 Change Password ✅

**Page:** `/account/profile` (via ChangePasswordForm component)
**Server action:** `changePassword`

---

### 4.8 Sign Out ✅

**Server action:** `signOut` → clears session → redirect to `/login`

---

## 5. User Profiles

### 5.1 Base Profile ✅

Every user has one row in `public.profiles`, created automatically by a PostgreSQL trigger on `auth.users` insert.

**Fields:**
| Field | Type | Description |
|---|---|---|
| id | UUID | Matches `auth.users.id` |
| email | TEXT | From auth |
| full_name | TEXT | Legal name |
| display_name | TEXT | Public display name |
| role | user_role enum | Primary role |
| city | cameroon_city enum | User's city |
| phone | TEXT | Phone number |
| phone_verified | BOOLEAN | OTP confirmed |
| avatar_url | TEXT | URL in `user-avatars` bucket |
| bio | TEXT | Short biography |
| is_verified | BOOLEAN | Admin-approved KYC |
| is_premium | BOOLEAN | Subscription tier |
| account_status | account_status enum | active / suspended / banned / pending_verification |
| onboarding_completed | BOOLEAN | Two-step onboarding done |
| expo_push_token | TEXT | Mobile push notification token |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

**Edit page:** `/account/profile`
**Components:** `ProfileForm`, `PhoneVerificationForm`, `ChangePasswordForm`
**Server actions:** `updateProfile`, `updateProfileAvatar`, `changePassword`

---

### 5.2 Agent Profile ✅

Table: `agent_profiles` — one row per agent user.

**Key fields:** agency_id, license_number, license_verified, specializations[], service_areas[], languages[], experience_years, rating_avg, rating_count, listing_count, sold_count, commission_rate, is_featured

**Set during:** Onboarding Step 2 (`RoleProfileStep` component)

---

### 5.3 Vendor Profile ✅

Table: `vendor_profiles` — one row per vendor user.

**Key fields:** store_name, store_slug (unique), store_logo, store_banner, store_description, business_reg, tax_id, phone, email, website, city, is_verified, rating_avg, product_count, order_count, commission_rate, is_featured

**Set during:** Onboarding Step 2

---

### 5.4 Professional Profile ✅ (data) / 📋 (public directory)

Table: `professional_profiles` — one row per contractor/engineer/architect/lawyer.

**Key fields:** profession_type, company_name, license_number, license_verified, specializations[], service_areas[], languages[], experience_years, hourly_rate, day_rate, currency, rating_avg, project_count, bio, website, is_available, is_verified, is_featured

**Set during:** Onboarding Step 2
**Server action (availability toggle):** `toggleProfessionalAvailability` (`src/lib/actions/profile.ts`)

**Public directory:** Referenced in `PUBLIC_ROUTES` as `/professionals` but no page implemented.

---

### 5.5 KYC Records ✅

Table: `kyc_records` — verification submissions per user (can have multiple, ordered by submitted_at).

**Key fields:** user_id, level (kyc_level enum), status (verification_status enum), national_id_number, national_id_front (storage path), national_id_back (storage path), selfie_url (storage path), proof_of_address (storage path), business_reg (storage path), reviewed_by, review_notes, submitted_at, reviewed_at, expires_at

**Statuses:** pending → approved / rejected / expired

---

### 5.6 Onboarding ✅

**Purpose:** Mandatory 2-step setup after first login.

**Step 1 — Basic Profile (`BasicProfileStep`):**
- full_name, display_name, city, phone, bio, avatar upload
- Server action: `completeBasicProfile`

**Step 2 — Role Profile (`RoleProfileStep`):**
- Agent: license_number, specializations, service_areas, experience_years, commission_rate, languages
- Vendor: store_name, store_slug, store_description, business_reg, website
- Professional: company_name, license_number, specializations, service_areas, experience_years, hourly_rate, day_rate
- Buyer/Seller: skipped (no role profile table)
- Server action: `completeRoleProfile`

On completion: `profiles.onboarding_completed = true`, redirects to role dashboard.

**Pages:** `/onboarding` (uses `OnboardingFlow` component)

---

## 6. Dashboards by Role

### 6.1 Buyer Dashboard ✅
- **Page:** `/buyer/favorites`
- **Content:** Grid of saved properties using `FavoritesGrid` component
- **Missing:** Inquiries sent, offer tracking, property comparison

### 6.2 Seller Dashboard ✅
- **Page:** `/seller/listings`
- **Content:** Paginated list of own properties with status badges; links to edit, new listing
- **Missing:** Inquiries received page (route referenced but no file at `seller/inquiries/page.tsx`)

### 6.3 Agent Dashboard ✅
- **Page:** `/agent/commissions`
- **Content:** Commission records with status and amounts
- **Shared pages:** `/seller/listings` for property management
- **Missing:** Client list, scheduled viewings

### 6.4 Vendor Dashboard 🚧
- **Page:** `/vendor`
- **Content:** `ProfessionalDashboard` stub — shows profile data
- **Missing:** Product management, order management, analytics, store customisation

### 6.5 Professional Dashboards (Contractor/Engineer/Architect/Lawyer) 🚧
- **Pages:** `/contractor`, `/engineer`, `/architect`, `/lawyer`
- **Content:** `ProfessionalDashboard` component — shows availability toggle, rating, profile stats
- **Missing:** Service listing management, incoming requests, quotation management, portfolio management

### 6.6 Admin Dashboard ✅
- **Page:** `/admin`
- **Content:** Platform metrics (users by role, property counts, escrow stats, verification queue, reports), recent activity feed
- **Sub-pages:** Users, Properties, Professionals, Escrow, Commissions, Reports, Payouts, Settings
- **Missing:** Analytics page, audit log page, verification centre, user detail actions

---

## 7. Property Management

### 7.1 Public Property Browse ✅

**Purpose:** Allow anyone (authenticated or not) to browse active listings.

**User flow:**
1. User visits `/properties`
2. Search bar (live search by keyword)
3. Filters (listing type, property type, city, bedrooms, price range)
4. Results grid; click card → `/properties/[id]`

**Business rules:**
- Only `active` and `under_offer` listings visible to public
- `draft` and `pending_review` visible only to owner/assigned agent
- `sold`, `rented`, `off_market`, `expired`, `rejected` → 404

**Pages:** `/properties`, `/properties/[id]`
**Components:** `PropertyGrid`, `PropertyFilters`, `PropertySearchBar`, `PropertyCard`, `PropertyDetails`, `PropertyGallery`, `PropertyAmenities`, `PropertyInquiryForm`

**Database tables:** `properties`, `property_images`, `property_videos`, `property_amenities`, `profiles` (owner/agent)

---

### 7.2 Property Creation ✅

**Purpose:** Allow sellers and agents to create new listings.

**User flow:**
1. `/seller/listings/new` → `PropertyForm`
2. Fill: title, description, listing_type, property_type, city, price, bedrooms, bathrooms, area, land_title, amenities, images, videos
3. `createProperty()` inserts with `status: 'draft'`
4. Redirects to edit page where seller can submit for review

**Business rules:**
- Only seller, agent, admin can create (enforced in server action + RLS)
- Account must be `active` (pending verification → blocked)
- Slug auto-generated from title + timestamp
- Max images: configurable; video upload supported
- Amenities stored as separate rows in `property_amenities`

**Server action:** `createProperty`
**DB tables:** `properties`, `property_amenities`, `property_images`, `property_videos`
**Storage:** `property-images`, `property-videos`

---

### 7.3 Property Editing ✅

**Page:** `/seller/listings/[id]/edit`
**Server action:** `updateProperty`

**Business rules:**
- Owner or assigned agent only (RLS + server action check)
- Can add/remove images and videos
- Status transitions: draft → pending_review (on submit); pending_review → active/rejected (admin only)

---

### 7.4 Property Listing Management ✅

**Page:** `/seller/listings`
**Content:** Paginated table of own listings with status badges, edit links

---

### 7.5 Admin Property Management ✅

**Pages:** `/admin/properties` (list, filterable by status), `/admin/properties/[id]` (detail + approve/reject)

**Server actions:** `adminApproveProperty` (sets `status: 'active'`, `published_at`), `adminRejectProperty` (sets `status: 'rejected'`)

**DB tables:** `properties`, `property_verifications`, `property_images`

---

### 7.6 Property Inquiry ✅

**Purpose:** Allow buyers to contact the owner/agent of a listing.

**Components:** `PropertyInquiryForm`
**Server action:** `submitInquiry`
**DB table:** `property_inquiries`
**Types:** general, viewing, offer

**Missing:** Seller inquiry inbox page, read/reply flow.

---

### 7.7 Property Types Supported ✅

apartment, house, villa, studio, duplex, penthouse, land, commercial_space, office, warehouse, shop, farm

### 7.8 Listing Types ✅

sale, rent, shortlet (UI); schema also has: short_term, lease, auction (DB enum only — see Known Gaps)

### 7.9 Land Title Types ✅

titre_foncier, acte_de_vente, bail_emphyteotique, convention, lettre_attribution, none

### 7.10 Cities Covered ✅

Yaoundé, Douala, Buea, Bamenda, Limbe, Kribi, Bafoussam, Ngaoundéré, Maroua, Garoua, Bertoua, Ebolowa, Kumba, Nkongsamba, Edéa, Other

---

## 8. Marketplace

### 8.1 Vendor Store 🚧

**Purpose:** Building materials and construction supplies e-commerce.

**Tables defined:**
- `vendor_profiles` — store identity, settings
- `products` — listings with price, stock, images, category
- `product_categories` — hierarchical category tree
- `orders` — purchase orders
- `order_items` — line items per order

**Status:** Vendor profile setup works. No product management UI. No storefront/catalogue page. No order management. No checkout flow.

**Future pages needed:** `/vendor/products` (list), `/vendor/products/new`, `/vendor/products/[id]/edit`, `/vendor/orders`, `/materials` (public catalogue)

---

### 8.2 Equipment & Vehicle Rentals 📋

**Purpose:** Rent construction equipment (excavators, scaffolding, vehicles) for project use.

**Tables defined:** `rental_categories`, `rental_listings`, `rental_bookings`

**Status:** No UI of any kind. Tables fully defined with daily/weekly/monthly rates, deposit, availability.

---

## 9. Professional Services

### 9.1 Service Directory 📋

**Public page:** `/professionals` — listed in `PUBLIC_ROUTES` but no page file exists.

**Intended content:** Searchable, filterable directory of verified contractors, engineers, architects, lawyers.

---

### 9.2 Portfolio 🚧

**Purpose:** Professionals showcase completed projects.

**Tables:** `portfolio_items`, `portfolio_images`
**Components:** None implemented yet
**Status:** Tables defined; no UI for adding or viewing portfolio items.

---

### 9.3 Service Listings 📋

**Purpose:** Professionals list specific services with pricing.

**Tables:** `service_categories`, `service_listings` (with hourly_rate, flat_rate, min_budget, max_budget, delivery_days, portfolio_urls)

**Status:** Tables defined; no creation UI.

---

### 9.4 Service Request Flow 📋

**Purpose:** Client submits a service request; professionals submit quotations; client accepts one; service executed; review posted on completion.

**Tables:** `service_requests`, `service_quotations`
**Status:** Tables defined. `createReview` server action gates reviews on `service_requests.status = 'completed'` — meaning reviews exist in code but cannot be triggered by users until the service request flow is built.

---

### 9.5 Professional Verification ✅

**Admin page:** `/admin/professionals`

**Tabs:** pending_verification, active, suspended (missing: rejected)

**Flow:**
1. Professional submits KYC at `/account/verification`
2. Admin reviews at `/admin/professionals`
3. Admin clicks Approve → `adminApproveProfessional()` sets:
   - `profiles.account_status = 'active'`
   - `profiles.is_verified = true`
   - `professional_profiles.is_verified = true` (for contractor/engineer/architect/lawyer)
   - `professional_profiles.license_verified = true`
   - `agent_profiles.license_verified = true` (for agent)
4. Admin clicks Reject → `adminRejectProfessional()` sets `account_status = 'suspended'`, stores reason in `kyc_records.review_notes`

**Known gap:** `vendor` and `seller` branches missing in `adminApproveProfessional` — those roles go unapproved.

---

## 10. Messaging

### 10.1 System Design ✅ (schema) / 📋 (UI)

**Purpose:** Allow users to communicate directly: buyer↔seller, client↔professional, user↔support.

**Tables:**
- `conversations` — type: direct / group / support; can be linked to a context (e.g., property_id)
- `conversation_participants` — many-to-many with last_read_at for unread count
- `messages` — content, content_type (text/image/file/audio/system), reply threading, soft delete
- `message_attachments` — files attached to messages (stored in `chat-attachments` bucket)

**Realtime:** Supabase Realtime configured (migration `20260610000017_realtime_storage.sql`)

**Status:** Full database schema implemented with indexes. No UI pages, no hooks, no components for the messaging interface.

**Storage bucket:** `chat-attachments`

---

## 11. Notifications

### 11.1 In-App Notifications 🚧

**Tables:**
- `notification_preferences` — per-user email/push/SMS preferences with quiet hours
- `notifications` — per-user notification rows with type, title, body, data, action_url, is_read, read_at, sent_email, sent_push

**Notification types (enum):** message, enquiry, offer, booking, payment, review, property_update, order_update, service_update, job_update, system, promotional, verification

**Status:** Tables fully defined. Some notifications are inserted by server actions (e.g., account notices). No notification inbox UI page. No unread count in sidebar.

---

### 11.2 Push Notifications 📋

**Field:** `profiles.expo_push_token` — stored when mobile user grants permission.
**Status:** Token stored; no push notification dispatch logic implemented.

---

### 11.3 Email Notifications 🚧

**Status:** Supabase sends auth emails (confirm, reset). No custom transactional email service (e.g., Resend, SendGrid) wired up for order/payment/review notifications.

---

## 12. Verification (KYC)

### 12.1 User-Side Submission ✅

**Purpose:** Users upload identity documents for admin review.

**Flow:**
1. User (seller, vendor, agent, contractor, engineer, architect, lawyer) visits `/account/verification`
2. First submission: `KycUploadStep` (in onboarding) or `KycResubmitForm` (standalone)
3. Uploads: National ID front, National ID back, business_reg (optional)
4. Server action `submitKycDocuments` inserts row in `kyc_records` with `status: 'pending'`
5. `account_status` remains `pending_verification`
6. On rejection: user can resubmit at `/account/verification`

**Server action:** `submitKycDocuments`
**DB table:** `kyc_records`
**Storage bucket:** `verification-documents`

---

### 12.2 Admin Review ✅

**Admin page:** `/admin/professionals`
**Actions:** Approve → `adminApproveProfessional`, Reject → `adminRejectProfessional`

**Missing:** Document viewer modal (documents currently open as plain `<a>` links). Rejected tab. `seller`/`vendor` approval branches.

---

### 12.3 Verification Status Display ✅

**Component:** `VerificationBanner` — shown on dashboards for unverified roles
- pending: "Under review" banner
- rejected: "Rejected — resubmit" banner with reason

---

## 13. Reviews & Ratings

### 13.1 Review Creation 🚧

**Purpose:** Clients rate professionals after a completed service.

**Business rules:**
- Only reviewer (client) of a completed service_request can post a review
- One review per (reviewer, target_type, target_id) — unique constraint
- Rating 1–5 stars overall; optional sub-ratings: cleanliness, communication, value, accuracy
- Reviewable roles defined in `REVIEWABLE_ROLES` (`src/types/review.ts`)

**Server action:** `createReview` (`src/lib/actions/reviews.ts`)
**DB tables:** `service_requests`, `service_quotations`, `reviews`, `review_responses`
**Trigger:** `trg_refresh_rating` — updates `rating_avg` and `rating_count` on the relevant profile table after every review insert/update/delete

**Status:** Action implemented and gated. Cannot be triggered by end users until service request flow is built.

---

### 13.2 Review Display ✅

**Components:** `ReviewCard`, `ReviewList`, `ReviewForm`, `StarRating`
**Account page:** `/account/reviews` — user's own reviews received

---

### 13.3 Review Response 📋

**Table:** `review_responses` — one response per review, by the reviewed professional.
**Status:** Table exists; no UI for posting a response.

---

## 14. Favorites & Saved Items

### 14.1 Property Favorites ✅

**Purpose:** Buyers save properties for later.

**User flow:**
1. On any property card or detail page: click heart icon → `FavoriteButton`
2. Toggles row in `property_favorites`
3. `/buyer/favorites` shows full grid via `FavoritesGrid`

**Hook:** `useFavorites` (React Query)
**Server mutations:** `toggleFavorite` (via hook, calls Supabase client directly)
**DB table:** `property_favorites` (user_id, property_id, created_at)

---

## 15. Escrow & Payments

### 15.1 Escrow ✅

**Purpose:** Secure hold of funds until property or service transaction completes.

**User flow:**
1. Buyer initiates escrow at property detail page or professional service agreement
2. `createEscrow()` creates `escrow_accounts` row (status: pending)
3. Buyer funds escrow via `initiatePayment()` → MTN MoMo or Orange Money
4. On payment webhook confirmation → escrow `status: funded`
5. Milestones can be defined (for service work); each milestone approved separately
6. On release: `release_escrow()` RPC credits payee wallet, platform_fee deducted
7. On dispute: admin intervenes via admin escrow panel

**Business rules:**
- Platform fee: 2.5% of transaction amount
- 30-day default release date (auto-release if no dispute)
- Cannot create escrow with self
- Milestones must sum ≤ escrow amount

**Pages:** `/account/escrow` (list), `/account/escrow/[id]` (detail with timeline and milestones)
**Admin page:** `/admin/escrow`
**Components:** `EscrowCard`, `EscrowList`, `EscrowTimeline`, `MilestoneList`
**Server actions:** `createEscrow`, `disputeEscrow`, `completeMilestone` (`src/lib/actions/escrow.ts`)
**DB tables:** `escrow_accounts`, `escrow_events`, `escrow_milestones`
**DB function:** `release_escrow(p_escrow_id)` — SECURITY DEFINER RPC

---

### 15.2 Payments ✅

**Purpose:** Process mobile money payments to fund escrow or top up wallet.

**Supported providers:**
- MTN Mobile Money (`mtn_momo`) — `requestToPay`, `getPaymentStatus`, `transfer`
- Orange Money (`orange_money`) — `initiatePayment`, `getPaymentStatus`
- Wallet (internal balance debit, no fee)
- Bank Transfer, Cash, Stripe — defined in enum but not fully wired

**Payment flow:**
1. `initiatePayment()` creates `transactions` row (status: pending) + calls provider API
2. Provider processes asynchronously
3. Webhook (`/api/payments/webhook/mtn`, `/api/payments/webhook/orange`) → updates transaction status
4. On `SUCCESSFUL`: credits wallet or funds escrow
5. Client can poll `/api/payments/status/[id]`

**Pages:** `/account/transactions`, `/account/wallet` (top-up sheet)
**Components:** `PaymentMethodSelector`, `WalletTopUpForm`, `TransactionCard`, `TransactionList`
**Server actions:** `initiatePayment`, `requestPayout` (`src/lib/actions/payments.ts`)
**DB tables:** `transactions`, `wallets`, `wallet_transactions`

---

### 15.3 Payouts ✅

**Purpose:** Transfer platform earnings to users (professionals, vendors, agents).

**User flow:**
1. User at `/account/payouts` → `PayoutRequestForm`
2. `requestPayout()` creates `payouts` row (status: pending)
3. Admin reviews at `/admin/payouts`
4. Admin approves → triggers MTN MoMo transfer to user's phone number

**Pages:** `/account/payouts`, `/admin/payouts`
**Components:** `PayoutRequestForm`, `PayoutsList`
**Server actions:** `requestPayout`, admin approval in `src/lib/actions/payments.ts`
**DB tables:** `payouts`

---

### 15.4 Commissions ✅

**Purpose:** Track agent commissions from property sales.

**Business rules:**
- Commission = sale_amount × agent commission_rate (default 3%)
- Recorded when escrow releases on a property transaction
- Admin approves and pays commission → credits agent wallet

**Pages:** `/agent/commissions`, `/admin/commissions`
**Components:** `CommissionSummary`
**Server actions:** `recordAgentCommission`, `payCommission`
**DB table:** `commission_records`

---

## 16. Wallet

### 16.1 Wallet ✅

**Purpose:** Internal balance for receiving payments, paying for services, earning commissions.

**Business rules:**
- One wallet per user (auto-created on profile creation or first top-up)
- `balance` ≥ 0 enforced by DB CHECK
- `locked` amount reserved during active escrow
- Currency: XAF (primary)
- Wallet payments have 0% platform fee

**User flow:**
1. `/account/wallet` → shows balance via `WalletCard`
2. Top-up: Sheet opens `WalletTopUpForm` → `initiatePayment(provider: 'mtn_momo' | 'orange_money')`
3. On webhook success: wallet balance credited via `wallet_transfer()` RPC

**Pages:** `/account/wallet`
**Components:** `WalletCard`, `WalletTopUpForm`, `TransactionList`
**DB tables:** `wallets`, `wallet_transactions`
**DB function:** `wallet_transfer(p_from_id, p_to_id, p_amount, p_currency, p_ref, p_type, p_note)`

---

## 17. Admin Dashboard

### 17.1 Overview ✅

**Page:** `/admin`
**Content:**
- Metrics card grid: users by role, new users today, properties by status, verification queue, pending payouts, active escrows, disputed escrows, pending reports, pending commissions
- Recent activity feed (last 15 events)

**Data source:** `get_admin_metrics()` RPC and `get_admin_activity(p_limit)` RPC (SECURITY DEFINER functions defined in `20260616000001_admin_metrics_fn.sql`)

---

### 17.2 User Management ✅

**Page:** `/admin/users` — paginated list; filterable by role and account status
**Page:** `/admin/users/[id]` — read-only detail (profile, KYC, documents, role-specific data, admin action history, activity log)

**Actions available from list:**
- Assign role (dropdown + submit)
- Suspend account → `adminSuspendAccount`
- Activate account → `adminActivateAccount`

**Server actions:** `adminSuspendAccount` (logs to `admin_logs`), `adminActivateAccount`, `adminAssignRole`

**Missing:** User detail action buttons (suspend/activate from detail page), search, `is_verified` filter

---

### 17.3 Property Management ✅

**Page:** `/admin/properties` — list with status filter
**Page:** `/admin/properties/[id]` — property detail with approve/reject buttons

---

### 17.4 Professional Verification ✅

**Page:** `/admin/professionals`
**Tabs:** pending_verification, active, suspended
**Documents:** linked as `<a>` tags (no modal viewer)
**Actions:** Approve → `adminApproveProfessional`, Reject → `adminRejectProfessional`

---

### 17.5 Escrow Management ✅

**Page:** `/admin/escrow` — list of all escrow accounts with status

---

### 17.6 Commission Management ✅

**Page:** `/admin/commissions` — pending and paid commissions; admin can pay commission → `payCommission`

---

### 17.7 Reports & Moderation ✅

**Page:** `/admin/reports` — moderation reports from users
**DB table:** `moderation_reports`

---

### 17.8 Payouts Management ✅

**Page:** `/admin/payouts` — pending payout requests; admin approves and dispatches

---

### 17.9 Platform Settings ✅

**Page:** `/admin/settings` — platform configuration
**DB tables:** `platform_settings`, `announcements`

---

### 17.10 Audit Logs 📋

**Tables exist:** `admin_logs` (admin actions with old/new data), `activity_logs` (all user actions)
**Status:** No dedicated UI page (`/admin/audit`). Logs are written by existing actions but not surfaced to admins.

---

### 17.11 Verification Centre 📋

**Planned page:** `/admin/verifications` — unified KYC review for all roles (sellers, vendors, and professionals), with document viewer modal, approve/reject/request-more-info actions, and per-verification history.

**Status:** Currently split across `/admin/professionals` (professionals only). Sellers and vendors cannot be approved. No document viewer modal.

---

## 18. Analytics

### 18.1 Admin Analytics 🚧

**Current:** Dashboard overview metrics via `get_admin_metrics()` RPC.

**Missing:** Dedicated `/admin/analytics` page with time-series data, cohort analysis, revenue trends, property market analytics, top professionals.

---

### 18.2 Per-Role Analytics 📋

- Vendor: product views, conversion rate, revenue chart → 📋
- Agent: commission trend, listing performance → 📋
- Professional: service request volume, rating trend → 📋

---

## 19. Search & Filters

### 19.1 Property Search ✅

**Components:** `PropertySearchBar` (keyword input with debounce), `PropertyFilters` (listing type, property type, city, bedrooms, price range)

**Hook:** `usePropertySearch` (React Query, calls `/api/search`)

**API route:** `/api/search` — queries `properties` table with full-text or ilike

**Filter store:** Zustand `filterStore` — persists active filters client-side

**Missing:** Full-text search index (`search_vector` column referenced in forum but not properties), server-side geolocation search, saved searches.

---

### 19.2 Admin Search 📋

- User search by name/email → not yet implemented in `/admin/users`
- Property search in admin → not implemented

---

### 19.3 Professional Directory Search 📋

`/professionals` page with filters by profession type, city, specialization, availability → not implemented.

---

## 20. Mobile Responsiveness

### 20.1 Implementation ✅

- Tailwind CSS responsive prefixes used throughout (`sm:`, `md:`, `lg:`)
- Dashboard sidebar uses `Sheet` component (slide-in drawer on mobile)
- Property cards use responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- All forms stack vertically on mobile

### 20.2 Mobile App 📋

- `expo_push_token` stored in `profiles` — indicates Expo React Native app planned
- No mobile app code exists in this repository
- Push notification dispatch not implemented

---

## 21. Security Requirements

### 21.1 Authentication Security ✅

- PKCE (Proof Key for Code Exchange) for all OAuth and email-link flows
- `supabase.auth.getUser()` used everywhere (not `getSession()`) to prevent stale session attacks
- Suspended/banned accounts blocked at login AND in middleware
- Password reset rate-limited (3/15min per IP) via `password_reset_rate_limits` table
- No auth tokens exposed to client components; SSR cookie-based sessions only

### 21.2 Row Level Security (RLS) ✅

- All tables have RLS enabled
- GRANT SELECT on profiles for `authenticated` and `anon` roles (fixed in `20260714000001`)
- Key policy patterns:
  - `own_select/own_insert/own_update`: user can only access their own rows
  - `mod_all`/`admin_all`: admin/moderator bypass via `is_admin()` and `is_moderator()` SECURITY DEFINER functions
  - `public_select`: active listings readable by anyone
  - Property creator RBAC enforced by `is_property_creator()` function (migration `20260618000001`)

### 21.3 Server Action Security ✅

- All mutations are server actions (`'use server'`)
- Every action fetches `supabase.auth.getUser()` independently (no trust of client-passed user data)
- Admin actions verify `role === 'admin'` from DB before executing
- Service-role client (`createAdminClient()`) never imported in client components

### 21.4 Storage Security ✅

- Storage bucket policies defined in `20260610000019_storage_buckets_policies.sql`
- Verification documents accessible only to: document owner OR `is_moderator()` / `is_admin()`
- Admin views documents via signed URLs (1-hour expiry)
- Property images: public read, owner-only write

### 21.5 Input Validation ✅

- Zod schemas for all server action inputs (`src/lib/validations/`)
- SQL injection: parameterised queries via Supabase client
- XSS: React's default escaping; no `dangerouslySetInnerHTML`

### 21.6 Middleware Protection ✅

- All non-public routes require authenticated session
- Role-based prefix protection enforced before page renders
- Onboarding gate: incomplete onboarding → redirect to `/onboarding`
- Admin can access all dashboards; other roles blocked from each other's routes

---

## 22. API & Server Actions

### 22.1 API Routes

| Route | Method | Purpose | Status |
|---|---|---|---|
| `/api/auth/callback` | GET | PKCE exchange after email link click | ✅ |
| `/api/payments/initiate` | POST | Initiate MTN/Orange payment | ✅ |
| `/api/payments/status/[id]` | GET | Poll transaction status | ✅ |
| `/api/payments/webhook/mtn` | POST | MTN MoMo async callback | ✅ |
| `/api/payments/webhook/orange` | POST | Orange Money async callback | ✅ |
| `/api/search` | GET | Property search | ✅ |
| `/api/upload` | POST | File upload to Supabase Storage | ✅ |

### 22.2 Server Actions

| File | Actions | Status |
|---|---|---|
| `src/lib/actions/auth.ts` | signIn, signUp, signOut, sendPasswordReset, resetPassword, changePassword, recoverAccount, sendPhoneOtp, verifyPhoneOtp, completeBasicProfile, completeRoleProfile, submitKycDocuments, adminSuspendAccount, adminActivateAccount, adminAssignRole, adminApproveProfessional, adminRejectProfessional | ✅ |
| `src/lib/actions/properties.ts` | createProperty, updateProperty, deleteProperty, submitInquiry, adminApproveProperty, adminRejectProperty | ✅ |
| `src/lib/actions/escrow.ts` | createEscrow, disputeEscrow, completeMilestone | ✅ |
| `src/lib/actions/payments.ts` | initiatePayment, requestPayout, approveAndDispatchPayout | ✅ |
| `src/lib/actions/commissions.ts` | recordAgentCommission, payCommission | ✅ |
| `src/lib/actions/reviews.ts` | createReview | 🚧 (gated on service requests) |
| `src/lib/actions/profile.ts` | toggleProfessionalAvailability, updateProfileAvatar | ✅ |

---

## 23. Database Dependencies

### 23.1 Core Tables

| Table | Purpose | Migration |
|---|---|---|
| `profiles` | All users base profile | 20260610000003 |
| `kyc_records` | Identity verification submissions | 20260610000003 |
| `user_sessions` | Session audit trail | 20260610000003 |
| `user_permissions` | Granular permission overrides | 20260610000003 |
| `agencies` | Agent agency entities | 20260610000005 |
| `agent_profiles` | Agent-specific profile data | 20260610000005 |
| `properties` | Property listings | 20260610000006 |
| `property_images` | Property photos | 20260610000006 |
| `property_videos` | Property videos | 20260610000006 |
| `property_amenities` | Amenity flags per property | 20260610000006 |
| `property_favorites` | Saved properties | 20260610000006 |
| `property_inquiries` | Contact messages on listings | 20260610000006 |
| `property_verifications` | Title/document verification | 20260610000006 |
| `property_categories` | Property category taxonomy | 20260610000006 |
| `vendor_profiles` | Vendor store identity | 20260610000007 |
| `products` | Marketplace product listings | 20260610000007 |
| `product_categories` | Product taxonomy | 20260610000007 |
| `orders` | Purchase orders | 20260610000007 |
| `order_items` | Order line items | 20260610000007 |
| `professional_profiles` | Contractor/Engineer/Architect/Lawyer profile | 20260610000008 |
| `portfolio_items` | Professional work portfolio | 20260610000008 |
| `portfolio_images` | Portfolio item photos | 20260610000008 |
| `service_categories` | Service type taxonomy | 20260610000008 |
| `service_listings` | Professional service offerings | 20260610000008 |
| `service_requests` | Client service job posts | 20260610000008 |
| `service_quotations` | Quotes from professionals | 20260610000008 |
| `rental_categories` | Equipment/vehicle types | 20260610000009 |
| `rental_listings` | Rentable items | 20260610000009 |
| `rental_bookings` | Rental reservations | 20260610000009 |
| `forum_categories` | Forum topic categories | 20260610000010 |
| `forum_posts` | Community discussion posts | 20260610000010 |
| `forum_comments` | Post replies | 20260610000010 |
| `conversations` | Chat threads | 20260610000011 |
| `conversation_participants` | Chat thread members | 20260610000011 |
| `messages` | Chat messages | 20260610000011 |
| `message_attachments` | Files in messages | 20260610000011 |
| `notification_preferences` | User notification settings | 20260610000012 |
| `notifications` | In-app notification queue | 20260610000012 |
| `reviews` | Ratings and reviews | 20260610000012 |
| `review_responses` | Professional responses to reviews | 20260610000012 |
| `wallets` | User wallet balances | 20260610000013 |
| `wallet_transactions` | Wallet credit/debit ledger | 20260610000013 |
| `transactions` | Master payment log | 20260610000013 |
| `escrow_accounts` | Held funds for transactions | 20260610000013 |
| `escrow_events` | Escrow lifecycle events | 20260610000013 |
| `escrow_milestones` | Milestone-based escrow payments | 20260610000013 |
| `commission_records` | Agent commission earnings | 20260610000013 |
| `payouts` | Withdrawal requests | 20260610000013 |
| `jobs` | Job listings | 20260610000014 |
| `job_applications` | Job applications | 20260610000014 |
| `tenders` | Construction tender notices | 20260610000014 |
| `tender_bids` | Bids on tenders | 20260610000014 |
| `moderation_reports` | User-submitted abuse reports | 20260610000015 |
| `admin_logs` | Admin action audit trail | 20260610000015 |
| `activity_logs` | All user activity events | 20260610000015 |
| `announcements` | Platform-wide announcements | 20260610000015 |
| `platform_settings` | Key-value configuration store | 20260610000015 |
| `account_notices` | Notices sent to users (e.g., rejection reasons) | 20260615000002 |
| `appeals` | Account status appeal submissions | 20260615000002 |
| `password_reset_rate_limits` | Rate limiting for password resets | 20260618000002 |

### 23.2 Database Functions (RPCs)

| Function | Purpose | Migration |
|---|---|---|
| `attach_updated_at(table)` | Attaches auto-update trigger to updated_at | 20260610000004 |
| `is_admin()` | Returns true if current user has admin role | 20260610000004 |
| `is_moderator()` | Returns true if current user is admin or moderator | 20260610000004 |
| `get_my_role()` | Returns current user's role | 20260610000004 |
| `is_property_creator()` | Returns true if user can create listings | 20260618000001 |
| `refresh_rating()` | Updates rating_avg/rating_count after review change | 20260610000004 |
| `release_escrow(p_escrow_id)` | Releases escrow funds to payee wallet | 20260610000013 |
| `wallet_transfer(...)` | Transfers between wallets atomically | 20260610000013 |
| `lock_wallet_funds(...)` | Locks wallet balance for escrow | 20260614000001 |
| `unlock_wallet_funds(...)` | Unlocks wallet balance | 20260614000001 |
| `get_admin_metrics()` | Returns platform KPI object for admin dashboard | 20260616000001 |
| `get_admin_activity(p_limit)` | Returns recent activity feed | 20260616000001 |

---

## 24. Storage Buckets

| Bucket name | Constant key | Content | Access |
|---|---|---|---|
| `property-images` | `STORAGE_BUCKETS.PROPERTY_IMAGES` | Property listing photos | Public read; owner write |
| `property-videos` | `STORAGE_BUCKETS.PROPERTY_VIDEOS` | Property listing videos | Public read; owner write |
| `user-avatars` | `STORAGE_BUCKETS.USER_AVATARS` | Profile avatar photos | Public read; owner write |
| `verification-documents` | `STORAGE_BUCKETS.VERIFY_DOCS` | KYC identity documents | Owner read; admin/moderator read; owner write |
| `marketplace-products` | `STORAGE_BUCKETS.MARKETPLACE` | Vendor product images | Public read; vendor write |
| `service-portfolios` | `STORAGE_BUCKETS.PORTFOLIOS` | Professional portfolio images | Public read; professional write |
| `forum-images` | `STORAGE_BUCKETS.FORUM_IMAGES` | Forum post images | Public read; author write |
| `chat-attachments` | `STORAGE_BUCKETS.CHAT_ATTACHMENTS` | Messaging file attachments | Conversation participants only |

---

## 25. Future Features

The following features are architecturally planned (DB schema exists or is referenced in the codebase) but not yet implemented in the UI:

### 25.1 High Priority (based on existing schema investment)

| Feature | Description |
|---|---|
| Messaging UI | Full inbox, conversation list, real-time message view using existing Supabase Realtime + messaging tables |
| Service Request Flow | Client posts request → professionals quote → client accepts → work begins → review on completion |
| Vendor Product Management | Product CRUD, inventory, product catalogue public page |
| Notification Inbox | In-app notification centre with unread badge in sidebar |
| Professional Directory | Public searchable `/professionals` page |
| Admin Verification Centre | `/admin/verifications` — unified KYC review for all roles with document modal |
| Admin Audit Logs Page | `/admin/audit` — browsable admin_logs and activity_logs |
| Seller Inquiry Inbox | `/seller/inquiries` — manage property inquiries received |

### 25.2 Medium Priority

| Feature | Description |
|---|---|
| Forum / Community | Discussion board using existing forum tables |
| Equipment Rental UI | List, search, book equipment and vehicles |
| Jobs & Tenders Board | Post and apply for construction jobs and tenders |
| Portfolio Management | Professionals add/edit portfolio items and images |
| User Search (Admin) | Search users by name/email in admin panel |
| Short-term / Holiday Rental | Booking calendar UI for shortlet properties |
| Subscription Plans | Premium badges, featured listings (is_premium field exists) |
| Admin "View As User" | Read-only preview of any account as admin |
| Suspend/Activate from User Detail | Action buttons on `/admin/users/[id]` page |

### 25.3 Lower Priority / Long-term

| Feature | Description |
|---|---|
| Property Manager Role | New role for managing properties on behalf of owners |
| Cleaning/Maintenance Services Roles | Expand professional types beyond the current four |
| Super Admin Role | Elevated admin with platform financial controls |
| Tenant Management | Lease agreements, rent collection, maintenance requests |
| Mobile App (Expo) | React Native app using existing push token infrastructure |
| SMS Notifications | Using SMS provider (field in notification_preferences) |
| Stripe Payments | Card payments for international users |
| Multilingual UI | French translation (name_fr fields exist in schema) |
| Advanced Search | Full-text search, geolocation radius search |
| Property Comparison | Side-by-side comparison of saved properties |
| Offer Management | Formal offer flow with acceptance/counter-offer |
| Auction Listings | listing_type = 'auction' exists in DB enum |
| Document e-Signing | For conveyancing agreements |

---

## 26. Known Gaps & Inconsistencies

These are discrepancies found between the DB schema, TypeScript types, and the running UI. They represent technical debt to address in future sprints.

### 26.1 TypeScript Type Gaps

| Gap | Detail |
|---|---|
| `moderator` role in DB enum but missing from TypeScript `UserRole` | `20260610000002_enums.sql` has `'moderator'` in `user_role` enum; `src/types/auth.ts` does not include it |
| `deactivated` account_status in DB enum but missing from TypeScript `AccountStatus` | DB has `'deactivated'`; TypeScript only has active/suspended/banned/pending_verification |
| Listing type divergence | DB enum has `short_term`, `lease`, `auction`; TypeScript/UI only has `sale`, `rent`, `shortlet` |

### 26.2 Missing UI Pages (routes defined, no file)

| Route | Status |
|---|---|
| `/seller/inquiries` | Referenced in `PUBLIC_ROUTES` → `constants.ts` but no page file exists |
| `/professionals` | In `PUBLIC_ROUTES`, no page |
| `/rentals` | In `PUBLIC_ROUTES`, no page |
| `/materials` | In `PUBLIC_ROUTES`, no page |
| `/services` | In `PUBLIC_ROUTES`, no page |
| `/jobs` | In `PUBLIC_ROUTES`, no page |
| `/community` | In `PUBLIC_ROUTES`, no page |
| `/about` | In `PUBLIC_ROUTES`, no page |
| `/contact` | In `PUBLIC_ROUTES`, no page |
| `/admin/audit` | Referenced in planned features; no page |
| `/admin/verifications` | Planned; no page |

### 26.3 Logic Gaps in Server Actions

| Gap | Location | Detail |
|---|---|---|
| `adminApproveProfessional` missing `seller` and `vendor` branches | `src/lib/actions/auth.ts` ~line 805 | Only handles agent/contractor/engineer/architect/lawyer; sellers and vendors cannot be approved through this function |
| `adminRejectProfessional` doesn't set `is_verified = false` | Same file | On rejection, `is_verified` is not explicitly reset (only `account_status` changes) |
| `submitKycDocuments` doesn't update `account_status` on re-submission | `auth.ts` | If a user resubmits after rejection, `account_status` stays as `suspended`; should revert to `pending_verification` |
| `revalidatePath` calls are narrow | Various actions | Some actions only revalidate one specific path instead of using `revalidatePath('/', 'layout')` |

### 26.4 Admin Dashboard Gaps

| Gap | Detail |
|---|---|
| No `rejected` tab in `/admin/professionals` | STATUS_TABS = ['pending', 'active', 'suspended']; rejected professionals are invisible |
| KYC document viewer is plain links | `<a href target="_blank">` — no inline modal for reviewing documents |
| `/admin/users/[id]` is read-only | No action buttons yet (suspend, activate, assign role, verify manually, reset password) — Feature 2+ |
| No user search | Cannot search by name/email in user list |
| No `is_verified` filter | Cannot filter users by verification status |
| Admin nav missing links | No `/admin/audit` or `/admin/verifications` in `ROLE_NAV` |

### 26.5 Review System Gate

Reviews (`createReview`) require a completed `service_request`. Since the service request flow has no UI, end users cannot post any reviews for professionals despite the action and display components existing. Reviews are effectively inoperable from the UI.

### 26.6 Migration History Conflict

Remote Supabase project has 29 migrations applied via dashboard (`20260618000003`–`20260628000001`) with no corresponding local SQL files. `supabase db push` will fail until these are either pulled or the history is repaired. Workaround: use `supabase db query --linked --file <sql>` for schema changes.

---

*End of LANDLORDZS Master Specification v1.0*

*This document must be updated whenever a feature changes status, a new table is added, or a planned feature is implemented. It governs all future development decisions in conjunction with `00_PROJECT_CONSTITUTION.md`.*
