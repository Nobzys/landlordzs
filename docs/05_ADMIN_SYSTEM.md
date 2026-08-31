# LANDLORDZS — Administration System Reference

Version: 1.0  
Source of truth: `src/app/(dashboard)/admin/`, `src/lib/actions/`, `supabase/migrations/`, `docs/02_DATABASE_SCHEMA.md`, `docs/04_WORKFLOWS.md`  
Last updated: 2026-07-13

---

## Status Key

- ✅ **Implemented** — page exists, actions wired, DB queries functional
- 🚧 **Partially Implemented** — page exists but some capabilities missing or logic incomplete
- 📋 **Planned** — schema and spec reference exist; no page or server actions yet

---

## Table of Contents

1. [Admin Dashboard](#1-admin-dashboard-)
2. [Super Admin Dashboard](#2-super-admin-dashboard-)
3. [User Management](#3-user-management-)
4. [View User Profile](#4-view-user-profile-)
5. [View As User (Impersonation)](#5-view-as-user-impersonation-)
6. [User Verification / KYC Review](#6-user-verification--kyc-review-)
7. [Property Moderation](#7-property-moderation-)
8. [Marketplace Moderation](#8-marketplace-moderation-)
9. [Service Moderation](#9-service-moderation-)
10. [Reports & Abuse](#10-reports--abuse-)
11. [Reviews Moderation](#11-reviews-moderation-)
12. [Suspension](#12-suspension-)
13. [Reactivation](#13-reactivation-)
14. [Ban](#14-ban-)
15. [Appeals](#15-appeals-)
16. [Audit Logs](#16-audit-logs-)
17. [Activity Logs](#17-activity-logs-)
18. [Notifications](#18-notifications-)
19. [Analytics & Platform Metrics](#19-analytics--platform-metrics-)
20. [Payments Oversight](#20-payments-oversight-)
21. [Wallet Oversight](#21-wallet-oversight-)
22. [Escrow Oversight](#22-escrow-oversight-)
23. [Admin Roles & Permissions Matrix](#23-admin-roles--permissions-matrix-)
24. [Missing Admin Features](#24-missing-admin-features)
25. [Broken Admin Features](#25-broken-admin-features)
26. [Security Concerns](#26-security-concerns)
27. [Recommended Implementation Order](#27-recommended-implementation-order)

---

## 1. Admin Dashboard ✅

**Page:** `/admin`  
**File:** [src/app/(dashboard)/admin/page.tsx](src/app/(dashboard)/admin/page.tsx)

### Purpose

Unified platform overview. Surfaces all actionable items requiring admin attention — pending verifications, disputed escrows, pending payouts, and unreviewed reports — with a live activity feed and user breakdown by role.

### Business rules

- Dashboard is the first page after admin login
- Shows aggregate counts across all platform entities
- "Needs Attention" banner appears when any actionable queue > 0
- Quick action buttons provide one-click navigation to each operational queue
- Recent activity feed shows the last 15 events (configurable via `p_limit`)
- Recent users list shows the last 8 registered profiles

### Database tables

| Table | Operation | Notes |
|-------|-----------|-------|
| `profiles` | SELECT (recent 8, ordered by `created_at` DESC) | User-scoped client — RLS allows admin to read all via `profiles_admin_all` |
| `property_verifications` | COUNT via RPC | Inside `get_admin_metrics()` |
| `payouts` | COUNT via RPC | status IN ('pending', 'processing') |
| `escrow_accounts` | COUNT via RPC | status = 'disputed' |
| `moderation_reports` | COUNT via RPC | status = 'pending' |
| `commission_records` | COUNT via RPC | status = 'pending' |
| `properties` | COUNT by status via RPC | |
| `admin_logs` | SELECT via `get_admin_activity()` RPC | activity feed — suspensions |

### Server actions / DB functions

- `get_admin_metrics()` — SECURITY DEFINER RPC; checks `is_admin()`; returns JSONB with 12 metric fields
- `get_admin_activity(p_limit)` — SECURITY DEFINER RPC; checks `is_admin()`; UNION of 5 activity streams (new registrations, property submitted/approved/rejected, account suspended); returns up to 20 rows ordered by `occurred_at DESC`

### UI behaviour

- 4 primary stat cards: Total Users, Total Properties, Pending Verifications (amber if > 0), Pending Payouts (amber if > 0)
- 4 secondary stat cards: Disputed Escrows (red if > 0), Pending Reports (amber if > 0), Pending Commissions, New Users Today
- Users by role: grid showing count per role (9 roles × `m.users_by_role`)
- Verification overview: pending / approved-today / rejected-today / total-verified breakdown
- Properties by status: color-coded badges for all 9 status values
- Activity feed: icon-coded rows with actor name + relative timestamp (5 event types)
- Recent users: avatar + name + email + role badge + status badge + relative timestamp + link to `/admin/users/[id]`
- Quick actions: 7 shortcut buttons with notification dots for active queues

### Permission requirements

- Middleware: `/admin` prefix → requires `profiles.role = 'admin'`
- Page guard: `profile.role !== 'admin'` → `redirect('/login')`
- `get_admin_metrics` RPC: `is_admin()` check inside SECURITY DEFINER function — non-admins get `permission denied` exception

### Security requirements

- Triple-layer: middleware + page guard + DB function check
- All RPC calls use user-scoped client (RLS applies to base tables); RPC itself is SECURITY DEFINER but re-checks caller role via `is_admin()`
- No sensitive financial data exposed (amounts not shown on dashboard)

### Audit logging

- Admin page load: not logged (read-only)
- Activity feed items sourced from `admin_logs`, `property_verifications`, `profiles` — no new writes on view

### Failure handling

| Failure | Behaviour |
|---------|-----------|
| `get_admin_metrics` returns null | Defaults to zero-value `AdminMetrics` object; page renders without errors |
| `get_admin_activity` returns null | Activity section hidden (conditional render) |
| Recent users query fails | `recentUsers` is null; section renders "No users yet" |

### Future improvements

- Revenue KPIs (total GMV, platform fee collected, average property price)
- Real-time updates via Supabase Realtime channel on `admin_metrics`
- Time-range selector (today / week / month)
- Admin-to-admin notification system
- Export dashboard snapshot as PDF

---

## 2. Super Admin Dashboard 📋

**Page:** Not yet built  
**Planned path:** `/admin/super` or elevated section on `/admin`

### Purpose

A higher-privilege overlay providing capabilities unavailable to regular admins: promote/demote admin accounts, manage DB migrations (dangerous actions), access all raw logs, change platform encryption keys, override RLS for emergency data access.

### Business rules

- Requires `profiles.role = 'super_admin'` (does not currently exist as an enum value)
- Regular admins cannot access this section
- All super-admin actions require 2FA confirmation
- Every action creates an immutable audit entry

### Current status

`super_admin` is documented in the project constitution (Chapter 4) but:
- Not in `user_role` DB enum (only `admin` exists)
- Not in TypeScript `UserRole` type
- No middleware prefix protection defined
- No pages exist

### Future improvements

- Add `super_admin` to `user_role` DB enum via migration
- Protect `/admin/super/*` prefix via middleware
- Add 2FA requirement for super admin actions
- Transfer ownership workflow (super admin succession)

---

## 3. User Management ✅

**Page:** `/admin/users`  
**File:** [src/app/(dashboard)/admin/users/page.tsx](src/app/(dashboard)/admin/users/page.tsx)

### Purpose

Paginated list of all platform users with filter-by-role, filter-by-status, inline role assignment, inline suspend/activate, and navigation to individual user detail pages.

### Business rules

- Shows 25 users per page (constant `PAGE_SIZE = 25`)
- Ordered by `created_at DESC` (newest first)
- Role filter: All Roles + 9 individual roles (buyer/seller/agent/vendor/contractor/engineer/architect/lawyer/admin)
- Status filter: All Statuses + active / suspended / banned / pending_verification
- Admin cannot suspend themselves (UI guard: `u.id !== profile.id`)
- Role assignment: admin cannot assign a role to themselves (same UI guard)
- Clicking user name / identity row navigates to `/admin/users/[id]`

### Database tables

| Table | Operation | Client |
|-------|-----------|--------|
| `profiles` | SELECT with `count: 'exact'`, paginated, filtered | User-scoped (`createClient()`) |

### Server actions

| Action | Function | File |
|--------|----------|------|
| Assign role | `adminAssignRole(userId, newRole)` | `src/lib/actions/auth.ts:658` |
| Suspend account | `adminSuspendAccount(userId, 'Admin action')` | `src/lib/actions/auth.ts:693` |
| Activate account | `adminActivateAccount(userId)` | `src/lib/actions/auth.ts:746` |

### UI behaviour

- Role filter tabs (horizontal scroll on mobile): clicking navigates to `?role=<r>&page=1`
- Status filter tabs (secondary row)
- User row: avatar initial + full name (✓ if `is_verified`) + email + role badge + status badge + joined-at
- Role dropdown: native `<select>` with all 9 roles; form submit calls `adminAssignRole`
- Suspend button: inline server action → `adminSuspendAccount(u.id, 'Admin action')` — hardcoded reason "Admin action"
- Activate button: shown only when `account_status === 'suspended'`
- Pagination: Previous / Next page buttons; URL-based
- Identity block is a `<Link>` to `/admin/users/${u.id}`

### Permission requirements

- Middleware + page guard (role = 'admin')
- `adminAssignRole`, `adminSuspendAccount`, `adminActivateAccount`: each re-checks caller role

### Security requirements

- Cannot suspend self: checked in UI only (not enforced in `adminSuspendAccount` server action — gap)
- `adminAssignRole` uses `createAdminClient()` (service-role) for the UPDATE — bypasses RLS
- `adminSuspendAccount` uses `createAdminClient()` for the UPDATE, user-scoped for `admin_logs` INSERT

### Audit logging

- Suspend: writes to `admin_logs` (action='suspend_account', target_id, new_data: { reason })
- Suspend: writes to `account_notices` (type='suspension', user_id, reason, created_by)
- Activate: NO audit log written (gap — only `revalidatePath`)
- Assign role: NO audit log written (gap)

### Failure handling

| Failure | Behaviour |
|---------|-----------|
| Action server errors | Next.js throws uncaught exception (no try/catch in inline server actions) |
| DB UPDATE error | `adminSuspendAccount` returns `{ error: error.message }` but inline action doesn't show it to user |

### Future improvements

- Text search by name / email
- Filter by `is_verified`
- Bulk actions (select multiple → bulk suspend / assign role)
- Column sorting (by name, email, joined date)
- Export user list as CSV
- Suspension reason dialog (currently hardcoded as "Admin action")
- `adminActivateAccount` and `adminAssignRole` should write `admin_logs` entries

---

## 4. View User Profile ✅

**Page:** `/admin/users/[id]`  
**File:** [src/app/(dashboard)/admin/users/[id]/page.tsx](src/app/(dashboard)/admin/users/[id]/page.tsx)

### Purpose

Full user detail page for admin review. Shows profile fields, KYC documents (with signed URLs), role-specific profile data (agent / vendor / professional), admin action history, and user activity log.

### Business rules

- Uses `notFound()` if user profile doesn't exist
- Shows KYC documents only if `kyc_records` row exists
- Only shows most recent KYC submission (`kycRecords?.[0]`)
- Signed URLs expire in 3600 seconds (1 hour)
- Shows `is_verified` checkmark and `is_premium` badge if applicable
- Shows up to 10 admin action history entries, 10 activity log entries

### Database tables

| Table | Operation | Notes |
|-------|-----------|-------|
| `profiles` | SELECT (target user) | via `createAdminClient()` |
| `kyc_records` | SELECT (all, ordered by `created_at DESC`) | via `createAdminClient()` |
| `agent_profiles` | SELECT (if role='agent') | via `createAdminClient()` |
| `vendor_profiles` | SELECT (if role='vendor') | via `createAdminClient()` |
| `professional_profiles` | SELECT (if role in contractor/engineer/architect/lawyer) | via `createAdminClient()` |
| `activity_logs` | SELECT (recent 10, own user) | via `createAdminClient()` |
| `admin_logs` | SELECT (recent 10, target_id = userId) | via `createAdminClient()` |

### Server actions

None — this is a read-only view page. Actions (suspend/activate) are on `/admin/users` list page.

### Storage

- `verification-documents` bucket: `createAdminClient().storage.from(STORAGE_BUCKETS.VERIFY_DOCS).createSignedUrl(path, 3600)`
- Documents: national_id_front, national_id_back, selfie_url, proof_of_address, business_reg

### UI behaviour

**Profile card:**
- 64×64 avatar (image if `avatar_url` set; else initials)
- Name + `ShieldCheck` icon (if verified) + "Premium" badge (if premium)
- Role badge + account status badge
- Contact grid: email, phone (✓ if verified), city, joined date, onboarding status, last updated
- Bio section (if present)

**KYC / Verification section:**
- Status badge: pending (blue) / approved (emerald) / rejected (red)
- Submitted / reviewed timestamps
- Admin review notes block
- Document links: each opens in new tab (target="_blank") as signed URL
- Document types: ID Front, ID Back, Selfie, Proof of Address, Business Reg

**Role-specific profile:**
- Agent: license number, license verified, experience, commission rate, listings, sales, rating
- Vendor: store name, slug, city, verified, products, orders, commission rate
- Professional: profession type, company, license, verified, experience, availability, projects, rating

**Admin action history (last 10):**
- Each row: `action` in monospace chip + relative timestamp
- Source: `admin_logs WHERE target_id = userId`

**Recent activity (last 10):**
- Each row: `action` chip + entity_type + relative timestamp
- Source: `activity_logs WHERE user_id = userId`

### Permission requirements

- Middleware + page guard (role = 'admin')
- All queries use `createAdminClient()` — no user-scoped queries

### Security requirements

- Signed URLs are 1-hour temporary links; opening them leaks the URL in browser history
- No direct download links — user must open signed URL in browser
- Page does not expose `auth.users` raw data (password hashes, MFA secrets)

### Failure handling

| Failure | Behaviour |
|---------|-----------|
| User not found | `notFound()` → 404 page |
| Signed URL generation fails | `getSignedUrl()` catches exception, returns `null`; document link hidden |
| Role-profile query fails | `agentProfile` etc. remains `null`; section not rendered |

### Future improvements

- Suspend / activate / ban buttons directly on this page (currently only on list)
- Change role dropdown on this page
- Manual verification button (bypass KYC, set `profiles.is_verified = true`)
- Password reset link generator
- "View as user" / Preview link
- Linked records: list of user's properties, orders, escrows, commissions
- Export user profile as PDF

---

## 5. View As User (Impersonation) 📋

**Page:** Not yet built  
**Planned path:** `/admin/users/[id]/preview`

### Purpose

Read-only reconstruction of what a specific user would see on their dashboard, without swapping authentication sessions. Intended for debugging and support escalation.

### Business rules

- Admin must see banner: **"You are viewing this account as an administrator."**
- No forms, buttons, or server actions are callable from the preview
- Admin's own session cookie is NEVER replaced — no auth-token swap
- Every preview session logged to `admin_impersonation_logs` (planned table)
- Preview starts on load (INSERT `admin_impersonation_logs.started_at`)
- Preview ends when admin clicks "Exit Preview" (UPDATE `ended_at`)
- IP address recorded for audit

### Planned tables

```sql
admin_impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id),
  target_user_id uuid REFERENCES profiles(id),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  ip_address text
)
```

### Security requirements

- Target user cannot read their own `admin_impersonation_logs` rows (no user-facing RLS policy)
- Admin-only (`is_admin()`) RLS on `admin_impersonation_logs`
- No session cookie swap — preview is rendered from admin's own auth context using target user's data ID
- No action endpoints exposed in preview — all forms are static HTML without `action` attributes

### Future improvements

- Log specific tabs/sections the admin viewed
- Configurable session timeout (auto-exit after 15 min)
- Audit log export

---

## 6. User Verification / KYC Review ✅

**Page:** `/admin/professionals`  
**File:** [src/app/(dashboard)/admin/professionals/page.tsx](src/app/(dashboard)/admin/professionals/page.tsx)

### Purpose

KYC review queue for all approval-required roles (seller/vendor/agent/contractor/engineer/architect/lawyer). Three tabs: Pending Verification → Approved → Suspended. Inline approve/reject actions with document viewer.

### Business rules

- Only shows users with `onboarding_completed = true` (filters out mid-onboarding)
- Lists only roles in `['seller', 'vendor', 'agent', 'contractor', 'engineer', 'architect', 'lawyer']`
- Pending tab ordered by `created_at ASC` (oldest first — FIFO review order)
- Active tab shows approved professionals
- Suspended tab shows suspended accounts with reactivate and ban options
- Documents only rendered on Pending tab (cost-effective: no signed URLs for non-pending)
- Pending count badge shown on tab
- Admin can also access these actions from `/admin/users`

### Database tables

| Table | Operation | Client |
|-------|-----------|--------|
| `profiles` | SELECT with joins, filtered by role+status | `createAdminClient()` |
| `kyc_records` | SELECT (embedded join, latest sorted by `submitted_at DESC`) | `createAdminClient()` |
| `professional_profiles` | SELECT (embedded join) | `createAdminClient()` |
| `agent_profiles` | SELECT (embedded join) | `createAdminClient()` |

### Storage

- Bucket: `STORAGE_BUCKETS.VERIFY_DOCS` (`verification-documents`)
- Signed URLs generated for each pending user's: `national_id_front`, `national_id_back`, `business_reg` (3600s TTL)

### Server actions

| Action | Function | Effect |
|--------|----------|--------|
| Approve | `adminApproveProfessional(userId)` | `profiles.account_status='active'`, `is_verified=true`; role-profile `license_verified/is_verified`; `kyc_records.status='approved'` |
| Reject | `adminRejectProfessional(userId, reason)` | `kyc_records.status='rejected'`; INSERT `account_notices` (type='rejection'); `account_status` stays `pending_verification` |
| Suspend (active tab) | Inline server action | `profiles.account_status='suspended'`; `revalidatePath('/admin/professionals')` only — no `adminSuspendAccount` used |
| Reactivate (suspended tab) | Inline server action | `profiles.account_status='active'`; `revalidatePath` |
| Ban (suspended tab) | Inline server action | `profiles.account_status='banned'`; `revalidatePath` |

### UI behaviour

- Each card shows: display name, role badge, account status badge, email, company name (if set), joined date, KYC status badge, submission date
- Document links (pending only): ID Front, ID Back, Certificate — open in new tab
- Previous review notes shown if `kyc.review_notes` set
- Pending actions: Approve (green) + Reject with reason input (red)
- Active actions: Suspend with reason input
- Suspended actions: Reactivate (green) + Ban (red)

### Permission requirements

- Middleware + page guard (role = 'admin')
- `adminApproveProfessional` / `adminRejectProfessional` re-check caller role
- Inline server actions (suspend/reactivate/ban) use `createAdminClient()` directly — no action-level role check (relies on page guard only)

### Security requirements

- Signed URL generation via `createAdminClient().storage` — only admin can generate these
- Bucket `verification-documents` storage RLS: `lzs_verifydoc_admin_select` — `is_admin() OR is_moderator()`
- `kyc_mod_all` RLS policy on `kyc_records` grants admins/moderators full access

### Audit logging

- `adminApproveProfessional`: writes to `kyc_records.reviewed_by = adminId` and `reviewed_at` — implicit audit trail in the record
- `adminRejectProfessional`: same for `kyc_records`; also writes `account_notices`
- Suspend/Reactivate/Ban from inline actions: NO `admin_logs` entry written (gap)
- `adminSuspendAccount` (called from user list) DOES write `admin_logs`, but the professionals-page suspend is a separate inline action that does NOT

### Failure handling

| Failure | Behaviour |
|---------|-----------|
| No KYC record on file | Shows "No documents" indicator; approve still possible |
| Signed URL fails (wrong bucket name) | `toUrl()` returns null; link hidden |
| `adminApproveProfessional` for vendor | Succeeds but `vendor_profiles.is_verified` is NOT set (known gap B1 from `docs/04_WORKFLOWS.md`) |
| Both approve and reject submitted simultaneously | Last write wins; no optimistic locking |

### Future improvements

- "Request more info" action (needs `needs_more_info` KYC status)
- Verification detail page (`/admin/verifications/[id]`) with inline document viewer modal
- Verification audit log trail per user
- Add `admin_logs` entry on suspend/reactivate/ban from this page
- Notify user via `notifications` table on approve/reject
- Fix: call `adminSuspendAccount` for the suspend action (instead of raw inline update) so audit logging is consistent

---

## 7. Property Moderation ✅

**Pages:** `/admin/properties` (queue), `/admin/properties/[id]` (detail + agent assign)  
**Files:** [src/app/(dashboard)/admin/properties/page.tsx](src/app/(dashboard)/admin/properties/page.tsx), [src/app/(dashboard)/admin/properties/[id]/page.tsx](src/app/(dashboard)/admin/properties/[id]/page.tsx)

### Purpose

Review pending property verification requests. Approve to mark property as verified and active. Reject to remove from listing (with optional reason). Admin can also assign a commissioned agent to any property.

### Business rules

- Queue shows all `property_verifications.status = 'pending'` ordered `created_at ASC` (FIFO)
- Maximum 100 items per page (no pagination — limit of 100)
- On approve: `property_verifications.status = 'approved'` + `properties.is_verified = true` + `properties.status = 'active'`
- On reject: `property_verifications.status = 'rejected'` + `properties.status = 'rejected'`
- Reject reason is optional — defaults to empty notes
- Agent assignment: any active agent can be assigned; existing assignment is replaced; NULL removes agent

### Database tables

| Table | Operation | Notes |
|-------|-----------|-------|
| `property_verifications` | SELECT (status='pending'), UPDATE (status, verified_by, verified_at) | via `createClient()` (user-scoped; admin reads via `prop_verif_admin_all` RLS) |
| `properties` | SELECT (via join), UPDATE (is_verified, status) | via `createClient()` |
| `profiles` | SELECT (owner join, agent dropdown) | via `createClient()` |
| `admin_logs` | INSERT (agent assignment only) | via `createClient()` |

### Server actions

| Action | Function | File |
|--------|----------|------|
| Approve verification | `reviewVerification(verificationId, 'approved')` | `src/lib/actions/properties.ts` |
| Reject verification | `reviewVerification(verificationId, 'rejected', notes)` | `src/lib/actions/properties.ts` |
| Assign agent | `adminAssignAgent(propertyId, agentId)` | `src/lib/actions/properties.ts` |

### UI behaviour

**Queue page (`/admin/properties`):**
- Card per pending verification: property title, listing type badge (sale/rent/shortlet), city · type, price in XAF, seller name + email, submission time
- "View" link → `/admin/properties/[property.id]` (new tab)
- Approve button (green) + Reject form with notes input

**Detail page (`/admin/properties/[id]`):**
- Admin preview banner with status badge
- Agent assignment panel: current agent name, dropdown of all active agents, Save button
- Full property display: gallery (via `PropertyGallery`), details (via `PropertyDetails`), amenities (via `PropertyAmenities`)

### Permission requirements

- Page guard: `profile.role !== 'admin'` → redirect
- `reviewVerification`: action-level admin check
- `adminAssignAgent`: action-level admin check

### Security requirements

- `reviewVerification` calls `createAdminClient()` for the UPDATE — bypasses user RLS
- Agent assignment logged to `admin_logs`

### Audit logging

- Approve/reject: `property_verifications.verified_by` and `verified_at` set — implicit audit in record
- Agent assign: `admin_logs` INSERT (action='assign_agent')
- No `admin_logs` entry for approve/reject directly (gap)

### Failure handling

| Failure | Behaviour |
|---------|-----------|
| Property not found on detail page | `notFound()` |
| `reviewVerification` called on already-approved | Will re-approve (no guard against re-approval) |

### Future improvements

- Reject reason shown to seller via `account_notices` (currently not created on property rejection)
- Full property history / version audit
- Admin notes on property (separate from verification notes)
- Bulk approve/reject
- Pagination for queue > 100

---

## 8. Marketplace Moderation 📋

**Page:** Not yet built  
**Planned path:** `/admin/marketplace`

### Purpose

Review and moderate marketplace product listings from vendors. Remove inappropriate products, verify product claims, manage categories.

### Schema ready

Tables: `products`, `product_images`, `moderation_reports` (with `target_type = 'product'`)

### What's needed

- Product list view with filters (vendor, status, category)
- Product detail view with images
- Remove product action (UPDATE `products.status = 'removed'`)
- Feature product action (UPDATE `products.is_featured = true`)
- Link report → product (navigate from report to product detail)

---

## 9. Service Moderation 📋

**Page:** Not yet built  
**Planned path:** `/admin/services`

### Purpose

Review professional service listings. Validate service descriptions against license types, flag misleading claims, deactivate services from suspended professionals.

### Schema ready

Tables: `service_listings`, `service_categories`, `professional_profiles`

### What's needed

- Service listing browse with role filter
- Service detail view
- Deactivate service action
- Flag for review action

---

## 10. Reports & Abuse ✅

**Page:** `/admin/reports`  
**File:** [src/app/(dashboard)/admin/reports/page.tsx](src/app/(dashboard)/admin/reports/page.tsx)

### Purpose

Review user-submitted abuse reports across all content types. Progress reports through the workflow: pending → reviewing → resolved / dismissed. Record resolution note and action taken.

### Business rules

- Report types: fake_listing, fraud, inappropriate_content, harassment, fake_professional, scam, duplicate, other
- Target types stored as free-text `target_type` string (not validated by enum)
- Workflow: pending → reviewing → resolved OR dismissed
- Pending tab ordered ASC (oldest first)
- Admin clicks "Mark Reviewing" to claim the report
- Admin records resolution note + action taken → "Resolve"
- Admin can "Dismiss" without resolution note (defaults to current timestamp)
- Evidence URLs shown as numbered links (open in new tab)
- Resolution note defaults to 'Content reviewed' if empty

### Database tables

| Table | Operation | Notes |
|-------|-----------|-------|
| `moderation_reports` | SELECT (filtered by status), UPDATE (status, resolution, action_taken, reviewed_at) | via `createAdminClient()` |
| `profiles` | SELECT (reporter join) | embedded in query |

### Server actions

All inline server actions in the page file (no shared action file):
- **Mark Reviewing:** UPDATE `moderation_reports.status = 'reviewing'`
- **Resolve:** UPDATE `moderation_reports.status = 'resolved'`, `resolution`, `action_taken`, `reviewed_at`
- **Dismiss:** UPDATE `moderation_reports.status = 'dismissed'`

### UI behaviour

- Status tabs: pending (with red count badge) / reviewing / resolved / dismissed
- Report card: status badge + report type badge + target type label + reason text + reporter name + timestamp + evidence links
- Pending/reviewing: action buttons (Mark Reviewing, Resolve form, Dismiss)
- Resolved/dismissed: resolution and action_taken shown if set

### Permission requirements

- Middleware + page guard (role = 'admin')
- All inline server actions use `createAdminClient()` directly — no action-level role check (relies on page guard)

### Security requirements

- Evidence URLs may point to arbitrary external URLs — opened in new tab with `rel="noopener noreferrer"`
- No content inline-rendered (no `<img>` or `<iframe>` for evidence)

### Audit logging

- Status transitions are recorded in the `moderation_reports` row (`reviewed_at`, `action_taken`) — no separate `admin_logs` entry
- Gap: no `admin_logs` entry for moderation report resolutions

### Failure handling

| Failure | Behaviour |
|---------|-----------|
| DB UPDATE fails | Next.js throws uncaught exception from inline server action |
| Reporter profile not found | `reporter` is null; shows "Unknown" |

### Future improvements

- Navigate to reported content (link from `target_id` + `target_type` to the actual property/user/product)
- Take action directly from report (suspend user, remove listing without navigating away)
- Auto-suspend after N reports on same target
- Assign report to specific admin (multi-admin teams)
- Write `admin_logs` entry on report resolution

---

## 11. Reviews Moderation 📋

**Page:** Not yet built  
**Planned path:** `/admin/reviews`

### Purpose

Review flagged reviews, remove defamatory or fraudulent content, manage review responses.

### Schema ready

Tables: `reviews`, `review_responses`, `moderation_reports` (with `target_type = 'review'`)

### What's needed

- Review list with filter by target role / rating / status
- Remove review action (soft delete or `status = 'removed'`)
- View linked report (navigate from flagged review report)
- Review response moderation

---

## 12. Suspension ✅

**Trigger surface:** `/admin/users` list, `/admin/professionals` active tab  
**Server action:** `adminSuspendAccount(targetUserId, reason)` (`src/lib/actions/auth.ts:693`)

### Purpose

Immediately revoke a user's access to the platform. Session is invalidated on their next request via middleware. User-visible suspension reason stored in `account_notices`.

### Business rules

- Sets `profiles.account_status = 'suspended'`
- Writes `account_notices` (type='suspension') with reason and `created_by`
- Middleware detects `account_status === 'suspended'` → `signOut()` → redirect `/login?error=account_suspended`
- `signIn()` also checks status → blocks re-login
- Caller cannot suspend themselves (UI guard on user list; not enforced at action level)
- Reason is required by function signature but defaults to `'Account suspended by admin.'` on professionals page

### Database tables

| Table | Operation |
|-------|-----------|
| `profiles` | UPDATE `account_status = 'suspended'` via `adminClient` |
| `admin_logs` | INSERT (action='suspend_account', target_id, new_data: { reason }) via user-scoped client |
| `account_notices` | INSERT (type='suspension') via `adminClient` |

### Permission requirements

- Caller `profiles.role = 'admin'` checked in `adminSuspendAccount`
- `adminClient` (service-role) for `profiles` UPDATE and `account_notices` INSERT

### Security requirements

- Session invalidation is passive (happens on next request, not immediately) — there can be a window of up to the session cache TTL (~60s) where a suspended user still has a valid session
- `admin_logs` written before `account_notices` — if `account_notices` INSERT fails, action is still logged

### Audit logging

- `admin_logs`: actor_id, action='suspend_account', target_type='profile', target_id, new_data: { reason }
- ⚠️ Column name mismatch: code inserts key `new_data` but migration 20260610000015 defines column as `metadata` (bug B8 from `docs/04_WORKFLOWS.md`)

### Failure handling

| Failure | Behaviour |
|---------|-----------|
| Target user not found | `profiles` UPDATE affects 0 rows; no error returned; action succeeds silently |
| Admin logs INSERT fails | Action does not roll back; user is suspended but log missing |

### Future improvements

- Self-suspension guard at action level (not just UI)
- Suspend with duration (auto-reactivate via cron)
- Send email notification to suspended user
- Fix `new_data` vs `metadata` column name inconsistency

---

## 13. Reactivation ✅

**Trigger surface:** `/admin/users` list (Activate button), `/admin/professionals` suspended tab  
**Server action:** `adminActivateAccount(targetUserId)` (`src/lib/actions/auth.ts:746`)

### Purpose

Restore a suspended user's access to the platform.

### Business rules

- Sets `profiles.account_status = 'active'`
- Does NOT reset `is_verified` or any other flags
- Activate button on user list appears only when `account_status === 'suspended'`
- Banned users (status='banned') cannot be reactivated via `adminActivateAccount` — no guard exists; the button is simply not shown for banned users on the users list

### Database tables

| Table | Operation |
|-------|-----------|
| `profiles` | UPDATE `account_status = 'active'` via `adminClient` |

### Server actions

- `adminActivateAccount(userId)` — UPDATE profiles via adminClient; revalidatePath('/admin/users')

### Audit logging

- **No `admin_logs` entry written** — gap. Activate action is entirely unlogged.

### Future improvements

- Write `admin_logs` on activation
- Notify user via email + in-app notification on reactivation
- Show user their appeal was successful (UPDATE `account_appeals.status = 'reviewed'`)

---

## 14. Ban ✅

**Trigger surface:** `/admin/professionals` suspended tab  
**Implementation:** Inline server action in [professionals/page.tsx:383-397](src/app/(dashboard)/admin/professionals/page.tsx#L383-L397)

### Purpose

Permanently revoke a user's access. Distinguished from suspension by `account_status = 'banned'` (not auto-reversible).

### Business rules

- Sets `profiles.account_status = 'banned'`
- Only accessible from the Suspended tab (user must be suspended first)
- No reactivation button shown for banned users anywhere in the UI (but `adminActivateAccount` would work if called directly)
- Banned users cannot log in (`signIn()` checks both 'suspended' and 'banned')

### Database tables

| Table | Operation |
|-------|-----------|
| `profiles` | UPDATE `account_status = 'banned'` via `createAdminClient()` (inline in page) |

### Audit logging

- **No `admin_logs` entry** — gap. Ban is entirely unlogged.

### Future improvements

- Move ban to a named server action (e.g., `adminBanAccount`) with proper audit logging
- `account_notices` INSERT (type='ban') for user visibility
- Email notification on permanent ban
- Unban workflow (requires super admin or manual DB update)

---

## 15. Appeals ✅

**Pages:** `/account/suspended` (submit appeal), `/account/pending` (submit correction request)  
**Server action:** `submitAppeal(message, noticeId)` (`src/lib/actions/auth.ts:941`)

### Purpose

Allow suspended or rejected users to submit an appeal or correction request that admins can review.

### Business rules

- User reads suspension/rejection reason from `account_notices` (latest, own user)
- Checks for existing pending appeal to prevent duplicate submissions
- Inserts `account_appeals` row with `status = 'pending'`, links to `notice_id`
- Page redirects to `?submitted=true` after submission; shows confirmation message
- On return visit with existing pending appeal: shows "Your appeal is under review"

### Database tables

| Table | Operation | Notes |
|-------|-----------|-------|
| `account_notices` | SELECT (own, latest) | RLS: `account_notices_user_select` — own rows |
| `account_appeals` | SELECT (existing pending), INSERT | RLS: own rows insert and select |

### Server action

- `submitAppeal(message, noticeId)` — INSERT `account_appeals`; no admin notification generated

### Admin side

- No admin UI exists for reviewing appeals — admin must query DB directly or use Supabase Studio
- `adminActivateAccount` can be called to accept an appeal
- No status update flow to mark appeals as reviewed in code

### Audit logging

- No audit log for appeal submission or resolution

### Future improvements

- Admin appeals management page (`/admin/appeals`)
- Appeal status notification to user (email + in-app)
- Automatic reactivation on appeal approval
- Appeal deadline (expire after 30 days)
- Second-level appeal to super admin

---

## 16. Audit Logs 🚧

**Page:** Not yet built  
**Data source:** `admin_logs` table, `escrow_events` table, `property_verifications` (implicit)  
**Admin user detail:** `/admin/users/[id]` shows 10 most recent entries per user

### Purpose

Immutable record of all admin actions taken on the platform. Currently partially implemented — only some actions write entries.

### Actions that currently write `admin_logs`

| Action | When written | actor_id | target_id | action value |
|--------|-------------|----------|-----------|-------------|
| `adminSuspendAccount` | On every suspension | admin | target user | `'suspend_account'` |
| `adminAssignAgent` | On agent assign | admin | property id | `'assign_agent'` |
| `adminAssignAgent` (remove) | On agent removal | admin | property id | `'remove_agent'` |

### Actions that do NOT write `admin_logs` (gaps)

| Action | Missing log |
|--------|------------|
| `adminActivateAccount` | activation not logged |
| `adminAssignRole` | role change not logged |
| `adminApproveProfessional` | approval not logged |
| `adminRejectProfessional` | rejection not logged |
| `reviewVerification` | property approval/rejection not logged |
| Professionals-page inline suspend/reactivate/ban | not logged |
| Payout rejection (inline in `/admin/payouts`) | not logged |
| Report status transitions | not logged |
| Settings changes | not logged |

### Database tables

| Table | Columns |
|-------|---------|
| `admin_logs` | id, actor_id, action, target_type, target_id, metadata (JSONB), created_at |
| `escrow_events` | id, escrow_id, event_type, actor_id, metadata, created_at |

### Known bug

`adminSuspendAccount` writes `new_data` key but the column is `metadata` (line 723 of `auth.ts`). The INSERT succeeds because JSONB accepts any key name, but queries for `admin_logs.metadata->>'reason'` will return null. The key stored is `new_data`.

### Permissions

- `admin_logs` RLS: `admin_log_admin_all` — `USING (is_admin())` — admin read/write only
- `admin_logs`: no DELETE policy — append-only by design

### Future improvements

- `/admin/audit` page with full log viewer (filter by actor, action, date range, target type)
- Emit `admin_logs` for ALL admin actions
- Fix `new_data` → `metadata` key name in `adminSuspendAccount`
- Immutable log stream (pg trigger to prevent UPDATE on `admin_logs`)

---

## 17. Activity Logs 🚧

**Page:** Not yet built (data visible in `/admin/users/[id]` per-user section)  
**Table:** `activity_logs`

### Purpose

Track user-initiated platform actions (browse, create, message, pay, etc.) for debugging and analytics.

### Current state

- `activity_logs` table exists with RLS: `activity_own_insert` — users can write own rows; `activity_mod_all` — admins/moderators can read all
- No server action in the codebase explicitly writes to `activity_logs` (all inserts would come from client-side code or triggers — none found in scan)
- `/admin/users/[id]` reads 10 most recent entries (returns empty for all users currently)

### Database tables

| Table | Columns |
|-------|---------|
| `activity_logs` | id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at |

### Future improvements

- Server-side `activity_logs` write on every significant user action (property view, search, favorite, inquiry, etc.)
- `/admin/activity` page with platform-wide activity stream
- Aggregated analytics (popular properties, search terms, conversion funnel)

---

## 18. Notifications 🚧

**Page:** Not yet built for admin  
**User page:** Not yet built

### Purpose

Admin should be able to send platform-wide or targeted notifications to users. Users should see a notification bell with unread count.

### Current state

- `notifications` table exists with 13 notification_type values
- `notification_preferences` table exists (no UI)
- Supabase Realtime subscription active on `notifications` channel
- No admin action creates notification rows
- No notification bell component in dashboard layout
- `profiles.expo_push_token` column exists (mobile push — not implemented)

### Database tables

| Table | Columns |
|-------|---------|
| `notifications` | id, user_id, type, title, body, data, is_read, created_at |
| `notification_preferences` | user_id, type, email_enabled, push_enabled, in_app_enabled |

### Missing in code

- `adminSuspendAccount` does NOT create a notification for the suspended user
- `adminApproveProfessional` does NOT create a notification for the approved user
- `adminRejectProfessional` does NOT create a notification for the rejected user
- `reviewVerification` does NOT create a notification for the property owner

### Future improvements

- Add notification creation to every admin action that affects a user
- In-app notification bell in `DashboardSidebar`
- Admin broadcast: `/admin/notifications/new` to send system-wide message
- Notification preferences UI for users
- Expo push notification delivery via `expo_push_token`

---

## 19. Analytics & Platform Metrics ✅

**Source:** `get_admin_metrics()` RPC + dashboard cards on `/admin`

### Current metrics available

| Metric | Source |
|--------|--------|
| Total users | `COUNT(profiles)` grouped by role |
| New users today | `profiles WHERE created_at >= CURRENT_DATE` |
| Properties by status | `COUNT(properties)` grouped by status |
| Pending property verifications | `COUNT(property_verifications WHERE status='pending')` |
| Property verifications approved/rejected today | `WHERE status IN ('approved','rejected') AND verified_at >= CURRENT_DATE` |
| Total verified properties | `COUNT(properties WHERE is_verified=true)` |
| Pending payouts | `COUNT(payouts WHERE status IN ('pending','processing'))` |
| Active escrows | `COUNT(escrow_accounts WHERE status IN ('funded','disputed'))` |
| Disputed escrows | `COUNT(escrow_accounts WHERE status='disputed')` |
| Pending reports | `COUNT(moderation_reports WHERE status='pending')` |
| Pending commissions | `COUNT(commission_records WHERE status='pending')` |

### Missing metrics

| Metric | What's needed |
|--------|--------------|
| Total platform revenue (GMV) | SUM of completed escrow amounts |
| Total fees collected | SUM of `escrow_accounts.platform_fee` where released |
| Total payouts processed | SUM of completed payouts |
| Total wallet balance (held) | SUM of `wallets.balance` |
| Active sellers / agents / vendors | COUNT where account_status='active' |
| Average listing price | AVG(`properties.price`) |
| Conversion rate (inquiry → escrow) | Ratio of inquiries to escrow creations |

### Future improvements

- Time-range picker (today / 7 days / 30 days / custom)
- Export metrics as CSV
- Revenue dashboard page (`/admin/analytics`)
- Charts (line charts for user growth, bar for property distribution)
- Real-time metrics updates via Supabase Realtime on `admin_metrics_live` channel

---

## 20. Payments Oversight ✅

**Page:** `/admin/payouts`  
**File:** [src/app/(dashboard)/admin/payouts/page.tsx](src/app/(dashboard)/admin/payouts/page.tsx)

### Purpose

Review and process user payout requests. Reject invalid requests (funds returned via wallet unlock). Retry failed payouts. Mark processing payouts as completed.

### Business rules

- Tabs: pending (oldest-first) / processing / completed / failed
- Pending: admin chooses to Process or Reject
- Process Payout: marks payout `status = 'processing'`; triggers actual payment (MTN MoMo or Orange Money via `processPayoutAdmin`)
- Reject: marks `status = 'failed'`, stores `failure_reason`, calls `wallet_unlock(recipient_id, amount)` to unfreeze locked funds
- Optimistic concurrency control on reject: `AND status = 'pending'` in UPDATE (prevents double-processing if concurrent)
- Processing → Mark Paid: manual two-step (process initiates, admin marks paid after confirming in provider dashboard)
- Failed → Retry: calls `retryPayoutAdmin(payoutId)` to retry payment

### Database tables

| Table | Operation | Client |
|-------|-----------|--------|
| `payouts` | SELECT (filtered by status), UPDATE (status, failure_reason, completed_at) | `createClient()` (user-scoped) for SELECT; `createAdminClient()` for UPDATE |
| `profiles` | SELECT (recipient join) | embedded in query |
| `wallets` | UPDATE via `wallet_unlock` RPC | `createAdminClient()` for unlock |

### Server actions

| Action | Function | File |
|--------|----------|------|
| Process payout | `processPayoutAdmin(payoutId)` | `src/lib/actions/payments.ts` |
| Retry payout | `retryPayoutAdmin(payoutId)` | `src/lib/actions/payments.ts` |
| Reject payout | Inline server action in page | uses `createAdminClient()` + `wallet_unlock` RPC |
| Mark paid | Inline server action in page | uses `createAdminClient()` |

### UI behaviour

- Status tabs: pending / processing / completed / failed
- Card per payout: recipient name, email, payment provider + phone, net amount (large), fee + gross (small), created date
- Pending: Process Payout (green) + Reject with reason input (red)
- Processing: Mark Paid button
- Failed: Retry Payout button with blue styling

### Security requirements

- `wallet_unlock` is a SECURITY DEFINER RPC — prevents over-unlock
- Concurrency guard on reject: `AND status = 'pending'` prevents double-reject

### Audit logging

- `processPayoutAdmin` and `retryPayoutAdmin` — depends on implementation in `payments.ts` (not read completely)
- Inline reject: NO `admin_logs` entry
- Inline mark-paid: NO `admin_logs` entry

### Future improvements

- Automated processing via MTN MoMo / Orange Money `transfer` API
- Write `admin_logs` on all payout actions
- Batch process multiple pending payouts
- Alert admin by email when new payout request arrives

---

## 21. Wallet Oversight 📋

**Page:** Not yet built  
**Planned path:** `/admin/wallets`

### Purpose

View platform-wide wallet balances, identify anomalous balances, manually credit/debit wallets (with full audit trail), unlock frozen balances.

### Schema ready

Tables: `wallets`, `wallet_transactions`, `transactions`  
RPCs: `wallet_transfer(from, to, amount, type, ref_id, description)` — SECURITY DEFINER

### What's needed

- Wallet list with balance + locked balance
- Individual wallet detail with transaction history
- Manual credit / debit admin action (using `wallet_transfer`)
- Locked balance management (manual unlock for stuck states)
- Wallet health check (negative balances, orphan transactions)

---

## 22. Escrow Oversight ✅

**Page:** `/admin/escrow`  
**File:** [src/app/(dashboard)/admin/escrow/page.tsx](src/app/(dashboard)/admin/escrow/page.tsx)

### Purpose

Monitor all escrow accounts. Resolve disputed escrows by releasing funds to payee or refunding to payer with optional resolution notes.

### Business rules

- Tabs: disputed (with red count badge) / active (pending+funded) / completed (released+refunded+cancelled)
- Disputed tab default (highest priority)
- On resolve → release: credits payee `amount - platform_fee` via `wallet_transfer(null, payee_id, net_amount)`
- On resolve → refund: credits payer `amount` via `wallet_transfer(null, payer_id, amount)` (full amount, no fee deduction)
- Resolution notes default to 'Admin resolved: funds released to payee' / 'Admin resolved: funds refunded to payer' if empty
- After resolution: `escrow_accounts.status = 'released'`, `resolved_at`, `resolution_notes` set

### Database tables

| Table | Operation | Client |
|-------|-----------|--------|
| `escrow_accounts` | SELECT (status IN ...), UPDATE via `resolveDisputeAdmin` | `createAdminClient()` |
| `wallets` | UPDATE via `wallet_transfer` | via SECURITY DEFINER RPC |
| `escrow_events` | INSERT (event_type='dispute_resolved') | via `resolveDisputeAdmin` |
| `profiles` | SELECT (payer + payee joins) | embedded in query |

### Server actions

- `resolveDisputeAdmin(escrowId, 'release_to_payee' | 'refund_to_payer', notes)` — `src/lib/actions/escrow.ts`

### UI behaviour

- Status tabs with disputed count badge
- Card per escrow: status badge, amount, platform fee, description, payer, payee, created/disputed dates
- Dispute reason shown in red alert box (if set)
- Resolution notes shown in muted box (if already resolved)
- Disputed tab only: two resolution forms side-by-side
  - "Release to Payee" form: notes input + green button (shows net release amount)
  - "Refund to Payer" form: separate notes input + amber button (shows full refund amount)

### Security requirements

- `resolveDisputeAdmin`: admin role check in action
- `wallet_transfer` is SECURITY DEFINER — prevents incorrect balance manipulation

### Audit logging

- `escrow_events` INSERT (event_type='dispute_resolved') — full audit trail within escrow
- No `admin_logs` entry for escrow resolution

### Future improvements

- Escrow detail page (`/admin/escrow/[id]`) with full event timeline
- Admin notes on escrow (admin-internal, not shown to parties)
- Escalation workflow (flag escrow for legal review)
- Auto-dispute detection (flag escrows with unusual patterns)

---

## 23. Admin Roles & Permissions Matrix ✅

### Current roles with admin capabilities

| Role | DB enum value | TypeScript `UserRole` | Access |
|------|--------------|----------------------|--------|
| Admin | `admin` | ✅ included | Full admin panel |
| Super Admin | ❌ not in DB | ❌ not in TS type | No implementation |
| Moderator | `moderator` | ❌ NOT in `UserRole` type | Broken — cannot be assigned via UI |

### Middleware protection

The middleware enforces prefix-based role guards via `ROLE_PROTECTED_PREFIXES`:

```
'/admin' → requires role = 'admin'
```

Admin role bypasses ALL non-admin prefix checks: `if (userRole === 'admin') return response` at line ~116 of `middleware.ts`.

### Permission matrix by admin page

| Feature | Page | Actions | Auth mechanism |
|---------|------|---------|----------------|
| Dashboard overview | `/admin` | View metrics, activity | Page guard + RPC `is_admin()` |
| User list | `/admin/users` | View, filter, suspend, activate, assign role | Page guard + action role check |
| User detail | `/admin/users/[id]` | View, KYC docs | Page guard + adminClient |
| KYC review | `/admin/professionals` | Approve, reject, suspend, reactivate, ban | Page guard + action role check |
| Property verification | `/admin/properties` | Approve, reject | Page guard + action role check |
| Property detail | `/admin/properties/[id]` | View, assign agent | Page guard + action role check |
| Reports | `/admin/reports` | Review, resolve, dismiss | Page guard + inline adminClient |
| Commissions | `/admin/commissions` | Pay, cancel | Page guard + action role check |
| Escrow | `/admin/escrow` | View, resolve disputes | Page guard + action role check |
| Payouts | `/admin/payouts` | Process, reject, retry | Page guard + action role check + inline adminClient |
| Settings | `/admin/settings` | View, edit | Page guard + inline adminClient |

### Server action permission model

All admin server actions use the same three-layer pattern:

```
Layer 1: Middleware    — blocks /admin/* for non-admin roles
Layer 2: Page guard   — redirect('/login') if profile.role !== 'admin'
Layer 3: Action guard — callerProfile.role !== 'admin' → return error
```

Exception: Inline server actions in page files (professionals page suspend/reactivate/ban, reports status transitions, payouts reject/mark-paid, settings update) use `createAdminClient()` directly inside the page, relying on Layer 1 + Layer 2 only.

### RLS policies relevant to admin

| Policy | Table | Condition | Grants |
|--------|-------|-----------|--------|
| `profiles_admin_all` | `profiles` | `is_admin()` | ALL operations |
| `kyc_mod_all` | `kyc_records` | `is_admin() OR is_moderator()` | ALL operations |
| `admin_log_admin_all` | `admin_logs` | `is_admin()` | ALL (no delete by design) |
| `prop_verif_admin_all` | `property_verifications` | `is_admin()` | ALL |
| `escrow_admin_all` | `escrow_accounts` | `is_admin()` | ALL |
| `lzs_verifydoc_admin_select` | storage `verification-documents` | `is_admin() OR is_moderator()` | SELECT (signed URL generation) |

### `is_admin()` DB function

```sql
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

All admin RLS policies and SECURITY DEFINER RPCs use this function.

---

## 24. Missing Admin Features

| Priority | Feature | What's missing | Impact |
|----------|---------|----------------|--------|
| P0 | Appeals management page | No `/admin/appeals`; admin must use Supabase Studio | Appeals are submitted but never reviewed in-app |
| P0 | User notifications on admin actions | Approve/reject/suspend don't create `notifications` rows | Users never know about KYC decisions in-app |
| P0 | Audit log page | No `/admin/audit`; admin_logs only visible in user detail (10 rows) | No platform-wide audit trail visibility |
| P1 | Audit log completeness | 8+ admin actions write no `admin_logs` entry | Cannot reconstruct who did what when |
| P1 | Suspension self-guard at action level | `adminSuspendAccount` has no server-side self-check | Admin can accidentally suspend themselves |
| P1 | Wallet oversight page | No `/admin/wallets`; cannot see balances or fix stuck states | Support team cannot investigate payment issues |
| P1 | Reviews moderation | No `/admin/reviews`; flagged reviews cannot be acted on | Defamatory content cannot be removed |
| P1 | Marketplace moderation | No `/admin/marketplace` | Fraudulent product listings cannot be removed |
| P1 | Service moderation | No `/admin/services` | Misleading service listings cannot be removed |
| P2 | Super admin role | No DB enum value, no TS type, no page | Cannot separate admin tiers |
| P2 | View as User (preview) | No `/admin/users/[id]/preview` | Cannot debug user-specific issues |
| P2 | "Request more info" KYC action | Only approve/reject; no `needs_more_info` state | Admins cannot ask for corrected documents |
| P2 | User search | No text search on `/admin/users` | Must scroll/paginate to find a user |
| P2 | Property action history | No per-property admin log viewer | Cannot audit who modified a listing |
| P2 | Platform analytics page | `/admin/analytics` — detailed revenue and usage charts | Cannot measure platform health |
| P3 | Admin broadcast notifications | No `/admin/notifications/new` | Cannot alert all users of outages / promotions |
| P3 | Moderation report → content link | Report lists target_id but no navigation to content | Admin must manually find the content |
| P3 | Bulk user actions | Cannot select multiple users for bulk suspend/role-change | Slow for large-scale actions |

---

## 25. Broken Admin Features

| ID | Feature | Location | Root cause | User impact |
|----|---------|----------|------------|-------------|
| B1 | Vendor approval | `adminApproveProfessional` in `auth.ts:841` | No `vendor` branch — `vendor_profiles.is_verified` never set | Vendors approved but their profile appears unverified in storage RLS checks |
| B2 | Audit log key name | `adminSuspendAccount` in `auth.ts:723` | Inserts key `new_data` but column is `metadata` | Queries on `admin_logs.metadata->>'reason'` return null |
| B3 | Professionals-page inline actions | `/admin/professionals/page.tsx:330-397` | Inline suspend/reactivate/ban bypass `adminSuspendAccount` — no `admin_logs`, no `account_notices` | Suspensions from professionals page are unlogged and user gets no visible reason |
| B4 | `adminActivateAccount` unlogged | `auth.ts:746` | No `admin_logs` INSERT | Reactivations cannot be audited |
| B5 | `adminAssignRole` unlogged | `auth.ts:658` | No `admin_logs` INSERT | Role changes cannot be audited |
| B6 | Moderator role broken | TypeScript `UserRole` type | `moderator` not in enum | Cannot assign moderator role via any UI; `is_moderator()` function works but role can only be set via raw DB |
| B7 | Admin can ban already-active users | `/admin/professionals` page | Ban button only on suspended tab (correct), but `adminActivateAccount` sets status='active' for banned users without check | Banned users could be accidentally reactivated |
| B8 | Payout reject unlogged | `/admin/payouts/page.tsx:202` | Inline action writes `payouts` directly — no `admin_logs` | Payout rejections unaudited |
| B9 | Settings changes unlogged | `/admin/settings/page.tsx:78` | Inline UPDATE — no `admin_logs` | Platform fee changes unaudited |
| B10 | Report resolutions unlogged | `/admin/reports/page.tsx` | All status transitions inline — no `admin_logs` | Moderation decisions unaudited |

---

## 26. Security Concerns

### SC1 — Missing self-suspension guard at action level (Medium)

`adminSuspendAccount` checks `callerProfile.role !== 'admin'` but not `caller.id !== targetUserId`. If the UI guard (which only prevents same-user suspension on the `/admin/users` page) is bypassed by calling the server action directly, an admin could self-suspend. Mitigation: add `if (targetUserId === user.id) return { error: 'Cannot suspend own account.' }` to `adminSuspendAccount`.

### SC2 — Inline server actions bypass action-level guards (Medium)

Several admin pages (professionals, payouts, reports, settings) use inline server action closures that capture `createAdminClient()` directly. These rely exclusively on Next.js page-level guards and middleware. If a future route or API path exposes these forms without the page guard, the actions would execute with service-role privileges. Mitigation: move all admin mutations to named exported server actions with explicit role checks.

### SC3 — No rate limiting on admin mutations (Low)

Admin actions (suspend, approve, reject) have no rate limit. A compromised admin session could batch-suspend all users programmatically. Mitigation: Supabase Realtime + `admin_logs` write can serve as detection; rate limiting would require middleware tracking per admin per action.

### SC4 — Audit log key mismatch creates silent data loss (Low)

`adminSuspendAccount` writes `new_data: { reason }` but the column is `metadata`. The insert succeeds (JSONB accepts any key) but the intent (storing reason) is not retrievable via `metadata->>'reason'`. Fix: change `new_data` to `metadata` in `auth.ts:729`.

### SC5 — Signed KYC URL exposure in browser history (Informational)

Signed URLs for KYC documents open in new browser tabs. The URL persists in browser history for the 1-hour TTL. If the admin's browser history is compromised, document URLs leak. Mitigation: implement a server-side proxy endpoint that validates admin session and streams the storage object, removing the signed URL from the browser address bar.

### SC6 — `adminSuspendAccount` does not use adminClient for admin_logs (Informational)

`adminSuspendAccount` uses the user-scoped `supabase` client for `admin_logs` INSERT. If the `admin_log_admin_all` RLS policy is modified to not allow INSERT, this write silently fails. `account_notices` INSERT uses `adminClient` (service-role) correctly. Standardize all admin writes to `adminClient`.

### SC7 — No 2FA on admin destructive actions (Low)

High-impact actions (ban, resolve escrow, process payout) require only a valid session. A stolen admin cookie grants full admin capabilities. Mitigation: require TOTP confirmation for irreversible actions (ban, bulk suspend, escrow resolution).

### SC8 — Ban does not revoke active sessions (Medium)

Like suspension, banning sets `profiles.account_status = 'banned'` but does not call `auth.admin.signOut(userId)`. The banned user remains active until their next request hits middleware. The window depends on session cookie TTL and Next.js server-side session cache. Mitigation: call `adminClient.auth.admin.signOut(targetUserId, { scope: 'global' })` inside `adminBanAccount`.

---

## 27. Recommended Implementation Order

The following order maximizes trust and auditability with minimum added code. Each item is scoped to match the existing code style (inline forms or named server actions, adminClient pattern, no new tables unless specified).

### Sprint A — Fix broken audit trail (estimated: 1–2 days)

1. **Fix `new_data` → `metadata` key** in `adminSuspendAccount` (`auth.ts:729`)
2. **Add `admin_logs` to `adminActivateAccount`** — copy the same pattern from `adminSuspendAccount`
3. **Add `admin_logs` to `adminAssignRole`** — action='assign_role', new_data: { newRole }
4. **Add `admin_logs` to `adminApproveProfessional`** — action='approve_professional'
5. **Add `admin_logs` to `adminRejectProfessional`** — action='reject_professional', metadata: { reason }
6. **Replace inline suspend/reactivate/ban** on `/admin/professionals` with calls to named actions (`adminSuspendAccount`, `adminActivateAccount`, named `adminBanAccount`)
7. **Add `adminBanAccount` named action** with `admin_logs` + `account_notices` (type='ban')

### Sprint B — Close user notification gap (estimated: 1 day)

8. **Add `notifications` INSERT to `adminApproveProfessional`** — type='verification', title='Account approved'
9. **Add `notifications` INSERT to `adminRejectProfessional`** — type='verification', title='Action required on your account'
10. **Add `notifications` INSERT to `adminSuspendAccount`** — type='system', title='Account suspended'
11. **Add `notifications` INSERT to `reviewVerification` (approved)** — type='property_update', title='Property verified'

### Sprint C — Appeals management (estimated: 1 day)

12. **Create `/admin/appeals` page** — list `account_appeals WHERE status='pending'`, joined with `account_notices`, `profiles`
13. **Add inline actions**: Approve appeal (calls `adminActivateAccount` + UPDATE `account_appeals.status='reviewed'`) + Dismiss (UPDATE status='dismissed')
14. **Add notification on appeal decision** — notify user when appeal resolved

### Sprint D — Fix vendor approval (estimated: 2 hours)

15. **Add vendor branch to `adminApproveProfessional`** — UPDATE `vendor_profiles.is_verified=true` WHERE id = targetUserId

### Sprint E — Audit log page (estimated: 1–2 days)

16. **Create `/admin/audit` page** — paginated `admin_logs` list with filter by action, actor, date range; link target_id to `/admin/users/[id]`

### Sprint F — User management improvements (estimated: 1–2 days)

17. **Add text search to `/admin/users`** — `.or('full_name.ilike.%q%,email.ilike.%q%,display_name.ilike.%q%')`
18. **Add `is_verified` filter chip to `/admin/users`**
19. **Add self-suspension guard to `adminSuspendAccount`** action level
20. **Add suspend/activate/ban buttons to `/admin/users/[id]`** detail page

### Sprint G — Missing moderation (estimated: 2–3 days each)

21. **`/admin/reviews`** — flagged review list, remove review action
22. **`/admin/marketplace`** — vendor product list, remove listing action
23. **`/admin/wallets`** — platform wallet overview, manual credit/debit, unlock

### Sprint H — Super Admin role (estimated: 2 days)

24. **Add `super_admin` to `user_role` DB enum** via additive migration
25. **Add `super_admin` to TypeScript `UserRole` type**
26. **Add `'/admin/super'` to `ROLE_PROTECTED_PREFIXES`** in middleware
27. **Create `/admin/super` page** with super-admin-only capabilities (promote admin, view all audit logs, emergency actions)
