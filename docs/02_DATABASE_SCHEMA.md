# LANDLORDZS — Database Schema Reference

Version: 2.0
Last updated: 2026-07-13
Source of truth: `supabase/migrations/` (all 33 migration files)
Application source: `src/lib/actions/auth.ts`, `src/app/**`

> Status markers — **✅ Implemented** (table has UI + server actions wired), **🚧 Partial** (table exists; UI or actions incomplete), **📋 Planned** (schema exists; no application code yet).

---

## Table of Contents

1. [Custom Enum Types](#1-custom-enum-types) — 28 types
2. [Tables by Domain](#2-tables-by-domain) — 72 tables
3. [Database Functions](#3-database-functions)
4. [Triggers](#4-triggers)
5. [Views](#5-views)
6. [RPC Functions](#6-rpc-functions)
7. [Storage Buckets](#7-storage-buckets)
8. [RLS Policies](#8-rls-policies)
9. [Summary Counts & Gaps](#9-summary-counts--gaps)

---

## 1. Custom Enum Types

All 28 types defined in `20260610000002_enums.sql`.

| # | Enum Name | Values |
|---|-----------|--------|
| 1 | `user_role` | `admin` `moderator` `buyer` `seller` `agent` `vendor` `contractor` `engineer` `architect` `lawyer` |
| 2 | `account_status` | `active` `suspended` `banned` `pending_verification` `deactivated` |
| 3 | `verification_status` | `pending` `submitted` `under_review` `approved` `rejected` `expired` |
| 4 | `kyc_level` | `none` `basic` `standard` `enhanced` — ⚠️ defined but **no column uses this type** (see §9) |
| 5 | `property_type` | `apartment` `house` `villa` `studio` `duplex` `penthouse` `land` `commercial_space` `office` `warehouse` `shop` `farm` |
| 6 | `listing_type` | `sale` `rent` `short_term` `lease` `auction` |
| 7 | `property_status` | `draft` `pending_review` `active` `under_offer` `sold` `rented` `off_market` `expired` `rejected` |
| 8 | `land_title_type` | `titre_foncier` `acte_de_vente` `bail_emphyteotique` `convention` `lettre_attribution` `none` |
| 9 | `cameroon_city` | `yaounde` `douala` `buea` `bamenda` `limbe` `kribi` `bafoussam` `ngaoundere` `maroua` `garoua` `bertoua` `ebolowa` `kumba` `nkongsamba` `edea` `other` |
| 10 | `transaction_type` | `property_sale` `property_rent` `product_purchase` `service_payment` `rental_payment` `subscription` `commission` `refund` `escrow_deposit` `escrow_release` `wallet_topup` `wallet_withdrawal` `payout` |
| 11 | `payment_provider` | `mtn_momo` `orange_money` `stripe` `bank_transfer` `cash` `wallet` |
| 12 | `payment_status` | `pending` `processing` `completed` `failed` `cancelled` `refunded` |
| 13 | `escrow_status` | `pending` `funded` `released` `disputed` `refunded` `cancelled` |
| 14 | `milestone_status` | `pending` `in_progress` `completed` `approved` `disputed` |
| 15 | `order_status` | `pending` `confirmed` `processing` `shipped` `delivered` `cancelled` `returned` `refunded` |
| 16 | `booking_status` | `pending` `confirmed` `active` `completed` `cancelled` `no_show` |
| 17 | `service_request_status` | `open` `quoted` `accepted` `in_progress` `completed` `disputed` `cancelled` |
| 18 | `job_type` | `full_time` `part_time` `contract` `freelance` `internship` |
| 19 | `job_status` | `draft` `active` `closed` `expired` `filled` |
| 20 | `application_status` | `submitted` `reviewed` `shortlisted` `interviewed` `accepted` `rejected` `withdrawn` |
| 21 | `tender_status` | `draft` `published` `closed` `awarded` `cancelled` |
| 22 | `currency_code` | `XAF` `USD` `EUR` `GBP` — ⚠️ defined but **no column uses this type** (see §9) |
| 23 | `profession_type` | `contractor` `engineer` `architect` `lawyer` |
| 24 | `report_type` | `spam` `fraud` `inappropriate` `misleading` `illegal` `harassment` `other` |
| 25 | `report_status` | `pending` `reviewing` `resolved` `dismissed` |
| 26 | `notification_type` | `message` `enquiry` `offer` `booking` `payment` `review` `property_update` `order_update` `service_update` `job_update` `system` `promotional` `verification` |
| 27 | `post_status` | `active` `pinned` `closed` `hidden` `deleted` |
| 28 | `reaction_type` | `like` `dislike` `helpful` `not_helpful` |

---

## 2. Tables by Domain

### Domain A — Auth & Profiles (6 tables)

---

#### `public.profiles` ✅

**Source:** migration `0003`; columns `account_status` renamed from `status` in `p1_fixes`; `onboarding_completed`, `expo_push_token`, `phone_verified` added in `0020`.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | — | **PK**; FK → `auth.users(id)` |
| `email` | TEXT | ✓ | — | |
| `full_name` | TEXT | | — | |
| `display_name` | TEXT | | — | |
| `phone` | TEXT | | — | |
| `avatar_url` | TEXT | | — | URL in `user-avatars` bucket |
| `cover_url` | TEXT | | — | |
| `bio` | TEXT | | — | |
| `role` | `user_role` | ✓ | `'buyer'` | |
| `account_status` | `account_status` | ✓ | `'pending_verification'` | Renamed from `status` in migration p1_fixes |
| `is_verified` | BOOLEAN | ✓ | `false` | Set by admin on KYC approval |
| `is_premium` | BOOLEAN | ✓ | `false` | |
| `is_public` | BOOLEAN | ✓ | `true` | |
| `kyc_level` | INT | | `0` | |
| `address` | TEXT | | — | |
| `city` | TEXT | | — | |
| `region` | TEXT | | — | |
| `country` | TEXT | | `'CM'` | |
| `latitude` | NUMERIC | | — | |
| `longitude` | NUMERIC | | — | |
| `language` | TEXT | | `'fr'` | |
| `currency` | TEXT | | `'XAF'` | |
| `timezone` | TEXT | | `'Africa/Douala'` | |
| `website` | TEXT | | — | |
| `social_links` | JSONB | | — | |
| `last_seen_at` | TIMESTAMPTZ | | — | |
| `onboarding_completed` | BOOLEAN | ✓ | `false` | Added in migration 0020 |
| `expo_push_token` | TEXT | | — | Added in migration 0020 |
| `phone_verified` | BOOLEAN | ✓ | `false` | Added in migration 0020 |
| `created_at` | TIMESTAMPTZ | ✓ | `now()` | |
| `updated_at` | TIMESTAMPTZ | ✓ | `now()` | Maintained by trigger |

**Indexes:** `idx_profiles_onboarding` PARTIAL (`WHERE onboarding_completed = false`); `idx_profiles_role_status` (role, account_status)

**GRANT:** `GRANT SELECT TO authenticated, anon` added in migration `20260714000001` (was missing — was root cause of admin auth failure).

**Pages:** `/admin/page.tsx` (SELECT, recent users list + RPC metrics), `/admin/users/page.tsx` (SELECT, paginated list with filters), `/admin/users/[id]/page.tsx` (SELECT single), `/admin/professionals/page.tsx` (SELECT joined), `/onboarding/page.tsx` (SELECT role/status), `/account/page.tsx`, `/account/profile/page.tsx`, all dashboard layouts via `getServerProfile()`.

**Server actions:** `signIn` (SELECT role/status/onboarding), `signUp` (INSERT via admin path), `resetPassword` (SELECT), `verifyPhoneOtp` (UPDATE phone/phone_verified), `updateBasicProfile` (UPDATE), `completeAgentProfile` (UPDATE account_status), `completeVendorProfile` —, `completeProfessionalProfile` (UPDATE account_status), `completeOnboarding` (UPDATE onboarding_completed), `adminAssignRole` (UPDATE role), `adminSuspendAccount` (UPDATE account_status), `adminActivateAccount` (UPDATE account_status), `adminApproveProfessional` (UPDATE account_status/is_verified), `adminRejectProfessional` (SELECT role).

**User roles:** All roles read own row. `admin` reads/writes any row. `moderator` reads any row.

---

#### `public.email_verifications` 📋

**Source:** migration `0003`.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | `gen_random_uuid()` | **PK** |
| `user_id` | UUID | ✓ | — | FK → `profiles(id)` ON DELETE CASCADE |
| `token` | TEXT | ✓ | — | |
| `email` | TEXT | ✓ | — | |
| `expires_at` | TIMESTAMPTZ | | — | |
| `used_at` | TIMESTAMPTZ | | — | NULL until consumed |
| `created_at` | TIMESTAMPTZ | ✓ | `now()` | |

**Note:** Supabase Auth manages email verification natively via `auth.users`. This table appears designed for a custom flow but no server actions currently write to it.

**Pages:** None. **Server actions:** None. **User roles:** N/A.

---

#### `public.phone_verifications` 📋

Same shape as `email_verifications` with `phone TEXT NOT NULL` replacing `email`. No server actions write to it (phone OTP is handled via Supabase Auth `signInWithOtp`).

---

#### `public.kyc_records` ✅

**Source:** migration `0003`; RLS policies reinstated in `20260613000002`.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | `gen_random_uuid()` | **PK** |
| `user_id` | UUID | ✓ | — | FK → `profiles(id)` |
| `level` | INT | ✓ | `1` | |
| `status` | `verification_status` | ✓ | `'pending'` | |
| `national_id_front` | TEXT | | — | Storage path in `verification-documents` |
| `national_id_back` | TEXT | | — | Storage path |
| `business_reg` | TEXT | | — | Storage path (professional cert) |
| `proof_of_address` | TEXT | | — | Storage path |
| `reviewed_by` | UUID | | — | FK → `profiles(id)` |
| `review_notes` | TEXT | | — | |
| `submitted_at` | TIMESTAMPTZ | | — | |
| `reviewed_at` | TIMESTAMPTZ | | — | |
| `created_at` | TIMESTAMPTZ | ✓ | `now()` | |
| `updated_at` | TIMESTAMPTZ | ✓ | `now()` | |

**Pages:** `/admin/professionals/page.tsx` (SELECT with signed URLs), `/admin/users/[id]/page.tsx` (SELECT with signed URLs), `/account/verification/page.tsx` (SELECT own).

**Server actions:** `submitKycDocuments` (INSERT), `adminApproveProfessional` (SELECT latest pending → UPDATE status/reviewed_by/reviewed_at), `adminRejectProfessional` (SELECT latest pending → UPDATE status/review_notes).

**User roles:** All authenticated users (INSERT own, SELECT own). `admin`/`moderator` (SELECT all, UPDATE).

---

#### `public.user_permissions` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `user_id` | UUID | ✓ | **PK** (composite), FK → `profiles(id)` |
| `permission` | TEXT | ✓ | **PK** (composite) |
| `granted_by` | UUID | | FK → `profiles(id)` |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** None. **Server actions:** None.

---

#### `public.user_sessions` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `user_id` | UUID | ✓ | FK → `profiles(id)` |
| `ip_address` | TEXT | | |
| `user_agent` | TEXT | | |
| `created_at` | TIMESTAMPTZ | ✓ | |
| `last_active` | TIMESTAMPTZ | | |

**Pages:** None. **Server actions:** None.

---

### Domain B — Agencies & Agents (2 tables)

---

#### `public.agencies` 🚧

**Source:** migration `0005`.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | `gen_random_uuid()` | **PK** |
| `owner_id` | UUID | ✓ | — | FK → `profiles(id)` |
| `name` | TEXT | ✓ | — | |
| `description` | TEXT | | — | |
| `logo_url` | TEXT | | — | |
| `license_number` | TEXT | | — | |
| `is_verified` | BOOLEAN | ✓ | `false` | |
| `city` | TEXT | | — | |
| `region` | TEXT | | — | |
| `address` | TEXT | | — | |
| `phone` | TEXT | | — | |
| `email` | TEXT | | — | |
| `website` | TEXT | | — | |
| `created_at` | TIMESTAMPTZ | ✓ | `now()` | |
| `updated_at` | TIMESTAMPTZ | ✓ | `now()` | |

**Pages:** Referenced in `properties` FK and `profiles` join but no dedicated agency management page yet.
**Server actions:** None. **User roles:** `agent`, `admin`.

---

#### `public.agent_profiles` ✅

**Source:** migration `0005`. `id` is both PK and FK to `profiles`.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | — | **PK**; FK → `profiles(id)` |
| `agency_id` | UUID | | — | FK → `agencies(id)` |
| `license_number` | TEXT | | — | |
| `license_verified` | BOOLEAN | ✓ | `false` | Set true by `adminApproveProfessional` |
| `specializations` | TEXT[] | ✓ | `'{}'` | |
| `years_experience` | INT | ✓ | `0` | Note: action writes `experience_years` — column name to verify |
| `total_listings` | INT | ✓ | `0` | |
| `total_sales` | INT | ✓ | `0` | |
| `rating_avg` | NUMERIC(3,2) | ✓ | `0` | |
| `rating_count` | INT | ✓ | `0` | |
| `created_at` | TIMESTAMPTZ | ✓ | `now()` | |
| `updated_at` | TIMESTAMPTZ | ✓ | `now()` | |

**Pages:** `/admin/professionals/page.tsx` (SELECT joined on profiles), `/admin/users/[id]/page.tsx` (SELECT role-panel), `/agent/commissions/page.tsx`.

**Server actions:** `completeAgentProfile` (UPSERT), `adminApproveProfessional` (UPDATE license_verified).

**User roles:** `agent` (own row), `admin`.

---

### Domain C — Properties & Listings (10 tables)

---

#### `public.property_categories` ✅

**Source:** migration `0006`. Seeded with 5 rows in `0018`.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | `gen_random_uuid()` | **PK** |
| `name` | TEXT | ✓ | — | |
| `name_fr` | TEXT | | — | |
| `slug` | TEXT | ✓ | — | **UNIQUE** |
| `icon` | TEXT | | — | |
| `sort_order` | INT | ✓ | `0` | |
| `is_active` | BOOLEAN | ✓ | `true` | |

**Seeded slugs:** `residential`, `commercial`, `industrial`, `land`, `agricultural`

**Pages:** `/properties/page.tsx` (filter), `/seller/listings/new/page.tsx` (category picker).
**Server actions:** None (read-only lookup). **User roles:** All (public SELECT).

---

#### `public.properties` ✅

**Source:** migration `0006`. Contains `search_vector TSVECTOR` maintained by trigger.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | `gen_random_uuid()` | **PK** |
| `owner_id` | UUID | ✓ | — | FK → `profiles(id)` |
| `agent_id` | UUID | | — | FK → `profiles(id)` |
| `agency_id` | UUID | | — | FK → `agencies(id)` |
| `category_id` | UUID | | — | FK → `property_categories(id)` |
| `title` | TEXT | ✓ | — | |
| `description` | TEXT | | — | |
| `property_type` | `property_type` | ✓ | — | |
| `listing_type` | `listing_type` | ✓ | — | |
| `status` | `property_status` | ✓ | `'draft'` | |
| `price` | BIGINT | | — | XAF |
| `price_period` | TEXT | | — | For rentals |
| `negotiable` | BOOLEAN | ✓ | `false` | |
| `bedrooms` | INT | | — | |
| `bathrooms` | INT | | — | |
| `size_sqm` | NUMERIC | | — | |
| `floors` | INT | | — | |
| `year_built` | INT | | — | |
| `city` | TEXT | | — | |
| `region` | TEXT | | — | |
| `country` | TEXT | ✓ | `'CM'` | |
| `address` | TEXT | | — | |
| `latitude` | NUMERIC | | — | |
| `longitude` | NUMERIC | | — | |
| `is_featured` | BOOLEAN | ✓ | `false` | |
| `is_verified` | BOOLEAN | ✓ | `false` | |
| `views_count` | INT | ✓ | `0` | |
| `inquiries_count` | INT | ✓ | `0` | |
| `favorites_count` | INT | ✓ | `0` | |
| `amenities` | TEXT[] | | — | |
| `search_vector` | TSVECTOR | | — | Maintained by `properties_before_save` trigger |
| `created_at` | TIMESTAMPTZ | ✓ | `now()` | |
| `updated_at` | TIMESTAMPTZ | ✓ | `now()` | |
| `published_at` | TIMESTAMPTZ | | — | |

**FK summary:** `owner_id` → profiles, `agent_id` → profiles, `agency_id` → agencies, `category_id` → property_categories.

**Pages:** `/properties/page.tsx` (public listing), `/properties/[id]/page.tsx` (public detail), `/seller/listings/page.tsx` (own listings), `/seller/listings/new/page.tsx` (create), `/seller/listings/[id]/edit/page.tsx` (edit), `/admin/properties/page.tsx` (admin review), `/admin/properties/[id]/page.tsx` (admin detail).

**Server actions:** Seller listing creation/edit (inline server actions in seller pages). Admin verification inline in `/admin/properties`.

**User roles:** Public (SELECT active listings). `seller`, `agent` (INSERT own, UPDATE own). `admin` (ALL).

**RLS:** `prop_insert` requires `is_property_creator()` AND `has_active_account()`. `prop_update` requires active account or admin.

---

#### `public.property_images` 🚧

**Source:** migration `0006`. Storage: `property-images` bucket.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `property_id` | UUID | ✓ | FK → `properties(id)` ON DELETE CASCADE |
| `url` | TEXT | ✓ | Public URL |
| `storage_path` | TEXT | | Path in `property-images` bucket |
| `caption` | TEXT | | |
| `is_primary` | BOOLEAN | ✓ | DEFAULT false |
| `sort_order` | INT | ✓ | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/properties/[id]/page.tsx`, `/seller/listings/[id]/edit/page.tsx`. **User roles:** `seller`, `agent`, `admin`.

---

#### `public.property_videos` 📋

Same shape as `property_images`. Storage: `property-videos` bucket. No dedicated UI page yet.

---

#### `public.property_amenities` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `property_id` | UUID | ✓ | FK → `properties(id)` ON DELETE CASCADE |
| `name` | TEXT | ✓ | |
| `icon` | TEXT | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

No dedicated pages. Likely rendered within property detail view.

---

#### `public.property_verifications` 🚧

**Source:** migration `0006`. Used by `get_admin_metrics()` and `get_admin_activity()` RPCs. Admin review page exists at `/admin/properties`.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `property_id` | UUID | ✓ | FK → `properties(id)` |
| `submitted_by` | UUID | | FK → `profiles(id)` |
| `status` | `verification_status` | ✓ | |
| `documents` | TEXT[] | | Storage paths |
| `notes` | TEXT | | |
| `verified_by` | UUID | | FK → `profiles(id)` |
| `verified_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | ✓ | |
| `updated_at` | TIMESTAMPTZ | ✓ | |

**Realtime:** ✅ Subscribed.

**RLS:** `propverif_mod` (ALL for moderators/admins); `propverif_owner_insert` (INSERT for property owner, added in migration `20260615000003`).

**Pages:** `/admin/properties/page.tsx`, `/admin/properties/[id]/page.tsx`. **User roles:** `seller`, `agent` (INSERT via owner check). `moderator`, `admin` (ALL).

---

#### `public.property_views` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `property_id` | UUID | ✓ | FK → `properties(id)` |
| `user_id` | UUID | | FK → `profiles(id)` — NULL for anon |
| `ip_address` | TEXT | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

Populated by `increment_property_views()` function. No dedicated UI.

---

#### `public.property_favorites` 🚧

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `user_id` | UUID | ✓ | **PK** (composite); FK → `profiles(id)` |
| `property_id` | UUID | ✓ | **PK** (composite); FK → `properties(id)` |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/buyer/favorites/page.tsx`. **User roles:** `buyer`, all authenticated users.

---

#### `public.saved_searches` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `user_id` | UUID | ✓ | FK → `profiles(id)` |
| `name` | TEXT | | |
| `filters` | JSONB | ✓ | |
| `alert_enabled` | BOOLEAN | ✓ | DEFAULT false |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Platform setting:** `max_saved_searches = 10`. No UI yet.

---

#### `public.property_inquiries` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `property_id` | UUID | ✓ | FK → `properties(id)` |
| `sender_id` | UUID | ✓ | FK → `profiles(id)` |
| `message` | TEXT | ✓ | |
| `contact_phone` | TEXT | | |
| `status` | TEXT | | |
| `replied_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

Referenced in `get_admin_metrics` indirectly (via `inquiries_count` on properties). No UI page for inbox yet.

---

### Domain D — Marketplace / Vendor (9 tables)

---

#### `public.vendor_profiles` ✅

**Source:** migration `0007`. `id` = PK and FK to profiles.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | — | **PK**; FK → `profiles(id)` |
| `business_name` | TEXT | | — | |
| `business_reg` | TEXT | | — | |
| `tax_id` | TEXT | | — | |
| `is_verified` | BOOLEAN | ✓ | `false` | ⚠️ NOT set by `adminApproveProfessional` (see §9) |
| `rating_avg` | NUMERIC | | — | |
| `rating_count` | INT | | — | |
| `total_sales` | INT | | — | |
| `store_description` | TEXT | | — | |
| `store_logo` | TEXT | | — | |
| `created_at` | TIMESTAMPTZ | ✓ | `now()` | |
| `updated_at` | TIMESTAMPTZ | ✓ | `now()` | |

**Note:** `completeVendorProfile` action writes `store_name` and `store_slug` columns. These columns are not in migration 0007 — likely added in a remote-only migration or `store_name`/`store_slug` map to `business_name` and a slug field.

**Pages:** `/vendor/page.tsx`, `/admin/professionals/page.tsx`.

**Server actions:** `completeVendorProfile` (UPSERT). `adminApproveProfessional` does NOT update `vendor_profiles.is_verified` — known gap (see §9).

**User roles:** `vendor` (own row). `admin` (ALL).

---

#### `public.product_categories` 📋

**Source:** migration `0007`. Seeded with 12 rows in `0018`. `slug` UNIQUE. Supports `parent_id` for hierarchy.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `name` / `name_fr` | TEXT | ✓ / — | |
| `slug` | TEXT | ✓ | **UNIQUE** |
| `parent_id` | UUID | | FK → `product_categories(id)` (self-ref) |
| `sort_order` | INT | ✓ | DEFAULT 0 |
| `is_active` | BOOLEAN | ✓ | DEFAULT true |

---

#### `public.products` 🚧

**Source:** migration `0007`.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `vendor_id` | UUID | ✓ | FK → `profiles(id)` |
| `category_id` | UUID | | FK → `product_categories(id)` |
| `title` | TEXT | ✓ | |
| `description` | TEXT | | |
| `sku` | TEXT | | |
| `price` | BIGINT | ✓ | XAF |
| `unit` | TEXT | | e.g. `bag`, `ton` |
| `stock` | INT | | |
| `min_order` | INT | ✓ | DEFAULT 1 |
| `is_available` | BOOLEAN | ✓ | DEFAULT true |
| `is_featured` | BOOLEAN | ✓ | DEFAULT false |
| `rating_avg` | NUMERIC | | |
| `rating_count` | INT | | |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/vendor/page.tsx` (stub). **User roles:** `vendor` (own), public (SELECT available).

---

#### `public.product_images` 📋

Same shape as `property_images`. FK → `products(id)`. Storage: `marketplace-products` bucket.

#### `public.product_variants` 📋

FK → `products(id)`. Columns: `id`, `product_id`, `name`, `options JSONB`, `price_modifier BIGINT`, `stock INT`.

#### `public.inventory_logs` 📋

FK → `products(id)`. Records stock changes. Columns: `id`, `product_id`, `change INT`, `reason TEXT`, `created_by UUID → profiles`, `created_at`.

#### `public.cart_items` 📋

**UNIQUE** on `(user_id, product_id, variant_id)`. FK → `profiles`, `products`, `product_variants`.

#### `public.orders` 🚧

**Source:** migration `0007`. **Realtime:** ✅ Subscribed.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `buyer_id` | UUID | ✓ | FK → `profiles(id)` |
| `vendor_id` | UUID | ✓ | FK → `profiles(id)` |
| `status` | `order_status` | ✓ | DEFAULT `'pending'` |
| `total` / `subtotal` / `delivery_fee` | BIGINT | | XAF |
| `delivery_address` | JSONB | | |
| `notes` | TEXT | | |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/vendor/page.tsx` (stub), `/account/page.tsx`. **Realtime subscribed.**
**User roles:** `buyer` (own purchases), `vendor` (own sales), `admin`.

#### `public.order_items` 📋

FK → `orders(id)`, `products(id)`, `product_variants(id)`. Columns: `id`, `order_id`, `product_id`, `variant_id`, `quantity`, `unit_price BIGINT`, `total_price BIGINT`.

---

### Domain E — Professional Services (9 tables)

---

#### `public.professional_profiles` ✅

**Source:** migration `0008`. `id` = PK and FK to profiles.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | — | **PK**; FK → `profiles(id)` |
| `license_number` | TEXT | | — | |
| `license_verified` | BOOLEAN | ✓ | `false` | |
| `specializations` | TEXT[] | ✓ | `'{}'` | |
| `years_experience` | INT | ✓ | `0` | |
| `is_verified` | BOOLEAN | ✓ | `false` | Set true by `adminApproveProfessional` |
| `rating_avg` | NUMERIC(3,2) | ✓ | `0` | |
| `rating_count` | INT | ✓ | `0` | |
| `hourly_rate` | BIGINT | | — | |
| `availability` | TEXT | | — | |
| `portfolio_url` | TEXT | | — | |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | `now()` | |

**Note:** `completeProfessionalProfile` action also writes `profession_type`, `company_name`, `day_rate`, `service_areas`, `is_available`. These columns are not in migration 0008 — likely added in a remote-only migration or the action column names differ from schema column names.

**Pages:** `/admin/professionals/page.tsx` (SELECT joined), `/admin/users/[id]/page.tsx`, `/contractor/page.tsx`, `/engineer/page.tsx`, `/architect/page.tsx`, `/lawyer/page.tsx`.

**Server actions:** `completeProfessionalProfile` (UPSERT), `adminApproveProfessional` (UPDATE is_verified, license_verified).

**User roles:** `contractor`, `engineer`, `architect`, `lawyer` (own). `admin` (ALL).

---

#### `public.portfolio_items` 📋

FK → `profiles(id)`. Columns: `id`, `professional_id`, `title`, `description`, `project_type`, `completed_at DATE`, `client_name`, `city`, `created_at`.

#### `public.portfolio_images` 📋

FK → `portfolio_items(id)`. Storage: `service-portfolios` bucket.

#### `public.service_categories` 📋

Seeded with 10 rows. `slug` UNIQUE. See §9 seed data.

#### `public.service_listings` 📋

FK → `profiles(id)`, `service_categories(id)`. `price_type` IN (`fixed`, `hourly`, `quote`).

#### `public.service_requests` 📋

Client-posted job requests. Status: `service_request_status`. FK → `profiles`, `service_categories`.

#### `public.service_quotations` 📋

Professional responses to service requests. FK → `service_requests`, `profiles`.

#### `public.service_contracts` 📋

FK → `service_requests`, `profiles` (professional_id, client_id).

#### `public.service_bookings` 🚧

**Source:** migration `0008`. **Realtime:** ✅ Subscribed.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `listing_id` | UUID | ✓ | FK → `service_listings(id)` |
| `client_id` | UUID | ✓ | FK → `profiles(id)` |
| `professional_id` | UUID | ✓ | FK → `profiles(id)` |
| `scheduled_at` | TIMESTAMPTZ | ✓ | |
| `status` | `booking_status` | ✓ | DEFAULT `'pending'` |
| `notes` | TEXT | | |
| `total` | BIGINT | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Realtime subscribed.** No dedicated booking page yet.

---

### Domain F — Equipment Rentals (3 tables)

---

#### `public.rental_categories` 📋

Seeded with 8 rows. `slug` UNIQUE. `type` TEXT CHECK (`equipment`, `vehicle`).

#### `public.rental_listings` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `owner_id` | UUID | ✓ | FK → `profiles(id)` |
| `category_id` | UUID | | FK → `rental_categories(id)` |
| `title` / `description` | TEXT | | |
| `daily_rate` / `weekly_rate` / `monthly_rate` | BIGINT | | XAF |
| `deposit` | BIGINT | | |
| `location` | TEXT | | |
| `is_available` | BOOLEAN | ✓ | DEFAULT true |
| `images` | TEXT[] | | |
| `specifications` | JSONB | | |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | |

No dedicated pages or server actions yet.

#### `public.rental_bookings` 📋

FK → `rental_listings(id)`, `profiles(id)` (renter). Columns: `id`, `listing_id`, `renter_id`, `start_date DATE`, `end_date DATE`, `total BIGINT`, `status TEXT`, `notes TEXT`, `created_at`.

---

### Domain G — Forum (4 tables)

---

#### `public.forum_categories` 📋

Seeded with 6 rows. `slug` UNIQUE.

#### `public.forum_posts` 📋

**Source:** migration `0010`. Contains `search_vector TSVECTOR` (FTS in French).

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `author_id` | UUID | ✓ | FK → `profiles(id)` |
| `category_id` | UUID | | FK → `forum_categories(id)` |
| `title` | TEXT | ✓ | |
| `content` | TEXT | | |
| `status` | `post_status` | ✓ | DEFAULT `'active'` |
| `is_pinned` | BOOLEAN | ✓ | DEFAULT false |
| `views_count` / `reply_count` | INT | ✓ | DEFAULT 0 |
| `last_reply_at` | TIMESTAMPTZ | | |
| `search_vector` | TSVECTOR | | Maintained by trigger |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | |

No dedicated forum UI page found in routes. All roles can post (RLS via auth).

#### `public.forum_comments` 📋

Self-referencing via `parent_id` for threading. FK → `forum_posts`, `profiles`.

#### `public.forum_reactions` 📋

**UNIQUE** on `(user_id, target_type, target_id)`. Polymorphic target (post or comment).

---

### Domain H — Messaging (4 tables)

---

#### `public.conversations` 📋

**Source:** migration `0011`. **Realtime:** ✅ Subscribed.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `type` | TEXT | | `direct` or `group` |
| `subject` | TEXT | | |
| `related_entity_type` | TEXT | | e.g. `property`, `order` |
| `related_entity_id` | UUID | | |
| `created_by` | UUID | | FK → `profiles(id)` |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | |

#### `public.conversation_participants` 📋

**Realtime:** ✅ Subscribed (`supabase_realtime` entry uses name `conversations_participants`).

**PK:** composite `(conversation_id, user_id)`.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `conversation_id` | UUID | ✓ | FK → `conversations(id)` |
| `user_id` | UUID | ✓ | FK → `profiles(id)` |
| `joined_at` | TIMESTAMPTZ | ✓ | |
| `left_at` | TIMESTAMPTZ | | |
| `last_read_at` | TIMESTAMPTZ | | |

#### `public.messages` 📋

**Realtime:** ✅ Subscribed.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `conversation_id` | UUID | ✓ | FK → `conversations(id)` |
| `sender_id` | UUID | ✓ | FK → `profiles(id)` |
| `content` | TEXT | | |
| `message_type` | TEXT | | `text`, `image`, `file`, `audio`, `video`, `system` |
| `is_deleted` | BOOLEAN | ✓ | DEFAULT false |
| `edited_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

#### `public.message_attachments` 📋

Storage: `chat-attachments` bucket. Path: `{conversation_id}/{sender_id}/{uuid}.ext`.
FK → `messages(id)`. Columns: `id`, `message_id`, `url`, `storage_path`, `filename`, `size_bytes BIGINT`, `mime_type`, `created_at`.

---

### Domain I — Notifications & Reviews (4 tables)

---

#### `public.notification_preferences` 📋

**PK:** `user_id`. One row per user.

| Column | Type | NN | Default |
|--------|------|----|---------|
| `user_id` | UUID | ✓ | — PK + FK → profiles |
| `email_notifications` | BOOLEAN | ✓ | true |
| `push_notifications` | BOOLEAN | ✓ | true |
| `sms_notifications` | BOOLEAN | ✓ | false |
| `notification_types` | JSONB | | — |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | |

#### `public.notifications` 🚧

**Source:** migration `0012`. **Realtime:** ✅ Subscribed.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `user_id` | UUID | ✓ | FK → `profiles(id)` |
| `type` | `notification_type` | ✓ | |
| `title` | TEXT | ✓ | |
| `body` | TEXT | | |
| `data` | JSONB | | |
| `is_read` | BOOLEAN | ✓ | DEFAULT false |
| `read_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

Written by admin approval/rejection actions. No dedicated notifications inbox page found in routes.

**User roles:** All authenticated users (SELECT own). `admin` (INSERT on behalf of any user).

#### `public.reviews` 🚧

Polymorphic target. `rating` CHECK (1–5).

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `reviewer_id` | UUID | ✓ | FK → `profiles(id)` |
| `target_type` | TEXT | ✓ | |
| `target_id` | UUID | ✓ | |
| `rating` | INT | ✓ | CHECK 1–5 |
| `title` | TEXT | | |
| `body` | TEXT | | |
| `is_verified` | BOOLEAN | ✓ | DEFAULT false |
| `helpful_count` | INT | ✓ | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/account/reviews/page.tsx`. **User roles:** All authenticated users (INSERT). Any (SELECT).

#### `public.review_responses` 📋

FK → `reviews(id)`, `profiles(id)` (responder). Columns: `id`, `review_id`, `responder_id`, `body`, `created_at`.

---

### Domain J — Payments, Wallets & Escrow (8 tables)

---

#### `public.wallets` ✅

**Source:** migration `0013`. Auto-created by `on_profile_created` trigger. One row per user.

| Column | Type | NN | Default | Constraints |
|--------|------|----|---------|-------------|
| `id` | UUID | ✓ | `gen_random_uuid()` | **PK** |
| `user_id` | UUID | ✓ | — | **UNIQUE**; FK → `profiles(id)` |
| `balance` | BIGINT | ✓ | `0` | XAF kobo |
| `locked` | BIGINT | ✓ | `0` | Reserved for pending payouts |
| `currency` | TEXT | ✓ | `'XAF'` | |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | `now()` | |

**Pages:** `/account/wallet/page.tsx`.

**Server actions:** Written only via `wallet_transfer()` DB function (called by `release_escrow()`). Available balance = `balance - locked`.

**User roles:** All authenticated users (SELECT own). Only DB functions can modify.

---

#### `public.wallet_transactions` ✅

Immutable ledger. Written only by `wallet_transfer()` function.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `wallet_id` | UUID | ✓ | FK → `wallets(id)` |
| `user_id` | UUID | ✓ | FK → `profiles(id)` — denormalized |
| `type` | TEXT | ✓ | `'credit'` or `'debit'` |
| `amount` | BIGINT | ✓ | |
| `balance_before` / `balance_after` | BIGINT | ✓ | |
| `reference_type` | TEXT | | e.g. `escrow`, `order` |
| `reference_id` | UUID | | |
| `description` | TEXT | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/account/transactions/page.tsx`. **User roles:** All authenticated (SELECT own). Immutable (no UPDATE/DELETE policy).

---

#### `public.transactions` 🚧

Payment-gateway level transactions.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `buyer_id` / `seller_id` | UUID | | FK → `profiles(id)` |
| `amount` / `fee` / `net_amount` | BIGINT | | XAF |
| `currency` | TEXT | | |
| `type` | `transaction_type` | | |
| `status` | `payment_status` | | |
| `payment_method` / `payment_ref` | TEXT | | |
| `reference_type` / `reference_id` | TEXT / UUID | | |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/account/transactions/page.tsx`. **User roles:** Buyer/seller (SELECT own), admin.

---

#### `public.escrow_accounts` 🚧

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `payer_id` | UUID | ✓ | FK → `profiles(id)` |
| `payee_id` | UUID | ✓ | FK → `profiles(id)` |
| `amount` | BIGINT | ✓ | |
| `platform_fee` | BIGINT | | |
| `status` | `escrow_status` | ✓ | DEFAULT `'pending'` |
| `description` | TEXT | | |
| `release_condition` | TEXT | | |
| `auto_release_at` | TIMESTAMPTZ | | |
| `released_at` | TIMESTAMPTZ | | |
| `disputed_at` | TIMESTAMPTZ | | |
| `created_at` / `updated_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/account/escrow/page.tsx`, `/account/escrow/[id]/page.tsx`, `/admin/escrow/page.tsx`.

**RLS:** `escrow_update_parties` allows payer or payee to UPDATE (added in p1_fixes). Admin ALL.

`release_escrow()` function handles release flow. **User roles:** `payer_id` or `payee_id` (SELECT, UPDATE). `admin` (ALL).

---

#### `public.escrow_milestones` 📋

FK → `escrow_accounts(id)`. Status: `milestone_status`.

#### `public.escrow_events` 📋

Immutable audit trail. FK → `escrow_accounts(id)`. Written by `release_escrow()`.

---

#### `public.payouts` ✅

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `recipient_id` | UUID | ✓ | FK → `profiles(id)` |
| `amount` | BIGINT | ✓ | |
| `currency` | TEXT | ✓ | |
| `method` | TEXT | ✓ | `mtn_momo`, `orange_money`, `bank` |
| `account_details` | JSONB | | |
| `status` | `payment_status` | ✓ | DEFAULT `'pending'` |
| `processed_at` | TIMESTAMPTZ | | |
| `failure_reason` | TEXT | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

**RLS:** `payout_own` (SELECT own), `payout_insert` (INSERT own — added in p1_fixes), `payout_admin` (ALL for admin).

**Pages:** `/account/payouts/page.tsx`, `/admin/payouts/page.tsx`.

**User roles:** All authenticated users (INSERT/SELECT own). `admin` (ALL).

---

#### `public.commission_records` 🚧

FK → `transactions(id)`, `profiles(id)` (agent).

| Column | Type | NN |
|--------|------|----|
| `id` | UUID | ✓ |
| `transaction_id` | UUID | FK → transactions |
| `agent_id` | UUID | FK → profiles |
| `amount` | BIGINT | |
| `rate` | NUMERIC | |
| `type` | TEXT | |
| `status` | TEXT | DEFAULT `'pending'` |
| `paid_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | ✓ |

**Pages:** `/admin/commissions/page.tsx`, `/agent/commissions/page.tsx`. **User roles:** `agent` (SELECT own), `admin`.

---

### Domain K — Jobs & Tenders (4 tables)

---

#### `public.jobs` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `poster_id` | UUID | ✓ | FK → `profiles(id)` |
| `title` / `description` | TEXT | | |
| `location` | TEXT | | |
| `job_type` | `job_type` | | |
| `budget_min` / `budget_max` | BIGINT | | |
| `deadline` | DATE | | |
| `status` | `job_status` | ✓ | DEFAULT `'draft'` |
| `created_at` | TIMESTAMPTZ | ✓ | |

#### `public.job_applications` 📋

FK → `jobs(id)`, `profiles(id)` (applicant). Status: `application_status`.

#### `public.tenders` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `issuer_id` | UUID | ✓ | FK → `profiles(id)` |
| `title` / `description` / `scope` | TEXT | | |
| `budget` | BIGINT | | |
| `submission_deadline` | TIMESTAMPTZ | | |
| `status` | `tender_status` | ✓ | DEFAULT `'draft'` |
| `documents` | TEXT[] | | Storage paths in `tender-documents` bucket |
| `created_at` | TIMESTAMPTZ | ✓ | |

Note: `tender-documents` bucket was in migration 0017 (stale) but not in 0019 (canonical). Bucket may not exist. See §9.

#### `public.tender_bids` 📋

FK → `tenders(id)`, `profiles(id)` (bidder). Status: `application_status`.

---

### Domain L — Admin & Moderation (5 tables)

---

#### `public.moderation_reports` 🚧

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `reporter_id` | UUID | ✓ | FK → `profiles(id)` |
| `target_type` | TEXT | ✓ | |
| `target_id` | UUID | ✓ | |
| `reason` | `report_type` | ✓ | |
| `description` | TEXT | | |
| `status` | `report_status` | ✓ | DEFAULT `'pending'` |
| `resolved_by` | UUID | | FK → `profiles(id)` |
| `resolved_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/admin/reports/page.tsx`. **User roles:** All (INSERT to report). `admin`, `moderator` (ALL).

---

#### `public.admin_logs` ✅

Records discrete admin actions. Written by server actions.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `actor_id` | UUID | ✓ | FK → `profiles(id)` |
| `action` | TEXT | ✓ | e.g. `suspend_account`, `activate_account`, `assign_role` |
| `target_id` | UUID | | Affected user/entity UUID |
| `target_type` | TEXT | | |
| `metadata` | JSONB | | Action-specific data — note: action writes `new_data` key, not `metadata` |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/admin/users/[id]/page.tsx` (SELECT for action history).

**Server actions:** `adminSuspendAccount` (INSERT). Also used by `get_admin_activity()` RPC to surface suspensions.

**User roles:** `admin` (INSERT, SELECT all). No user-facing read.

---

#### `public.activity_logs` 🚧

Records user-initiated actions.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `user_id` | UUID | ✓ | FK → `profiles(id)` |
| `action` | TEXT | ✓ | |
| `entity_type` / `entity_id` | TEXT / UUID | | |
| `metadata` | JSONB | | |
| `ip_address` | TEXT | | |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/admin/users/[id]/page.tsx` (SELECT recent activity). **User roles:** `admin` (ALL). Individual users cannot read their own logs.

---

#### `public.announcements` 📋

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `title` / `content` | TEXT | ✓ | |
| `target_roles` | TEXT[] | | |
| `is_active` | BOOLEAN | ✓ | DEFAULT true |
| `published_at` / `expires_at` | TIMESTAMPTZ | | |
| `created_by` | UUID | | FK → `profiles(id)` |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Pages:** `/admin/settings/page.tsx` (referenced but may be stub). **User roles:** `admin` (ALL). All users (SELECT active).

---

#### `public.platform_settings` ✅

Key-value store. **PK:** `key TEXT`. 19 rows seeded in migration 0018.

| Column | Type | NN |
|--------|------|----|
| `key` | TEXT | ✓ PK |
| `value` | TEXT | ✓ |
| `type` | TEXT | — `string`, `number`, `boolean`, `json` |
| `description` | TEXT | |
| `updated_by` | UUID → profiles | |
| `updated_at` | TIMESTAMPTZ | |

**Seeded keys (selected):**

| Key | Value | Type |
|-----|-------|------|
| `platform_commission_pct` | 2.50 | number |
| `agent_commission_pct` | 3.00 | number |
| `vendor_commission_pct` | 5.00 | number |
| `escrow_auto_release_days` | 30 | number |
| `max_property_images` | 20 | number |
| `featured_listing_fee_xaf` | 15000 | number |
| `min_withdrawal_xaf` | 5000 | number |
| `kyc_required_for_seller` | true | boolean |
| `kyc_required_for_vendor` | true | boolean |
| `mtn_momo_enabled` | true | boolean |
| `orange_money_enabled` | true | boolean |
| `stripe_enabled` | false | boolean |
| `maintenance_mode` | false | boolean |
| `currency` | XAF | string |

**Pages:** `/admin/settings/page.tsx`. **User roles:** `admin` (UPDATE), all (SELECT).

---

### Domain M — Account Notices & Appeals (2 tables)

---

#### `public.account_notices` ✅

**Source:** migration `20260615000002`.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `user_id` | UUID | ✓ | FK → `profiles(id)` ON DELETE CASCADE |
| `type` | TEXT | ✓ | CHECK: `rejection`, `suspension`, `ban` |
| `reason` | TEXT | ✓ | |
| `created_by` | UUID | | FK → `profiles(id)` ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Index:** `idx_notices_user_type` on `(user_id, type, created_at DESC)`.

**Pages:** `/account/pending/page.tsx`, `/account/suspended/page.tsx`.

**Server actions:** `adminSuspendAccount` (INSERT — type `'suspension'`), `adminRejectProfessional` (INSERT — type `'rejection'`).

**User roles:** `admin` (INSERT/UPDATE/DELETE). Any user (SELECT own).

---

#### `public.account_appeals` ✅

**Source:** migration `20260615000002`.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `user_id` | UUID | ✓ | FK → `profiles(id)` ON DELETE CASCADE |
| `notice_id` | UUID | | FK → `account_notices(id)` ON DELETE SET NULL |
| `message` | TEXT | ✓ | |
| `status` | TEXT | ✓ | DEFAULT `'pending'`; CHECK: `pending`, `reviewed` |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Indexes:** `idx_appeals_user` on `(user_id, status, created_at DESC)`, `idx_appeals_notice`, `idx_appeals_status`.

**Pages:** `/account/suspended/page.tsx`, `/account/pending/page.tsx`.

**Server actions:** `submitAppeal` (INSERT own).

**User roles:** All authenticated users (INSERT own, SELECT own). `admin` (SELECT all, UPDATE).

---

### Domain N — Security / Rate Limiting (2 tables)

---

#### `public.password_reset_attempts` ✅

**Source:** migration `20260618000002`.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `email` | TEXT | ✓ | |
| `ip` | TEXT | ✓ | |
| `created_at` | TIMESTAMPTZ | ✓ | |

**Indexes:** `idx_reset_attempts_email` on `(email, created_at DESC)`, `idx_reset_attempts_ip` on `(ip, created_at DESC)`.

**RLS:** Enabled with **zero policies** — accessible only via `createAdminClient()` (service-role).

**Rate limit:** 3 attempts per 15-minute window per email OR per IP.

**Server actions:** `forgotPassword` (SELECT count, INSERT). **User roles:** None via RLS. Service-role only.

---

#### `public.account_recovery_requests` ✅

**Source:** migration `20260618000002`.

| Column | Type | NN | Constraints |
|--------|------|----|-------------|
| `id` | UUID | ✓ | **PK** |
| `full_name` | TEXT | ✓ | |
| `phone` | TEXT | ✓ | |
| `alternative_email` | TEXT | ✓ | |
| `note` | TEXT | | |
| `status` | TEXT | ✓ | DEFAULT `'pending'`; CHECK: `pending`, `in_progress`, `resolved`, `rejected`, `expired` |
| `reviewed_at` | TIMESTAMPTZ | | |
| `reviewed_by` | UUID | | FK → `profiles(id)` ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | ✓ | DEFAULT `now()` |
| `expires_at` | TIMESTAMPTZ | ✓ | DEFAULT `now() + INTERVAL '7 days'` |

**Index:** `idx_recovery_requests_status` on `(status, created_at DESC)`.

**RLS:** Enabled with **zero policies** — service-role only.

**Pages:** `/account-recovery/page.tsx`.

**Server actions:** `submitAccountRecoveryRequest` (INSERT — no auth required). **User roles:** None via RLS. Service-role reads via Supabase Studio.

---

## 3. Database Functions

All in `public` schema. **SECURITY DEFINER** = runs with owner privileges, bypasses RLS.

### Utility / Trigger Helpers

| Function | Returns | SECURITY | Source | Description |
|----------|---------|----------|--------|-------------|
| `trigger_set_updated_at()` | TRIGGER | INVOKER | `0004` | Sets `NEW.updated_at = now()` |
| `attach_updated_at(tbl regclass)` | VOID | INVOKER | `0004` | Attaches `trigger_set_updated_at` to any table |
| `get_my_role()` | `user_role` | DEFINER | `0004` | Returns caller's role from `profiles` |
| `is_admin()` | BOOLEAN | DEFINER STABLE | `0004` | TRUE if caller's role = `'admin'` |
| `is_moderator()` | BOOLEAN | DEFINER STABLE | `0004` | TRUE if role IN (`admin`, `moderator`) |
| `has_active_account()` | BOOLEAN | DEFINER STABLE | `0015000001` | TRUE if caller's `account_status = 'active'` |
| `is_property_creator()` | BOOLEAN | DEFINER STABLE | `0018000001` | TRUE if role IN (`seller`, `agent`, `admin`) |

### Auth / Profile Creation

| Function | Returns | Source | Description |
|----------|---------|--------|-------------|
| `handle_new_user()` | TRIGGER | `0004` + `p1_fixes` | AFTER INSERT on `auth.users`. Copies email/full_name/avatar_url/phone/role from `raw_user_meta_data` into new `profiles` row. **Was commented out in 0004; activated in p1_fixes.** |
| `handle_new_profile()` | TRIGGER | `p1_fixes` | AFTER INSERT on `profiles`. Creates `wallets` row (ON CONFLICT DO NOTHING). Backfill ran on existing profiles. |

### Property

| Function | Returns | Source | Description |
|----------|---------|--------|-------------|
| `properties_before_save()` | TRIGGER | `0006` | BEFORE INSERT OR UPDATE on `properties`. Builds `search_vector` from `title`, `description`, `city`, `address` using `to_tsvector('french', ...)`. |
| `increment_property_views(prop_id UUID)` | VOID | `0006` | Atomically increments `properties.views_count`. |
| `refresh_rating(tbl text, id uuid)` | VOID | `0004` | Recalculates `rating_avg`/`rating_count` from `reviews` on any target table. |

### Financial

| Function | Signature | Source | Description |
|----------|-----------|--------|-------------|
| `wallet_transfer` | `(p_from_id UUID, p_to_id UUID, p_amount BIGINT, p_ref_type TEXT, p_ref_id UUID, p_desc TEXT) → VOID` | `p1_fixes` (rewrote `0004`) | Three modes: (a) `p_from_id=NULL` credit-only; (b) `p_to_id=NULL` debit-only; (c) both set — full transfer. Guards: amount > 0, from ≠ to, sufficient balance. Writes `wallet_transactions`. SECURITY DEFINER. |
| `wallet_lock` | `(p_user_id UUID, p_amount BIGINT) → VOID` | `0014000001` | Atomically increments `wallets.locked`. |
| `wallet_unlock` | `(p_user_id UUID, p_amount BIGINT) → VOID` | `0014000001` | Atomically decrements `wallets.locked` (GREATEST 0). |
| `release_escrow` | `(p_escrow_id UUID) → VOID` | `p1_fixes` (was commented out in `0004`) | Credits payee via `wallet_transfer(NULL, payee, amount)`, sets escrow status = `released`, writes `escrow_events`. SECURITY DEFINER. |

---

## 4. Triggers

| Trigger Name | Table | Timing | Function | Notes |
|---|---|---|---|---|
| `set_updated_at` (profiles) | `public.profiles` | BEFORE UPDATE | `trigger_set_updated_at` | Created via `attach_updated_at` |
| `set_updated_at` (all other tables) | Various | BEFORE UPDATE | `trigger_set_updated_at` | Applied to every table with `updated_at` |
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` | **Activated in p1_fixes** — was commented out in 0004. Creates `profiles` row. |
| `on_profile_created` | `public.profiles` | AFTER INSERT | `handle_new_profile()` | Added in p1_fixes. Creates `wallets` row. |
| `properties_fts_update` | `public.properties` | BEFORE INSERT OR UPDATE | `properties_before_save()` | Maintains `search_vector` TSVECTOR. |
| (forum posts FTS) | `public.forum_posts` | BEFORE INSERT OR UPDATE | (forum FTS function) | Maintains `search_vector` on forum posts. |

---

## 5. Views

| View | Status | Notes |
|------|--------|-------|
| `public.storage_bucket_summary` | ❌ DROPPED | Created in `0019`; dropped in `20260614000003` — joining `storage.buckets` caused PostgREST schema cache failures (`PGRST301`). Do not recreate. |

**No active views.** Total: 0.

---

## 6. RPC Functions

Functions callable via `supabase.rpc()` from application code:

| RPC | Returns | Guard | Used By |
|-----|---------|-------|---------|
| `get_admin_metrics()` | `JSONB` | `is_admin()` — raises exception if not admin | `/admin/page.tsx` |
| `get_admin_activity(p_limit INT DEFAULT 20)` | `TABLE (action, entity_type, entity_id, label, actor_name, occurred_at)` | `is_admin()` filters rows (returns 0 rows for non-admins) | `/admin/page.tsx` |
| `release_escrow(p_escrow_id UUID)` | `VOID` | (no RLS guard — caller must be admin or called from admin action) | `/account/escrow/[id]/page.tsx` (intended) |
| `wallet_transfer(...)` | `VOID` | SECURITY DEFINER (own balance check) | Internal (called by `release_escrow`, payout processing) |
| `wallet_lock(p_user_id, p_amount)` | `VOID` | SECURITY DEFINER | Payout request flow |
| `wallet_unlock(p_user_id, p_amount)` | `VOID` | SECURITY DEFINER | Payout completion/cancellation |

---

## 7. Storage Buckets

Defined in `20260610000019_storage_buckets_policies.sql` (canonical). Migration 0017 created stale bucket names — cleaned up in `20260614000002`.

| Bucket ID | Public | Max Size | MIME Types | Path Convention |
|-----------|--------|----------|------------|----------------|
| `property-images` | ✅ Public | 10 MB | JPEG, PNG, WEBP, GIF | `{user_id}/{property_id}/{uuid}.ext` |
| `property-videos` | ✅ Public | 100 MB | MP4, WEBM, MOV, AVI | `{user_id}/{property_id}/{uuid}.ext` |
| `user-avatars` | ✅ Public | 5 MB | JPEG, PNG, WEBP, GIF | `{user_id}/{uuid}.ext` |
| `verification-documents` | 🔒 Private | 20 MB | JPEG, PNG, PDF | `{user_id}/{uuid}.ext` |
| `marketplace-products` | ✅ Public | 10 MB | JPEG, PNG, WEBP | `{user_id}/{product_id}/{uuid}.ext` |
| `service-portfolios` | ✅ Public | 25 MB | JPEG, PNG, WEBP, PDF | `{user_id}/{portfolio_id}/{uuid}.ext` |
| `forum-images` | ✅ Public | 10 MB | JPEG, PNG, WEBP, GIF | `{user_id}/{post_id}/{uuid}.ext` |
| `chat-attachments` | 🔒 Private | 50 MB | JPEG, PNG, WEBP, GIF, PDF, MP4, WEBM, MP3, OGG, WAV | `{conversation_id}/{sender_id}/{uuid}.ext` |

**Constant reference:** `src/lib/utils/constants.ts` exports `STORAGE_BUCKETS`:

| Constant Key | Value | Matches Canonical Bucket? |
|---|---|---|
| `VERIFY_DOCS` | `'verification-documents'` | ✅ |
| `USER_AVATARS` | `'user-avatars'` | ✅ |
| `PROPERTY_IMAGES` | `'property-images'` | ✅ |
| `PROPERTY_VIDEOS` | `'property-videos'` | ✅ |
| `MARKETPLACE` | `'marketplace-products'` | ✅ |
| `PORTFOLIOS` | `'service-portfolios'` | ✅ |
| `FORUM_IMAGES` | `'forum-images'` | ✅ |
| `CHAT_ATTACHMENTS` | `'chat-attachments'` | ✅ |

Note: `tender-documents`, `service-contracts`, `avatars`, `product-images`, `portfolio-images`, `message-attachments` buckets were created in stale migration 0017 and dropped/replaced. They should NOT be referenced in application code.

---

## 8. RLS Policies

All public schema tables have `ENABLE ROW LEVEL SECURITY`. Storage policies all use `lzs_*` naming prefix.

### Critical: `GRANT SELECT` on `profiles`

The following `GRANT` was missing until `20260714000001`:

```sql
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
```

Without this GRANT, PostgreSQL rejected every profile read with error `42501` **before** RLS was evaluated. This was the root cause of the admin authentication failure.

### Policy Summary by Table

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | USING true (all rows) + `profiles_admin_all` | (via trigger only) | Own with privilege escalation check + admin | Admin |
| `kyc_records` | Own or moderator | Own | Moderator/admin | — |
| `agent_profiles` | Own | — | Own + admin | Admin |
| `vendor_profiles` | Own | — | Own + admin | Admin |
| `professional_profiles` | Own | — | Own + admin | Admin |
| `properties` | Public | `is_property_creator() AND has_active_account()` | Owner/agent + active account | Admin |
| `property_verifications` | Moderator | Property owner | Moderator | Admin |
| `property_favorites` | Own | Own | — | Own |
| `wallets` | Own | (trigger only) | (function only) | — |
| `wallet_transactions` | Own | (function only) | — | — |
| `payouts` | Own | Own | — | Admin |
| `escrow_accounts` | Payer/payee | — | Payer/payee | Admin |
| `notifications` | Own | Admin | — | Own |
| `account_notices` | Own or admin | Admin | Admin | Admin |
| `account_appeals` | Own / admin | Own | Admin | — |
| `moderation_reports` | Moderator | Any authenticated | Moderator | — |
| `admin_logs` | Admin | Admin | — | — |
| `activity_logs` | Admin | Any authenticated | — | — |
| `platform_settings` | All | Admin | Admin | Admin |
| `orders` | Buyer/vendor | Buyer | Buyer/vendor | Admin |
| `conversations` | Participant | Creator | — | — |
| `messages` | Participant | Participant | Sender | Sender/admin |
| `password_reset_attempts` | ❌ None | ❌ None | ❌ None | ❌ None (service-role only) |
| `account_recovery_requests` | ❌ None | ❌ None | ❌ None | ❌ None (service-role only) |

### Storage Policies (per bucket)

32 total storage policies (4 per bucket × 8 buckets), all prefixed `lzs_*`:

| Bucket | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `property-images` | Public | Owner | Owner or admin | Owner or admin |
| `property-videos` | Public | Owner | Owner or admin | Owner or admin |
| `user-avatars` | Public | Owner | Owner | Owner or admin |
| `verification-documents` | Owner or moderator | Owner | Owner | Owner or admin |
| `marketplace-products` | Public | Owner + vendor_profiles row | Owner + vendor or admin | Owner or admin |
| `service-portfolios` | Public | Owner + professional_profiles row | Owner + professional or admin | Owner or admin |
| `forum-images` | Public | Owner | Owner or moderator | Owner or moderator |
| `chat-attachments` | Participant or admin | Participant (sender sub-folder) | Sender | Sender or admin |

---

## 9. Summary Counts & Gaps

### Counts

| Object Type | Count |
|------------|-------|
| **Tables** | **72** |
| **Enum types** | **28** |
| **Storage buckets** | **8** |
| **Active Views** | **0** (storage_bucket_summary dropped) |
| **Database functions** | **15** |
| **RPC functions** | **6** (callable via `supabase.rpc()`) |
| **Triggers** | **6** named triggers (+ per-table updated_at triggers via `attach_updated_at`) |
| **RLS policies** (app tables) | **~130** across all migrations |
| **Storage RLS policies** | **32** (4 per bucket × 8 buckets) |
| **Seed data rows** | **19** platform_settings + 5+10+12+8+6 category rows = **60** |

### Implementation Status

| Status | Tables |
|--------|--------|
| ✅ Implemented | `profiles`, `kyc_records`, `agent_profiles`, `professional_profiles`, `vendor_profiles`, `admin_logs`, `account_notices`, `account_appeals`, `password_reset_attempts`, `account_recovery_requests`, `property_categories`, `properties`, `wallets`, `wallet_transactions`, `payouts`, `platform_settings` — **16 tables** |
| 🚧 Partial | `agencies`, `property_verifications`, `property_images`, `orders`, `service_bookings`, `notifications`, `reviews`, `transactions`, `escrow_accounts`, `commission_records`, `moderation_reports`, `activity_logs` — **12 tables** |
| 📋 Planned | All remaining 44 tables (email_verifications, phone_verifications, user_permissions, user_sessions, property_videos, property_amenities, property_views, property_favorites, saved_searches, property_inquiries, product_categories, products, product_images, product_variants, inventory_logs, cart_items, order_items, portfolio_items, portfolio_images, service_categories, service_listings, service_requests, service_quotations, service_contracts, rental_categories, rental_listings, rental_bookings, forum_categories, forum_posts, forum_comments, forum_reactions, conversations, conversation_participants, messages, message_attachments, notification_preferences, review_responses, escrow_milestones, escrow_events, jobs, job_applications, tenders, tender_bids, announcements) |

### Realtime Subscriptions (9 tables)

`profiles`, `properties`, `notifications`, `messages`, `conversations`, `conversation_participants`, `orders`, `service_bookings`, `property_verifications`

### Inconsistencies Discovered

**I1 — `adminApproveProfessional` missing `seller`/`vendor` branches**
The server action handles `agent`, `contractor`, `engineer`, `architect`, `lawyer` but NOT `seller` (no `seller_profiles` table exists) or `vendor` (has `vendor_profiles`). Approving a vendor sets `profiles.is_verified = true` but leaves `vendor_profiles.is_verified = false`.
*File:* `src/lib/actions/auth.ts:840–853`. Status: **Not fixed.**

**I2 — `kyc_level` enum unused**
`public.kyc_level` enum (`none`, `basic`, `standard`, `enhanced`) is defined in migration 0002 but `kyc_records.level` is `INT` and `profiles.kyc_level` is `INT`. The enum is defined but no column uses it.

**I3 — `currency_code` enum unused**
`public.currency_code` (`XAF`, `USD`, `EUR`, `GBP`) is defined but `wallets.currency`, `transactions.currency`, and `payouts.currency` are all typed as `TEXT`, not this enum.

**I4 — `payout_status` enum exists but `payouts.status` uses `payment_status`**
The `payouts.status` column uses the shared `payment_status` enum. The dedicated `payout_status` enum defined in migration 0002 is unreferenced.

**I5 — `vendor_profiles` column divergence**
Migration 0007 defines `business_name`, `store_description`, `store_logo`. The `completeVendorProfile` action writes `store_name` and `store_slug`. These columns are not visible in the migration files read — they likely exist in a remote-only migration or the column names in migration 0007 differ from what was actually applied.

**I6 — `professional_profiles` column divergence**
Migration 0008 defines `years_experience`, `hourly_rate`, `availability`. The `completeProfessionalProfile` action writes `profession_type`, `company_name`, `day_rate`, `service_areas`, `is_available`, `experience_years`. Several of these do not appear in migration 0008 — likely added in remote-only migrations.

**I7 — `tender-documents` bucket not in canonical migration 0019**
Migration 0017 (stale) created a `tender-documents` bucket. Migration 0019 (canonical) does NOT include it. The `tenders.documents TEXT[]` column stores storage paths — the target bucket may not exist in environments that only applied 0019. Verify via Supabase Studio.

**I8 — `admin_logs.metadata` vs `new_data` key**
Migration 0015 defines the column as `metadata JSONB`. The `adminSuspendAccount` action inserts `{ new_data: { reason } }` as the key — not `metadata`. The insert succeeds (JSONB is flexible) but the key name is inconsistent with the column name.

**I9 — `on_auth_user_created` trigger was missing in production**
This trigger was commented out in the base migration 0004 and only activated in `20260613000001_p1_fixes.sql`. Any environment (test, staging) that applied 0004 but not p1_fixes will have broken user registration — signups create `auth.users` rows but no `profiles` rows.

**I10 — Migration 0016 base RLS file rolled back**
`20260610000016_rls_policies.sql` attempted to create `profiles_update_own` but that policy already existed (no `DROP IF EXISTS` guard). The entire file rolled back. All policies that should have been in 0016 were applied by separate fix migrations instead. This means the local migration file does not match what actually runs in the DB after all fix migrations are applied.

### Missing Database Objects

| Object | Status |
|--------|--------|
| `accounts` table for multi-agency support | Not planned |
| `seller_profiles` table (profiles for role=seller) | Not in schema — sellers use `profiles` + `properties` directly |
| `wallet_topup` / `payment_initiation` table | Not in schema — payment gateway flow not yet built |
| Dedicated `audit_log` for KYC status history | Not in schema — planned in design doc but not yet migrated |
| `admin_impersonation_logs` table | In plan doc but not yet migrated |
| `verification_audit_logs` table | In plan doc but not yet migrated |
| `needs_more_info` value in `verification_status` enum | In plan doc but not yet migrated |
| `profiles.verified_at TIMESTAMPTZ` column | In plan doc but not yet migrated |
