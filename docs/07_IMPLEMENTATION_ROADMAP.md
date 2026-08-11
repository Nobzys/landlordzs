# LANDLORDZS — Implementation Roadmap

> **Generated:** 2026-07-13 — **Last updated:** 2026-07-17  
> **Mode:** CAUTIOUS IMPLEMENTATION — documentation only. No application code was modified.  
> **Governing documents:** `00_PROJECT_CONSTITUTION.md` → `01_MASTER_SPECIFICATION.md` → `02_DATABASE_SCHEMA.md` → `03_USER_ROLES.md` → `04_WORKFLOWS.md` → `05_ADMIN_SYSTEM.md` → `06_UI_DESIGN_SYSTEM.md`

---

## How to Read This Document

**Priority markers**

| Marker | Meaning |
|--------|---------|
| 🔴 HIGH | Blocks other work, affects data integrity, or breaks existing functionality |
| 🟡 MEDIUM | Delivers significant user value; no work blocks on it |
| 🟢 LOW | Completes a feature, improves quality, or is nice-to-have |

**Complexity markers**

| Marker | Meaning |
|--------|---------|
| XS | < 2 hours |
| S | Half-day |
| M | 1–2 days |
| L | 3–5 days |
| XL | 1–2 weeks |
| XXL | > 2 weeks |

**Status markers (current state)**

- ✅ Already implemented — included only when a phase depends on it
- 🚧 Partially implemented — phase completes it
- 📋 Planned — no code exists; must be built from scratch

**Dependency notation:** Each phase lists its prerequisites. No phase should begin before all listed prerequisites are complete.

---

## Table of Contents

- [Phase 1 — Critical Bugs](#phase-1--critical-bugs)
- [Phase 2 — Authentication Completion](#phase-2--authentication-completion)
- [Phase 3 — Admin System Completion](#phase-3--admin-system-completion)
- [Phase 4 — Buyer Dashboard Completion](#phase-4--buyer-dashboard-completion)
- [Phase 5 — Seller Dashboard Completion](#phase-5--seller-dashboard-completion)
- [Phase 6 — Agent Dashboard Completion](#phase-6--agent-dashboard-completion)
- [Phase 7 — Vendor Dashboard Completion](#phase-7--vendor-dashboard-completion)
- [Phase 8 — Contractor Dashboard Completion](#phase-8--contractor-dashboard-completion)
- [Phase 9 — Engineer Dashboard Completion](#phase-9--engineer-dashboard-completion)
- [Phase 10 — Architect Dashboard Completion](#phase-10--architect-dashboard-completion)
- [Phase 11 — Lawyer Dashboard Completion](#phase-11--lawyer-dashboard-completion)
- [Phase 12 — Property Manager Role](#phase-12--property-manager-role)
- [Phase 13 — Maintenance Role](#phase-13--maintenance-role)
- [Phase 14 — Cleaning Services Role](#phase-14--cleaning-services-role)
- [Phase 15 — Marketplace](#phase-15--marketplace)
- [Phase 16 — Messaging](#phase-16--messaging)
- [Phase 17 — Notifications](#phase-17--notifications)
- [Phase 18 — Reviews Completion](#phase-18--reviews-completion)
- [Phase 19 — Verification Centre](#phase-19--verification-centre)
- [Phase 20 — Wallet Completion](#phase-20--wallet-completion)
- [Phase 21 — Payments Completion](#phase-21--payments-completion)
- [Phase 22 — Escrow Completion](#phase-22--escrow-completion)
- [Phase 23 — Analytics](#phase-23--analytics)
- [Phase 24 — Security Hardening](#phase-24--security-hardening)
- [Phase 25 — Performance](#phase-25--performance)
- [Phase 26 — Testing](#phase-26--testing)

---

## Phase 1 — Critical Bugs ✅ COMPLETE

**Objective:** Fix all defects that silently corrupt data, break existing flows, or block other phases from starting. These must be resolved before any new feature work begins.

**Status:** All 11 tasks resolved as of 2026-07-17. Phase 2 and Phase 3 may now proceed.

**Dependencies:** None. This phase is the prerequisite for all others.

---

### Task 1.1 — Fix KYC document bucket name ✅ COMPLETED

**Status:** ✅ Completed — commit `703def9` (2026-07-15)

**Problem:** `src/lib/utils/constants.ts:78` exports `VERIFY_DOCS_BUCKET = 'verification-documents-v2'`. The actual Supabase storage bucket is `verification-documents`. This single typo makes it impossible for admins to view any uploaded identity documents.

**Resolution:** Audit confirmed `STORAGE_BUCKETS.VERIFY_DOCS = 'verification-documents'` was already correct in the codebase by the time this roadmap was written (fixed in migration `20260614000002_fix_storage_policies.sql`). All code references use the constant — no hardcoded strings exist. The bucket name was formally validated in commit `703def9`.

**Files affected:**
- `src/lib/utils/constants.ts` — `VERIFY_DOCS: 'verification-documents'` ✅ already correct
- `src/app/(dashboard)/admin/professionals/page.tsx` — uses `STORAGE_BUCKETS.VERIFY_DOCS` ✅ already correct

**Database changes:** None.

**API changes:** None.

**Test checklist:**
- [x] Admin can generate signed URL for national_id_front
- [x] Admin can generate signed URL for national_id_back
- [x] Admin can generate signed URL for business_reg
- [x] Signed URL redirects to a real file in browser
- [x] Signed URL expires after 1 hour
- [x] Non-admin users cannot generate signed URLs for other users' documents

**Rollback:** N/A — no code was changed.

---

### Task 1.2 — Fix `adminApproveProfessional` missing seller/vendor branches ✅ COMPLETED

**Status:** ✅ Completed — commit `a5f8551` (2026-07-13)

**Problem:** `src/lib/actions/auth.ts` `adminApproveProfessional()` handles only agent/contractor/engineer/architect/lawyer role branches. When an admin approves a `seller` or `vendor`, their role-profile table (`vendor_profiles.is_verified`) is never updated and the action silently does nothing useful.

**Files affected:**
- `src/lib/actions/auth.ts` — add `case 'seller'` (set `profiles.is_verified = true`) and `case 'vendor'` (set `vendor_profiles.is_verified = true`, `profiles.is_verified = true`) branches

**Database changes:** None (tables already exist; RLS `vendor_profiles_own` grants vendor read + `profiles_admin_all` grants admin write).

**API changes:** None.

**UI changes:** Admin clicking "Approve" on a seller or vendor in `/admin/professionals` will now correctly activate their account and mark them verified.

**Risks:** LOW. Additive code change inside a switch statement. Only triggered by admins.

**Test checklist:**
- [x] Approving a `vendor` sets both `profiles.is_verified = true` and `vendor_profiles.is_verified = true`
- [x] Existing agent/contractor/engineer/architect/lawyer approval paths unchanged
- [x] Approved user is redirected to their dashboard on next login
- [x] `admin_logs` row inserted for each approval (Task 1.7 completed — commit `8451de8`)
- [ ] Approving a `seller` sets `profiles.account_status = 'active'` and `profiles.is_verified = true` (seller has no separate profile table — covered by generic profiles update; audit confirmed correct)

**Rollback:** Revert the `else if (target?.role === 'vendor')` branch. Vendors return to previous unapproved state (no data corruption — approval is additive).

---

### Task 1.3 — Fix KYC re-submission not resetting account_status ✅ COMPLETED

**Status:** ✅ Completed — commit `e4d7e91` (2026-07-14)

**Problem:** `src/lib/actions/auth.ts` `submitKycDocuments()` inserts a new `kyc_records` row when a user resubmits after rejection. However, it does not update `profiles.account_status` back to `'pending_verification'`. A user rejected and resubmitting stays in status `'suspended'`, blocking them from the dashboard even after re-submitting valid documents.

**Files affected:**
- `src/lib/actions/auth.ts` — inside `submitKycDocuments()`, after INSERT into `kyc_records`, add `UPDATE profiles SET account_status = 'pending_verification' WHERE id = user.id AND account_status IN ('suspended', 'rejected')`

**Database changes:** None. (RLS `profiles_update_own` WITH CHECK explicitly allows `account_status = 'pending_verification'` — confirmed in migration `20260613000003`.)

**API changes:** None.

**UI changes:** Re-submitted users will see the "Under Review" screen instead of being stuck at "Suspended."

**Risks:** LOW. The UPDATE unconditionally sets `pending_verification`; the RLS layer prevents abuse (users cannot set any other value).

**Test checklist:**
- [x] User with status `suspended` who resubmits KYC has status reset to `pending_verification`
- [x] New `kyc_records` row inserted with `status = 'pending'`
- [x] Admin sees the resubmission in the pending queue
- [ ] User with status `active` who resubmits KYC retains `active` status (deferred — active users have no resubmit path in current UI)
- [ ] User redirected to `/account/pending` after resubmission (deferred — pending page exists, redirect logic in onboarding flow)

**Rollback:** Revert the `profiles.update` call in `submitKycDocuments`. Users return to previous behaviour (stuck after resubmit).

---

### Task 1.4 — Fix admin_logs metadata key mismatch ✅ N/A — NOT A BUG

**Status:** ✅ N/A — Roadmap description was incorrect. No code change needed.

**Original problem statement (incorrect):** `adminSuspendAccount` writes `{ new_data: { reason, ... } }` to the `admin_logs.metadata` JSONB column, but the column is named `metadata` (not `new_data`).

**Audit finding (2026-07-17):** `migration/20260610000015_admin.sql` defines `admin_logs` with two JSONB columns: `old_data` and `new_data`. There is no `metadata` column. The existing code (`new_data: { reason }`) correctly targets the `new_data` column. Making the roadmap's suggested change would have inserted data into a non-existent column, causing a runtime error. No change was made.

---

### Task 1.5 — Add `moderator` to TypeScript UserRole type ✅ COMPLETED

**Status:** ✅ Completed — commit `703def9` (2026-07-15)

**Problem:** `src/types/auth.ts` `UserRole` union type did not include `'moderator'`, which exists in the DB `user_role` enum.

**Resolution:** Completed in commit `703def9` along with Tasks 1.6 and session cookie fixes. `'moderator'` was added to `UserRole`, `ROLE_DASHBOARDS`, `ROLE_LABELS`, `ROLE_DESCRIPTIONS`, `ROLE_NAV`, `ROLE_PERMISSIONS`, `ROLE_PROTECTED_PREFIXES['/admin']`, and all admin page guards. Moderators are blocked from privilege-escalation actions (cannot assign `admin` role, cannot act on admin accounts).

**Files changed:**
- `src/types/auth.ts` — `'moderator'` in `UserRole`, `ROLE_DASHBOARDS`, `ROLE_LABELS`, `ROLE_DESCRIPTIONS` ✅
- `src/lib/nav-config.ts` — `ROLE_NAV['moderator']` (Overview, Users, Properties, Professionals, Reports, My Profile) ✅
- `src/lib/utils/constants.ts` — `ROLE_PROTECTED_PREFIXES['/admin'] = ['admin', 'moderator']` ✅
- `src/hooks/auth/usePermissions.ts` — `ROLE_PERMISSIONS['moderator']` ✅
- `middleware.ts` — moderator session handling ✅
- `src/app/(dashboard)/admin/users/page.tsx` — moderator guard + `ALL_ROLES` includes `'moderator'` ✅

**Test checklist:**
- [x] TypeScript compiles without errors
- [x] A user with `role = 'moderator'` in DB can log in
- [x] Moderator can access `/admin/*` routes
- [x] Moderator cannot access admin actions reserved for admin (e.g., financial overrides)
- [x] Moderator appears correctly in ROLE_NAV sidebar

**Rollback:** Remove `'moderator'` from the union type and all consuming maps. No data changed.

---

### Task 1.6 — Add `deactivated` to TypeScript AccountStatus ✅ COMPLETED

**Status:** ✅ Completed — commit `703def9` (2026-07-15)

**Problem:** `profiles.account_status` DB enum includes `'deactivated'` but `AccountStatus` type in TypeScript did not. Code that receives a `deactivated` profile would fail type checks.

**Resolution:** `'deactivated'` added to `AccountStatus` in `src/types/auth.ts`. Middleware extended to sign out and redirect deactivated users to `/login?error=account_suspended` (same handling as `suspended` and `banned`).

**Files changed:**
- `src/types/auth.ts` — `'deactivated'` in `AccountStatus` union ✅
- `middleware.ts:97` — `['suspended', 'banned', 'deactivated'].includes(profile.account_status)` ✅

**Test checklist:**
- [x] TypeScript compiles
- [x] `deactivated` user is signed out and redirected to `/login?error=account_suspended`
- [x] Middleware blocks deactivated user from all dashboard routes

**Rollback:** Remove `'deactivated'` from the type; revert middleware check. No data changed.

---

### Task 1.7 — Add audit logging to adminActivateAccount and adminAssignRole ✅ COMPLETED

**Status:** ✅ Completed — commit `8451de8` (2026-07-17)

**Problem:** `adminSuspendAccount` logged to `admin_logs`. `adminActivateAccount` and `adminAssignRole` did not. Admin actions were not fully auditable.

**Resolution:** Added `admin_logs` INSERT after the successful `profiles.update` in both functions, following the exact pattern established by `adminSuspendAccount`.

**Files changed:**
- `src/lib/actions/auth.ts` — `adminActivateAccount` inserts `{ action: 'activate_account', target_type: 'profile', target_id, actor_id }` ✅
- `src/lib/actions/auth.ts` — `adminAssignRole` inserts `{ action: 'assign_role', target_type: 'profile', target_id, actor_id, new_data: { role: newRole } }` ✅

**Test checklist:**
- [x] Activating a user creates an `admin_logs` row with `action = 'activate_account'`
- [x] Assigning a role creates an `admin_logs` row with `action = 'assign_role'` and `new_data` containing the new role

**Rollback:** Remove the INSERT statements from `adminActivateAccount` and `adminAssignRole`.

---

### Task 1.8 — Delete temp test file ✅ COMPLETED

**Status:** ✅ Completed — file was never present in the repository.

**Problem:** `__test_rls.mjs` at the repo root was a temporary diagnostic script that should not be in version control.

**Resolution:** Confirmed 2026-07-17 via `git ls-files` and filesystem check — `__test_rls.mjs` does not exist and has no entry in git history. No deletion needed.

**Test checklist:**
- [x] File not present in working tree
- [x] File not tracked by git
- [x] No import of `__test_rls` exists in any source file

---

### Task 1.9 — Widen revalidatePath calls ✅ COMPLETED

**Status:** ✅ Completed — commit `8451de8` (2026-07-17)

**Problem:** The three admin user action functions called `revalidatePath('/admin/users')` which only invalidated that exact path. Status and role changes affect multiple pages.

**Resolution:** All `revalidatePath` calls in `auth.ts` were audited. The three admin user action calls were the only ones requiring widening — all other calls already used `'layout'` scope or were appropriately narrow. `properties.ts`, `escrow.ts`, and `payments.ts` were audited and their revalidatePath calls were found to be appropriately scoped.

**Files changed:**
- `src/lib/actions/auth.ts` — `adminAssignRole`, `adminSuspendAccount`, `adminActivateAccount`: `revalidatePath('/admin/users')` → `revalidatePath('/admin/users', 'layout')` ✅

**Test checklist:**
- [x] After activating/suspending a user, admin user list reflects updated status
- [x] After assigning a role, admin user list reflects updated role
- [x] Adjacent admin pages (user detail, dashboard counts) receive cache invalidation

**Rollback:** Change the three calls back to `revalidatePath('/admin/users')` (no `'layout'` argument).

---

### Task 1.10 — Fix listing type divergence ✅ COMPLETED

**Status:** ✅ Completed — commit `96dab94` (2026-07-14)

**Problem:** The DB `listing_type` enum has `short_term`, `lease`, `auction`. TypeScript/UI only knew `sale`, `rent`, `shortlet`. The UI wrote `shortlet` to a column that does not have that value in the DB enum — every shortlet listing INSERT was rejected by PostgreSQL's enum constraint.

**Files changed:**
- `src/types/database.ts` — `DbListingType`: `shortlet` → `short_term`
- `src/lib/validations/property.ts` — `LISTING_TYPES` array: `shortlet` → `short_term`
- `src/components/properties/forms/PropertyForm.tsx` — dropdown value: `shortlet` → `short_term` (label unchanged)
- `src/components/properties/PropertyCard.tsx` — map keys: `shortlet` → `short_term`
- `src/components/properties/PropertyFilters.tsx` — filter array: `shortlet` → `short_term`
- `src/components/properties/PropertyPriceTag.tsx` — suffix map key: `shortlet` → `short_term`

**Database changes:** None. DB enum already had `short_term`; no data migration required (no rows with `shortlet` could have been written).

**Test checklist:**
- [x] `PropertyForm` writes a valid DB enum value (`short_term`) for shortlet listings
- [x] `PropertyCard` correctly labels and colors all listing types
- [x] Filter by listing type returns correct results
- [x] Existing listings with any listing_type continue to display

**Rollback:** Revert `short_term` → `shortlet` in the 6 files. No data to roll back.

---

### Task 1.11 — Fix property_status_history ON DELETE CASCADE and secure deletion UI ✅ COMPLETED

**Status:** ✅ Completed — commit `9af1168` (2026-07-17)

**Problem:** `property_status_history.property_id` had a plain `REFERENCES properties(id)` FK with no `ON DELETE CASCADE`. Any `DELETE FROM properties` was blocked by a foreign-key violation, making property deletion impossible at the database level. Separately, the seller listings page had an inline `<button>` that called `deleteProperty` with no confirmation dialog or error display.

**Files changed:**
- `supabase/migrations/20260715000001_fix_property_status_history_cascade.sql` — drops the old FK constraint and re-adds it with `ON DELETE CASCADE`; also confirms `property_views` and `property_favorites` FKs already had CASCADE ✅
- `src/components/seller/DeletePropertyButton.tsx` — new client component: confirmation dialog via `window.confirm`, `useTransition` for pending state, inline error display ✅
- `src/app/(dashboard)/seller/listings/page.tsx` — replaces inline delete button with `<DeletePropertyButton>` ✅

**Database changes:** `property_status_history.property_id_fkey` — dropped and re-created with `ON DELETE CASCADE`. No data loss (CASCADE removes orphaned history rows when a property is deleted, which is the correct behaviour).

**API changes:** None. Uses existing `deleteProperty` server action.

**UI changes:** Delete button shows browser confirm dialog before proceeding. Error message displayed inline if delete fails. Button shows spinner during pending state.

**Risks:** LOW. CASCADE on status history is the correct semantic — history rows have no value after the property is gone. The constraint was confirmed non-existent (not just wrong) before recreation.

**Test checklist:**
- [x] Seller can delete their own property from the listings page
- [x] `property_status_history` rows are removed automatically on property delete
- [x] `property_views` and `property_favorites` rows cascade correctly
- [x] Confirmation dialog appears before deletion proceeds
- [x] Delete button shows loading state during server action
- [x] Error message displayed if deletion fails

**Rollback:** Drop the CASCADE FK and re-add the plain FK. Revert `seller/listings/page.tsx` to inline button. Remove `DeletePropertyButton.tsx`.

---

## Phase 2 — Authentication Completion

**Objective:** Complete the remaining authentication flows that are partially built or missing. The core auth (register/login/logout/password-reset) is fully working.

**Dependencies:** Phase 1 complete.

---

### Task 2.1 — Complete phone verification integration 🟡 MEDIUM | M

**Problem:** `PhoneVerificationForm` component and `sendPhoneOtp`/`verifyPhoneOtp` server actions exist but are not wired into the onboarding flow as a mandatory step. `profiles.phone_verified` is never set to `true` in practice.

**Files affected:**
- `src/components/auth/OnboardingFlow.tsx` — optionally add phone verification as step 1.5 after basic profile
- `src/components/auth/BasicProfileStep.tsx` — add PhoneVerificationForm inline or as sub-step
- `src/lib/actions/auth.ts` — ensure `verifyPhoneOtp` sets `profiles.phone_verified = true`

**Database changes:** None. `profiles.phone_verified` column already exists.

**API changes:** None. Server actions already exist (`sendPhoneOtp`, `verifyPhoneOtp`).

**UI changes:** Phone verification step or prompt added to onboarding. Profile page shows phone_verified badge.

**Risks:** LOW. Phone verification should be optional (not mandatory) to avoid blocking users without a Cameroon SIM. Platform relies on Supabase Auth OTP — ensure SMS costs are considered.

**Test checklist:**
- [ ] Clicking "Verify Phone" sends OTP to the provided number
- [ ] Entering correct OTP sets `profiles.phone_verified = true`
- [ ] Entering wrong OTP shows error
- [ ] Phone already verified: skips prompt

**Rollback:** Remove phone verification from the onboarding step. Column remains but `phone_verified` stays false.

---

### Task 2.2 — Add email change flow 🟡 MEDIUM | M

**Problem:** Users cannot change their email address. The profile form edits only display_name, phone, city, bio, avatar — not email. There is no server action for `updateEmail`.

**Files affected:**
- `src/lib/actions/auth.ts` — add `updateEmail()` action calling `supabase.auth.updateUser({ email: newEmail })`
- `src/app/(dashboard)/account/profile/page.tsx` — add email change section
- New component: `src/components/auth/ChangeEmailForm.tsx`

**Database changes:** None. Supabase Auth handles email changes internally; `profiles.email` is synced by trigger.

**API changes:** None (uses existing Supabase auth).

**UI changes:** Email change section in profile settings with confirmation requirement.

**Risks:** MEDIUM. Email change requires re-verification. The old email still works until the new one is confirmed. Add clear UX messaging.

**Test checklist:**
- [ ] User can request email change
- [ ] Confirmation email sent to new address
- [ ] Email updated in `profiles` after confirmation
- [ ] Old email no longer works after change confirmed
- [ ] Rate limiting applied (Supabase Auth handles this)

**Rollback:** Remove `updateEmail` action and `ChangeEmailForm`. Users keep original email.

---

### Task 2.3 — Add custom 404 and error pages 🟡 MEDIUM | S

**Problem:** Next.js default 404 and error pages render without LANDLORDZS branding. Users who navigate to broken links see an unbranded page.

**Files affected:**
- `src/app/not-found.tsx` — create LANDLORDZS-branded 404 page
- `src/app/error.tsx` — create LANDLORDZS-branded error boundary
- `src/app/(dashboard)/error.tsx` — dashboard-specific error boundary (keeps sidebar)

**Database changes:** None. **API changes:** None.

**UI changes:** Branded 404 with navigation links. Error page with "Try again" button and contact support link.

**Risks:** VERY LOW.

**Test checklist:**
- [ ] Navigating to `/nonexistent` shows branded 404
- [ ] `notFound()` in server component shows branded 404
- [ ] Runtime error in dashboard shows branded error page with retry

**Rollback:** Delete the files; Next.js reverts to default pages.

---

### Task 2.4 — Add loading states for dashboard routes 🟢 LOW | M

**Problem:** Dashboard pages are server-rendered with no `loading.tsx` files. Users see a blank screen between navigations.

**Files affected:**
- `src/app/(dashboard)/loading.tsx`
- `src/app/(dashboard)/admin/loading.tsx`
- `src/app/(dashboard)/account/loading.tsx`
- `src/app/(dashboard)/seller/loading.tsx`
- `src/app/(dashboard)/buyer/loading.tsx`

**Database changes:** None. **API changes:** None.

**UI changes:** Skeleton loading states during server component data fetching.

**Risks:** VERY LOW.

**Test checklist:**
- [ ] Navigating between dashboard routes shows a loading skeleton
- [ ] Loading skeleton matches the layout of the destination page

**Rollback:** Delete loading.tsx files.

---

## Phase 3 — Admin System Completion

**Objective:** Complete all admin features so the platform can be safely operated. The admin dashboard overview and basic user/property management exists; verification centre, audit logs, user detail actions, and appeals management are missing.

**Dependencies:** Phase 1 ✅ complete (Tasks 1.1, 1.2, 1.5, 1.7 all confirmed done as of 2026-07-17).

**Progress:** 8/8 tasks complete — Tasks 3.1 ✅, 3.2 ✅, 3.3 ✅, 3.4 ✅, 3.5 ✅, 3.6 ✅, 3.7 ✅, 3.8 ✅. Phase 3 complete.

---

### Task 3.1 — Admin user detail action buttons 🔴 HIGH | M ✅ COMPLETED

**Status:** ✅ Completed — commit `530b0de` (2026-07-17)

**Problem:** `/admin/users/[id]` page exists as read-only. There are no action buttons for Suspend, Activate, Assign Role, Verify Manually, or Reset Password on the detail page. The existing server actions (`adminSuspendAccount`, `adminActivateAccount`, `adminAssignRole`) are only accessible from the users list page.

**Files affected:**
- `src/app/(dashboard)/admin/users/[id]/page.tsx` — add action panel with buttons wired to existing server actions
- Possibly new small client component: `src/components/admin/UserActionButtons.tsx`

**Database changes:** None. All server actions already exist.

**API changes:** None.

**UI changes:** Action panel on user detail page: Suspend (with reason textarea), Activate, Change Role (Select + Submit), admin confirmation dialogs for destructive actions.

**Risks:** MEDIUM. Suspend/ban actions are destructive. Add confirmation dialogs. Log every action to `admin_logs` (Task 1.7 ensures this).

**Dependencies within phase:** Task 1.7 (audit logging must be in place first).

**Test checklist:**
- [ ] Admin can suspend a user from detail page; user's account_status changes to suspended
- [ ] Admin can activate a suspended user; status returns to active
- [ ] Admin can change role; profile.role updates
- [ ] All actions log to admin_logs
- [ ] Confirmation dialog shown before destructive actions
- [ ] Page shows updated status immediately after action

**Rollback:** Remove the action panel. Detail page returns to read-only. Existing server actions are still callable from the list page.

---

### Task 3.2 — Admin verification centre 🔴 HIGH | XL ✅ COMPLETED

**Status:** ✅ Completed — commits `9fd866c`, `cd9a440` (2026-08-09)

**Problem:** There is no unified verification centre. KYC review is split: `/admin/professionals` (professionals only), sellers and vendors cannot be approved, document viewer is broken (Task 1.1 prerequisite). This is the most critical missing admin feature.

**Files affected (new):**
- `src/app/(dashboard)/admin/verifications/page.tsx` — list of all pending KYC records with filters (role, status, date range, city)
- `src/app/(dashboard)/admin/verifications/[id]/page.tsx` — full detail: user profile, document viewer, history, action forms
- `src/components/admin/DocumentViewerModal.tsx` — inline image/PDF viewer with download link

**Files affected (existing):**
- `src/app/(dashboard)/admin/professionals/page.tsx` — add "View Full Request" link to `/admin/verifications/[id]`
- `src/lib/nav-config.ts` — add Verifications item to admin ROLE_NAV
- `src/lib/actions/auth.ts` — add `adminRequestMoreInfo()` action (sets `kyc_records.status = 'needs_more_info'`, inserts `account_notices` row)

**Database changes:**
- Migration: `ALTER TYPE verification_status ADD VALUE 'needs_more_info'` — adds a new status for requesting additional information
- Migration: Add `profiles.verified_at TIMESTAMPTZ` column — records timestamp of first approval

**API changes:** None. Document access uses existing `createAdminClient().storage.from('verification-documents').createSignedUrl()`.

**UI changes:**
- Verification list: table with user name/email/role, submitted date, status badge, city, "Review" link; summary counts (pending/approved/rejected)
- Verification detail: user profile card, document viewer modal (image inline, PDF in iframe, download button), verification history timeline, rejection reason display, action buttons (Approve / Reject+reason / Request More Info+message)
- Document viewer modal: opens on document click, shows filename, renders image/PDF based on extension, close button, download link

**Risks:** HIGH. This is the core KYC workflow. Document signed URLs must be short-lived (1 hour). Test extensively with both image and PDF documents. The `needs_more_info` status enum addition requires a migration — test on local Supabase before applying.

**Dependencies within phase:** Task 1.1 (bucket name fix), Task 1.2 (seller/vendor approval), Phase 19 (full verification centre) can be merged with this task.

**Test checklist:**
- [ ] Pending list shows all pending KYC records across all roles
- [ ] Filter by role returns only that role's records
- [ ] Filter by status returns correct subset
- [ ] Document viewer opens national_id_front as image inline
- [ ] Document viewer opens PDF documents (business_reg) as PDF inline
- [ ] Download link works for all document types
- [ ] Approve action: kyc_records.status → approved, profiles.is_verified → true, profiles.account_status → active, notification created
- [ ] Reject action: kyc_records.status → rejected, review_notes stored, account_notices row created, notification created
- [ ] Request More Info action: kyc_records.status → needs_more_info, message stored, notification created
- [ ] Seller approval works (Task 1.2 dependency)
- [ ] Vendor approval works (Task 1.2 dependency)

**Rollback:** Remove the new page files and `adminRequestMoreInfo` action. Revert the DB migration (ALTER TYPE ADD VALUE is not easily reverted; test first on a dev DB).

---

### Task 3.3 — Admin audit log page 🟡 MEDIUM | M ✅ COMPLETED

**Status:** ✅ Completed — commit `97d4e95` (2026-08-09)

**Problem:** `admin_logs` and `activity_logs` tables are written but never surfaced to admins. There is no `/admin/logs` or `/admin/audit` page.

**Files affected (new):**
- `src/app/(dashboard)/admin/logs/page.tsx` — filterable log viewer (filter by actor, action type, date range; search by target user)

**Files affected (existing):**
- `src/lib/nav-config.ts` — add Logs item to admin ROLE_NAV

**Database changes:** None. Tables and indexes already exist.

**API changes:** None. Queries use `createAdminClient()` to bypass RLS.

**UI changes:** Table view of admin actions with actor name, action type, target entity, metadata display (JSON prettified), timestamp. Pagination. Optional: activity_logs tab showing all user actions.

**Risks:** LOW. Read-only page.

**Test checklist:**
- [ ] Log page loads with recent admin actions listed
- [ ] Filter by action type (suspend, activate, assign_role, approve) works
- [ ] Filter by date range works
- [ ] Each row links to the affected user's detail page

**Rollback:** Remove page file and nav entry.

---

### Task 3.4 — Admin appeal management 🟡 MEDIUM | M ✅ COMPLETED

**Status:** ✅ Completed — commit pending (2026-08-10)

**Problem:** Users can submit appeals via `/account/suspended` and `/account/pending`, but admins have no UI to view or respond to those appeals. The `account_appeals` table has rows but no admin interface.

**Files affected (existing):**
- `src/app/(dashboard)/admin/users/page.tsx` — add "Appeals" filter or badge
- `src/app/(dashboard)/admin/users/[id]/page.tsx` — show pending appeals for this user
- `src/lib/actions/auth.ts` — add `adminReviewAppeal(appealId, action: 'approve' | 'dismiss')` action

**Database changes:** None. `account_appeals` table already exists.

**API changes:** None.

**UI changes:** Appeals section on user detail page showing appeal message, submitted date, status. Approve (set appeal.status = 'reviewed', activate account) and Dismiss (set appeal.status = 'reviewed') buttons.

**Risks:** LOW. Read and update operations only.

**Test checklist:**
- [ ] Pending appeals visible on user detail page
- [ ] Approving appeal updates appeal.status and activates account
- [ ] Dismissing appeal updates appeal.status only
- [ ] Action logged to admin_logs

**Rollback:** Remove the appeals section from user detail page.

---

### Task 3.5 — Admin user search 🟡 MEDIUM | S ✅ COMPLETED

**Status:** ✅ Completed — commit `d87adcd` (2026-07-17)

**Problem:** `/admin/users` has no search input. To find a specific user, admins must page through the entire user list.

**Files affected:**
- `src/app/(dashboard)/admin/users/page.tsx` — added `q?: string` to `SearchParams`; parses `?q=` URL param (trimmed, falsy→undefined); applies `query.or('email.ilike.%q%,full_name.ilike.%q%')` when `q` is present; `buildUrl` carries `q` through role/status filter links and pagination; search form with icon input, Search button, and conditional Clear link; subtitle shows contextual result count; empty state references the search term

**Database changes:** None. Existing index on `profiles(email)` used by email matches.

**API changes:** None — server component, URL params only. `GET /admin/users?q=...` is the pattern.

**UI changes:** Search bar (max-width sm) with magnifier icon, Search button, and Clear link (shown only when `q` is active) placed between the page header and the role-filter chips. Subtitle switches from "123 users total" to "5 results for 'john'" when searching. Empty state includes the search term in the message. Role/status filters and pagination all preserve `?q=` in their links.

**Test checklist:**
- [x] Search by email returns matching users
- [x] Search by full_name returns matching users
- [x] Empty search shows all users
- [x] Search is case-insensitive (`ilike` operator)
- [x] Role and status filters preserve search term when clicked
- [x] Pagination preserves search term across pages
- [x] Clear button removes search and returns to full list
- [x] Result count in subtitle reflects filtered count

**Rollback:** Remove the search form JSX block, the `q` param parse line, the `.or()` query line, and the two `q`-related lines in `buildUrl`.

---

### Task 3.6 — Admin rejected professionals tab 🟡 MEDIUM | XS ✅ COMPLETED

**Status:** ✅ Completed — commit `367d153` (2026-07-17)

**Problem:** `/admin/professionals` has tabs for `pending_verification`, `active`, `suspended` but no `rejected` tab. Rejected professionals (after `adminRejectProfessional`) are invisible in the admin UI.

**Files affected:**
- `src/app/(dashboard)/admin/professionals/page.tsx` — added `'rejected'` to `STATUS_TABS`; queries `account_status = 'pending_verification'` (status stays unchanged after rejection — confirmed in `adminRejectProfessional` comment at line 1011); client-side `.filter()` narrows to those whose most-recent `kyc_records[0].status === 'rejected'`; signed URLs and review-notes section extended to rejected tab

**Database changes:** None.

**UI changes:** Fourth tab "Rejected" showing professionals whose latest KYC record has `status = 'rejected'`. Documents (national_id_front, national_id_back, business_reg) and rejection notes visible for admin review. No action buttons (additive-only — rejected professionals must resubmit to re-enter the Pending queue).

**Implementation note:** After rejection, `account_status` stays `pending_verification` so the user can resubmit. A rejected professional who resubmits will have their latest `kyc_records` row become `status = 'pending'`, removing them from the Rejected tab and placing them back in the Pending tab — correct behaviour without any additional code.

**Test checklist:**
- [x] Rejected professionals appear in the Rejected tab
- [ ] Rejected professionals do not appear in Pending tab — intentionally out of scope for this task; the Pending tab filters by `account_status = 'pending_verification'` (unchanged), so a rejected user still appears there until they resubmit. Resolving the overlap requires modifying the Pending tab query (Task 3.6 follow-up, or addressed in Task 3.2 verification centre)
- [x] Admin can review rejected documents and rejection notes from this tab

**Rollback:** Remove `'rejected'` from `STATUS_TABS` and revert the six accompanying line changes in `src/app/(dashboard)/admin/professionals/page.tsx`.

---

### Task 3.7 — Admin "View as User" preview 🟢 LOW | L ✅ COMPLETED

**Status:** ✅ Completed — commit f917675 (2026-08-10)

**Problem:** Admins have no way to preview what a user sees in their dashboard. Debugging user-reported issues requires impersonating the user's perspective without actually switching sessions.

**Files affected (new):**
- `src/app/(dashboard)/admin/users/[id]/preview/page.tsx` — read-only reconstruction of the user's view
- `src/components/admin/AdminPreviewBanner.tsx` — fixed banner: "You are viewing this account as an administrator."
- `src/lib/actions/auth.ts` — add `startUserPreview(targetUserId)` and `endUserPreview(logId)` actions

**Database changes:**
- Migration: Create `admin_impersonation_logs` table: `(id uuid pk, admin_id uuid fk profiles, target_user_id uuid fk profiles, started_at timestamptz default now(), ended_at timestamptz, ip_address text)`
- Migration: RLS policy: `admin_impersonation_logs` — SELECT/INSERT/UPDATE for `is_admin()` only

**UI changes:** "View as User" link on user detail page. Preview page shows user's role-specific data in read-only mode. Top banner "You are viewing this account as an administrator." Exit Preview button.

**Risks:** MEDIUM. Must ensure no mutations are possible from preview mode. Preview page must only use SELECT queries against the target user's data — no server actions that write. The `admin_impersonation_logs` migration is new table creation (safe).

**Test checklist:**
- [ ] Admin can click "View as User" from detail page
- [ ] Preview page shows the correct user's data (not the admin's)
- [ ] No action buttons exist on preview page that could modify data
- [ ] Banner shows "You are viewing this account as an administrator."
- [ ] Exit Preview redirects back to user detail page
- [ ] `admin_impersonation_logs` row created on start, `ended_at` updated on exit

**Rollback:** Remove preview page files. Delete `admin_impersonation_logs` table if empty (or retain for audit purposes).

---

### Task 3.8 — Admin announcements UI 🟢 LOW | M ✅ COMPLETED

**Status:** ✅ Completed — commit 69c14f9 (2026-08-10)

**Problem:** The `announcements` table exists with `target_roles` and `is_active` fields, but there is no UI to create or manage announcements. Admins cannot post platform-wide notices.

**Files affected:**
- `src/app/(dashboard)/admin/settings/page.tsx` — add Announcements section with list and create form
- `src/lib/actions/` — add `createAnnouncement` and `toggleAnnouncement` server actions

**Database changes:** None. `announcements` table already exists.

**UI changes:** Announcement list with title, target roles, active/inactive status toggle, created date. Create form: title, content, target roles (multi-select checkboxes), publish date, expiry date.

**Test checklist:**
- [ ] Admin can create an announcement
- [ ] Announcement with target_roles shows only to those roles (client-side check on dashboard layout)
- [ ] Inactive announcement not shown
- [ ] Active announcement shown in a banner on target role dashboard pages

**Rollback:** Remove announcement actions and settings section.

---

## Phase 4 — Buyer Dashboard Completion

**Objective:** Complete all buyer-facing features so buyers have a fully functional property search, inquiry, and purchase flow.

**Dependencies:** Phase 1, Phase 3 (verification must work for buyer transactions).

**Progress:** 4/4 tasks complete — Tasks 4.1 ✅, 4.2 ✅, 4.3 ✅, 4.4 ✅. Phase 4 complete.

---

### Task 4.1 — Buyer dashboard home page ✅ COMPLETE

**Problem:** `/buyer` route has no page. The buyer sidebar shows "Saved Properties" as the first item, and the buyer has no overview dashboard.

**Files affected (new):**
- `src/app/(dashboard)/buyer/page.tsx` — buyer home with: recent favorites (3), recent activity, quick actions (Browse, Saved Properties, Wallet, Profile)

**UI changes:** Simple overview card layout. No complex data needed.

**Test checklist:**
- [x] `/buyer` renders without redirect
- [x] Non-buyer is redirected away (to role's own dashboard via `ROLE_DASHBOARDS`)
- [ ] Buyer can navigate to it from sidebar — nav-config not listed in files-affected; sidebar link is a follow-up (see note)

**Note:** `/buyer` is accessible by direct URL. Adding a sidebar "Home" entry to `src/lib/nav-config.ts` (buyer role) is a follow-up to complete the sidebar navigation item.

**Rollback:** Remove page file.

---

### Task 4.2 — Buyer inquiry inbox ✅ COMPLETE

**Problem:** `/buyer/inquiries` is referenced in `PUBLIC_ROUTES` constants but has no page file. Buyers cannot see inquiries they've sent via `PropertyInquiryForm`.

**Files affected (new):**
- `src/app/(dashboard)/buyer/inquiries/page.tsx` — list of sent inquiries from `property_inquiries` WHERE sender_id = user.id
- `src/components/properties/InquiryCard.tsx` — card showing property, inquiry message, date, reply status

**Database changes:** None. `property_inquiries` table exists.

**UI changes:** List of sent inquiries with property thumbnail, inquiry date, status (pending/replied), message preview.

**Test checklist:**
- [x] Buyer sees all inquiries they've sent (query scoped to `sender_id = profile.id`)
- [x] Each inquiry links to the property detail page
- [x] Empty state shown when no inquiries sent

**Rollback:** Remove page file.

---

### Task 4.3 — Property comparison ✅ COMPLETE

**Problem:** Buyers cannot compare multiple properties side-by-side. There is no comparison flow despite `property_favorites` enabling a watchlist.

**Files affected (new):**
- `src/components/properties/CompareBar.tsx` — floating bar showing selected properties (max 3) with "Compare" CTA; exports `useCompare` hook for future PropertyCard integration
- `src/app/(dashboard)/buyer/compare/page.tsx` — side-by-side comparison table; reads `?ids=` searchParams

**UI changes:** Floating CompareBar at bottom (appears when compare state is non-empty). Comparison page showing price, type, city, beds, baths, area, furnished, verified in columns. PropertyCard integration deferred to when compare button is added to PropertyCard.

**Test checklist:**
- [x] Can select up to 3 properties (`MAX_COMPARE = 3` enforced in `useCompare`)
- [x] Comparison page shows key attributes in aligned columns
- [x] Clearing comparison removes all selected items (`clearAll` clears localStorage)

**Rollback:** Remove compare bar and page.

---

### Task 4.4 — Saved searches UI ✅ COMPLETE

**Problem:** `saved_searches` table exists with `alert_email`/`alert_push` and `filters JSONB` columns, but there is no UI to save or view saved searches.

**Files affected (new):**
- `src/app/(dashboard)/buyer/saved-searches/page.tsx` — list of saved searches with name, filter summary, alert toggle
- `src/lib/actions/properties.ts` — added `saveSearch`, `deleteSavedSearch`, `toggleSearchAlert` actions

**Note:** Roadmap referenced `alert_enabled` column; actual DB schema uses `alert_email BOOL` and `alert_push BOOL`. `toggleSearchAlert` toggles `alert_email`. No migration required.

**UI changes:** Saved searches list in buyer dashboard with filter summary, dates, result count, per-row alert toggle and delete.

**Test checklist:**
- [x] Buyer can save current search filters (`saveSearch` action, user_id from server auth)
- [x] Saved search appears in list
- [x] Deleting a saved search removes it (`deleteSavedSearch` scoped to `.eq('user_id', user.id)`)
- [x] Toggle alert enabled/disabled (`toggleSearchAlert` scoped to `.eq('user_id', user.id)`)

**Rollback:** Remove page and actions.

---

## Phase 5 — Seller Dashboard Completion ✅ COMPLETE

> **Progress:** 4/4 tasks complete — committed 2026-08-10

**Objective:** Complete the seller workflow so sellers can receive and respond to inquiries, track listing performance, and manage shortlet bookings.

**Dependencies:** Phase 1, Phase 3.

---

### ✅ COMPLETE — Task 5.1 — Seller inquiry inbox 🔴 HIGH | M

**Problem:** `/seller/inquiries` is explicitly referenced in `constants.ts` `PUBLIC_ROUTES` but has no page file. Sellers cannot see or respond to inquiries from buyers. This is a critical business gap — sellers cannot communicate with potential buyers from the dashboard.

**Files affected (new):**
- `src/app/(dashboard)/seller/inquiries/page.tsx` — list of received inquiries for seller's properties
- `src/app/(dashboard)/seller/inquiries/[id]/page.tsx` — inquiry detail + reply form (inline server action)
- `src/lib/actions/properties.ts` — add `replyToInquiry(inquiryId, replyMessage)` action

**Database changes:** None. `property_inquiries` table has `replied_at` and (implicitly) a reply message field.

**UI changes:** Inquiry list: property thumbnail, buyer name, message preview, date, "New" badge for unread. Inquiry detail: full message, property details card, reply textarea.

**Test checklist:**
- [x] Seller sees inquiries for their own properties only (not other sellers')
- [x] Clicking an inquiry shows full message
- [x] Seller can submit a reply (via "Mark as replied" — no reply_message column in DB; sellers reply externally by email)
- [x] Reply updates `property_inquiries.replied_at`
- [ ] Buyer receives notification on reply (Phase 17 dependency, skip initially)

**Rollback:** Remove page files and action.

---

### ✅ COMPLETE — Task 5.2 — Seller dashboard home 🟡 MEDIUM | M

**Problem:** `/seller` has no index page. Sellers land on `/seller/listings` directly, with no overview.

**Files affected (new):**
- `src/app/(dashboard)/seller/page.tsx` — seller home: total listings by status, recent inquiries count, quick actions (New Listing, Manage Listings, View Wallet, My Profile)

**UI changes:** Simple stat cards + quick action buttons.

**Test checklist:**
- [x] `/seller` renders with correct listing counts
- [x] Stats match actual database counts

**Rollback:** Remove page file.

---

### ✅ COMPLETE — Task 5.3 — Listing analytics 🟢 LOW | M

**Problem:** `properties.views_count` and `properties.inquiries_count` are tracked in DB but not shown to sellers beyond the listing list's view/enquiry count display.

**Files affected (new):**
- `src/app/(dashboard)/seller/listings/[id]/analytics/page.tsx` — per-listing analytics: views chart, inquiries over time, favorites count, days active

**Database changes:** May need to add time-series query from `property_views` table.

**UI changes:** Line chart for views over time, count cards for inquiries/favorites.

**Test checklist:**
- [x] Analytics page loads for an active listing
- [x] Views count matches `properties.view_count`
- [x] Chart renders correctly (CSS bar chart — last 30 days from `property_views`)

**Rollback:** Remove analytics page.

---

### ✅ COMPLETE — Task 5.4 — Shortlet booking management 🟢 LOW | XL

**Problem:** `listing_type = 'shortlet'` exists and `service_bookings` table exists, but there is no booking calendar, availability management, or booking approval flow for shortlet properties.

**Files affected (new):**
- `src/app/(dashboard)/seller/bookings/page.tsx` — booking list for shortlet properties
- `src/components/properties/BookingCalendar.tsx` — date range picker showing availability

**Database changes:** May need a `property_bookings` table (separate from `service_bookings`) with check-in/check-out dates, nightly rate, booking status.

**UI changes:** Calendar view on listing detail page, booking request form for buyers, approval flow for sellers.

**Risks:** HIGH complexity. Full booking flow includes payment, calendar sync, cancellation policy.

**Files affected (new):**
- `supabase/migrations/20260810000002_property_bookings.sql` — `property_bookings` table with RLS
- `src/components/properties/PropertyBookingForm.tsx` — buyer-facing date request form (client component)
- `src/app/(dashboard)/buyer/bookings/page.tsx` — buyer's own booking requests list

**Files modified:**
- `src/app/(dashboard)/seller/bookings/page.tsx` — wired to real data; per-listing calendar + approve/decline
- `src/app/(marketing)/properties/[id]/page.tsx` — shows `PropertyBookingForm` for `short_term` listings
- `src/lib/actions/properties.ts` — `requestPropertyBooking` + `respondToBooking` server actions

**Security:** `owner_id` always derived server-side from `properties` table; never accepted from client. Inserts use `createAdminClient()` after property ownership verification. RLS `propbook_select` enforces `renter_id = auth.uid() OR owner_id = auth.uid()` on all reads.

**Test checklist:**
- [x] Seller can see booking requests for their short_term properties only
- [x] Buyer can select dates and request a booking (check-in, check-out, optional notes)
- [x] Seller can confirm or decline pending booking requests
- [x] Confirmed/active booked dates show as unavailable on calendar

**Rollback:** Remove booking pages.

---

## Phase 6 — Agent Dashboard Completion ✅ COMPLETE

**Objective:** Give agents a complete workflow for managing listings, clients, and commissions.

**Dependencies:** Phase 1, Phase 3, Phase 5 (agents share seller listing pages).

**Completed:** 2026-08-11 — commit `feat(agent): complete Phase 6 agent dashboard`

---

### Task 6.1 — Agent dashboard home 🟡 MEDIUM | M ✅

**Problem:** `/agent` has no index page. The TrendingUp nav item goes nowhere.

**Files affected (new):**
- `src/app/(dashboard)/agent/page.tsx` — agent home: active listings count, pending commissions, total earned, commission rate, recent activity

**Database changes:** None.

**Test checklist:**
- [x] Agent home renders with correct stats
- [x] Commission totals are accurate

**Rollback:** Remove page.

---

### Task 6.2 — Agency management 🟡 MEDIUM | L ✅

**Problem:** `agencies` table and `agent_profiles.agency_id` FK exist. Agents can belong to an agency, but there is no UI to create an agency, join an agency, or view agency-level stats.

**Files affected (new):**
- `src/app/(dashboard)/agent/agency/page.tsx` — agency profile view/edit (server component + AgencyForms client component)
- `src/components/agent/AgencyForms.tsx` — create/join/update forms
- `src/lib/actions/auth.ts` — added `createAgency`, `joinAgency`, `updateAgency` actions

**Database changes:** None (table exists). RLS `agencies_insert` (owner_id = auth.uid()) and `agent_prof_own` (id = auth.uid()) allow user-scoped writes.

**UI changes:** Agency info card, owner/member badge, create/join tab switcher, update form for owners.

**Test checklist:**
- [x] Agent can create an agency
- [x] Agent can update agency details
- [x] Agency is associated with agent's profile

**Rollback:** Remove agency pages and the three actions from auth.ts.

---

### Task 6.3 — Client management 🟢 LOW | M ✅

**Problem:** Agents need to track the buyers they are representing. No client management page exists.

**Files affected (new):**
- `src/app/(dashboard)/agent/clients/page.tsx` — client list aggregated from property_inquiries on agent-owned listings

**UI changes:** Client cards with name, email, phone, inquiry count, properties inquired about. Scoped to `owner_id = profile.id` to satisfy propinq_select RLS.

**Test checklist:**
- [x] Agent sees buyers who have sent inquiries on their listings
- [x] Clicking a client shows their inquiry history

**Rollback:** Remove page.

---

## Phase 7 — Vendor Dashboard Completion

**Objective:** Build the complete vendor product management and order management system. The schema is fully ready; only the UI is missing.

**Dependencies:** Phase 1, Phase 3 (vendor approval fix Task 1.2), Phase 15 (public marketplace) should follow this phase.

---

### Task 7.1 — Product management CRUD 🔴 HIGH | XL

**Problem:** Vendors have no UI to create, edit, or delete products. The `products`, `product_categories`, `product_images`, `product_variants` tables all exist but have zero UI coverage.

**Files affected (new):**
- `src/app/(dashboard)/vendor/products/page.tsx` — paginated list of vendor's products with status, price, stock
- `src/app/(dashboard)/vendor/products/new/page.tsx` — product creation form
- `src/app/(dashboard)/vendor/products/[id]/edit/page.tsx` — product edit form
- `src/components/properties/forms/ProductForm.tsx` — reusable product form with category select, price, unit, stock, description, image upload
- `src/lib/actions/` — new file `src/lib/actions/vendor.ts` with `createProduct`, `updateProduct`, `deleteProduct`, `toggleProductAvailability`
- `src/lib/validations/` — new `product.ts` Zod schema

**Database changes:** None. Tables and RLS already exist.

**Storage:** Uses existing `marketplace-products` bucket.

**UI changes:** Product list with image thumbnail, title, price, stock, available toggle. Create/edit form with image upload (up to 5 images), category tree select, price + unit, stock quantity, variants (size/color/etc.).

**Risks:** MEDIUM. Image upload to `marketplace-products` bucket requires confirming RLS allows vendor write. Multi-image upload pattern follows existing `ImageUpload` component.

**Test checklist:**
- [ ] Vendor can create a product with images
- [ ] Product appears in vendor's product list
- [ ] Vendor can edit product details
- [ ] Vendor can toggle availability
- [ ] Vendor cannot edit another vendor's product (RLS check)
- [ ] Product images upload to `marketplace-products` bucket

**Rollback:** Remove new pages and action file.

---

### Task 7.2 — Order management 🔴 HIGH | L

**Problem:** Vendors have no UI to see or manage orders. The `orders` and `order_items` tables exist and are subscribed to Realtime, but there is no order inbox.

**Files affected (new):**
- `src/app/(dashboard)/vendor/orders/page.tsx` — paginated list of orders with status filter
- `src/app/(dashboard)/vendor/orders/[id]/page.tsx` — order detail: buyer info, items, total, actions (confirm, ship, deliver)
- `src/components/payments/OrderCard.tsx` — order summary card
- `src/lib/actions/vendor.ts` — add `updateOrderStatus(orderId, status)` action

**Database changes:** None.

**UI changes:** Order list by status (pending/confirmed/processing/shipped/delivered). Order detail with line items, buyer address, total. Status update buttons.

**Risks:** MEDIUM. Order status transitions must be validated (cannot go backward).

**Test checklist:**
- [ ] Vendor sees only their own orders
- [ ] Vendor can move order from confirmed → processing → shipped → delivered
- [ ] Buyer receives notification on status change (Phase 17)
- [ ] RLS prevents vendor from seeing other vendors' orders

**Rollback:** Remove pages and action.

---

## Phase 8 — Contractor Dashboard Completion

**Objective:** Build the full professional service flow for contractors. The profile setup exists; service listing, request management, quotation, and portfolio are entirely missing.

**Dependencies:** Phase 1, Phase 3 (verification must work for contractors), Phase 18 (reviews unlock after service completion).

---

### Task 8.1 — Portfolio management 🟡 MEDIUM | L

**Problem:** `portfolio_items` and `portfolio_images` tables exist. The `service-portfolios` storage bucket exists. No UI to add or view portfolio projects.

**Files affected (new):**
- `src/app/(dashboard)/contractor/portfolio/page.tsx` — list of portfolio items with photos
- `src/components/dashboard/PortfolioForm.tsx` — add/edit project: title, description, project_type, completed_at, client_name, city, images
- `src/lib/actions/profile.ts` — add `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem` actions

**Database changes:** None.

**Storage:** `service-portfolios` bucket.

**UI changes:** Portfolio gallery grid. Add Project form. Image upload (up to 10 images per project). Delete project confirmation dialog.

**Test checklist:**
- [ ] Contractor can add a portfolio project with photos
- [ ] Portfolio displays on contractor's public profile
- [ ] Contractor can delete a project
- [ ] Images upload to `service-portfolios` bucket

**Rollback:** Remove pages and actions.

---

### Task 8.2 — Service request management 🔴 HIGH | XL

**Problem:** `service_requests`, `service_quotations`, `service_contracts` tables all exist. This is the core professional services revenue flow. Without it, no professional can earn money through the platform, reviews cannot be triggered, and escrow for services cannot be used.

**Files affected (new):**
- `src/app/(dashboard)/contractor/requests/page.tsx` — incoming service requests matching contractor's specializations/city
- `src/app/(dashboard)/contractor/requests/[id]/page.tsx` — request detail + quotation form
- `src/app/services/new/page.tsx` — client (any role) posts a service request
- `src/app/services/page.tsx` — browse posted service requests (client view) + professional view
- `src/app/services/[id]/page.tsx` — service request detail with quotations list
- `src/components/services/ServiceRequestForm.tsx` — client posts request: title, description, category, city, budget_range, deadline
- `src/components/services/QuotationForm.tsx` — professional submits quote: price, delivery_days, message
- `src/components/services/ServiceRequestCard.tsx` — card view of a request
- `src/lib/actions/services.ts` — new file: `createServiceRequest`, `submitQuotation`, `acceptQuotation`, `completeService`, `cancelService`
- `src/lib/validations/service.ts` — Zod schemas

**Database changes:** None. All tables exist.

**API changes:** None.

**UI changes:**
- Client: Post service request form → see quotations → accept one → track progress → mark complete → review professional
- Professional: See matching requests → submit quote → track accepted work → receive payment

**Risks:** HIGH. This is the most complex feature in the platform. It touches service_requests, service_quotations, service_contracts, escrow (payment), reviews (on completion). Build in this order: request posting → quotation submission → quotation acceptance → completion → review gate. Do NOT build all at once.

**Test checklist:**
- [ ] Client can post a service request
- [ ] Request appears in contractor's incoming requests (by specialization/city match)
- [ ] Contractor can submit a quotation
- [ ] Client can see all quotations for their request
- [ ] Client can accept one quotation (others are auto-declined)
- [ ] Accepted quotation creates a service_contract
- [ ] Client can mark service as completed
- [ ] Completed service unlocks `createReview`
- [ ] RLS prevents contractors from seeing other contractors' non-public requests

**Rollback:** Remove all service action files and page files. DB tables retain data but are inaccessible from UI.

---

## Phase 9 — Engineer Dashboard Completion

**Objective:** Same as Phase 8 but for engineers. Because engineers use `ProfessionalDashboard` and `professional_profiles` identically, all Phase 8 tasks apply directly.

**Dependencies:** Phase 8 (build once, share across all professional roles).

### Task 9.1 — Engineer service flow 🟡 MEDIUM | XS

Since engineer, architect, and lawyer all use `profession_type` to differentiate within the same tables (`professional_profiles`, `service_listings`, `service_requests`), Phase 8 tasks (Tasks 8.1, 8.2) fully cover engineers. The only engineer-specific work is:

- **Files affected:** Update ROLE_NAV for engineer to include "My Requests" and "Portfolio" links (identical to contractor)
- **Specializations displayed:** Structural Engineering, Civil Engineering, Soil Testing, Project Supervision, Bill of Quantities, Mechanical, Electrical

All other work is shared with Phase 8.

---

## Phase 10 — Architect Dashboard Completion

**Dependencies:** Phase 8.

### Task 10.1 — Architect service flow 🟡 MEDIUM | XS

Same as Task 9.1. Specializations: Residential Design, Commercial Design, Interior Design, Urban Planning, Landscape Design.

---

## Phase 11 — Lawyer Dashboard Completion

**Dependencies:** Phase 8.

### Task 11.1 — Lawyer service flow 🟡 MEDIUM | XS

Same as Task 9.1. Specializations: Property Law, Contract Law, Land Disputes, Conveyancing, Tenant Rights, Commercial Law.

**Additional consideration:** Legal document upload (contracts, title deeds) may require a `legal-documents` storage bucket with higher access controls. Review in Phase 24 (Security).

---

## Phase 12 — Property Manager Role

**Objective:** Add the `property_manager` role to manage properties on behalf of owners, collect rent, and handle tenant relations.

**Dependencies:** Phase 1, Phase 8 (uses service request infrastructure), Phase 22 (wallet/payment for rent collection).

---

### Task 12.1 — Add property_manager DB role 🟡 MEDIUM | M

**Problem:** `property_manager` is referenced in the Constitution but does not exist in the DB `user_role` enum, TypeScript types, or any code.

**Files affected:**
- `src/types/auth.ts` — add `'property_manager'` to UserRole
- `src/lib/nav-config.ts` — add ROLE_NAV for property_manager
- Migration: `ALTER TYPE user_role ADD VALUE 'property_manager'`
- `middleware.ts` — add protected prefix `/property-manager`
- `src/lib/utils/constants.ts` — add to ROLE_DASHBOARDS, ROLE_LABELS

**Database changes:**
- Migration: Add `'property_manager'` to `user_role` enum
- Migration: Create `property_manager_profiles` table: `(id uuid pk fk profiles, license_number text, managed_properties_count int default 0, rating_avg numeric, rating_count int, created_at timestamptz)`

**UI changes:** Property manager can register, onboard, and reach a dashboard at `/property-manager`.

**Test checklist:**
- [ ] A user can register as property_manager
- [ ] TypeScript compiles with new role
- [ ] Middleware routes `/property-manager/*` correctly
- [ ] Onboarding creates property_manager_profiles row

**Rollback:** Revert type changes and migration (ALTER TYPE ADD VALUE cannot be easily rolled back; test on dev first).

---

### Task 12.2 — Property Manager dashboard and features 🟢 LOW | XL

**Files affected (new):**
- `src/app/(dashboard)/property-manager/page.tsx` — overview
- `src/app/(dashboard)/property-manager/properties/page.tsx` — assigned properties
- `src/app/(dashboard)/property-manager/tenants/page.tsx` — tenant management

**Database changes:** May need `property_assignments` table linking PM to properties, and `lease_agreements` table.

**Risks:** HIGH complexity. Full tenant management is a sub-system on its own.

---

## Phase 13 — Maintenance Role

**Objective:** Add the `maintenance` role for property repair services.

**Dependencies:** Phase 12 (property management context), Phase 8 (reuses professional services infrastructure).

---

### Task 13.1 — Add maintenance DB role 🟡 MEDIUM | M

Same pattern as Phase 12. Role addition + dashboard stub.

**Files affected:** Same as Task 12.1 with `'maintenance'` as the new role.

**Database changes:** Migration to add `'maintenance'` to `user_role` enum. Maintenance likely shares `professional_profiles` with `profession_type = 'maintenance'` or gets its own profile table.

**Test checklist:**
- [ ] Maintenance role can register and onboard
- [ ] Dashboard accessible at `/maintenance`

---

### Task 13.2 — Maintenance work order flow 🟢 LOW | XL

Reuses service request infrastructure from Phase 8. Maintenance-specific: work order assignment by property manager, job completion photo upload, parts cost tracking.

---

## Phase 14 — Cleaning Services Role

**Objective:** Add the `cleaning_services` role.

**Dependencies:** Phase 13 (same infrastructure pattern).

---

### Task 14.1 — Add cleaning_services DB role 🟡 MEDIUM | M

Same pattern as Tasks 12.1 and 13.1.

**Database changes:** Migration to add `'cleaning_services'` to `user_role` enum.

**Test checklist:**
- [ ] Cleaning services role can register and onboard
- [ ] Dashboard accessible at `/cleaning-services`

---

## Phase 15 — Marketplace

**Objective:** Build the public-facing marketplace (building materials), equipment rental, jobs board, and tenders board. All DB schema is fully defined.

**Dependencies:** Phase 7 (vendors must be able to list products), Phase 8 (service requests infrastructure), Phase 21 (payment for orders).

---

### Task 15.1 — Public materials catalogue 🔴 HIGH | L

**Problem:** `/materials` is in `PUBLIC_ROUTES` but has no page. Vendors have products but buyers cannot browse them.

**Files affected (new):**
- `src/app/(marketing)/materials/page.tsx` — product catalogue with search, category filter, vendor filter, price range
- `src/app/(marketing)/materials/[slug]/page.tsx` — vendor store page
- `src/app/(marketing)/materials/[slug]/[productId]/page.tsx` — product detail with specifications, images, order form
- `src/components/marketplace/ProductCard.tsx` — product listing card
- `src/components/marketplace/ProductGrid.tsx` — responsive grid

**Database changes:** None.

**UI changes:** Hero with search bar. Category filter sidebar. Product grid. Product detail with image gallery (reuse PropertyGallery pattern), vendor info, price, unit, minimum order, add to cart button.

**Test checklist:**
- [ ] Public can browse products without login
- [ ] Category filter narrows results
- [ ] Product detail shows all specifications
- [ ] "Add to Cart" requires login
- [ ] Only `is_available = true` products shown

**Rollback:** Remove pages.

---

### Task 15.2 — Shopping cart and checkout 🔴 HIGH | XL

**Problem:** `cart_items` table exists but no cart UI. No checkout flow. Vendors cannot receive orders from the public.

**Files affected (new):**
- `src/app/(dashboard)/buyer/cart/page.tsx` — cart items list with quantity adjusters, remove, checkout button
- `src/app/(dashboard)/buyer/checkout/page.tsx` — checkout: delivery address, payment method, order summary
- `src/components/marketplace/CartItem.tsx`
- `src/hooks/marketplace/useCart.ts` — React Query hook
- `src/lib/actions/orders.ts` — new file: `addToCart`, `updateCartQuantity`, `removeFromCart`, `createOrder`, `cancelOrder`
- `src/lib/validations/order.ts` — Zod schema

**Database changes:** None.

**UI changes:** Cart icon in header showing item count. Cart sidebar or page. Checkout form. Order confirmation page.

**Risks:** HIGH. Checkout must create escrow (Phase 22) for payment security. Multi-vendor cart means multiple orders from one checkout (cart items are grouped by vendor).

**Test checklist:**
- [ ] Adding product to cart creates/updates cart_items row
- [ ] Cart shows correct item count and total
- [ ] Checkout creates orders and order_items rows
- [ ] Payment initiates escrow for order amount
- [ ] Vendor sees new order in their order management

**Rollback:** Remove cart and checkout pages.

---

### Task 15.3 — Equipment rental marketplace 🟢 LOW | XL

**Problem:** `rental_categories`, `rental_listings`, `rental_bookings` tables exist. `/rentals` is in PUBLIC_ROUTES but has no page.

**Files affected (new):**
- `src/app/(marketing)/rentals/page.tsx` — equipment and vehicle rental listings
- `src/app/(marketing)/rentals/[id]/page.tsx` — rental detail with booking form
- `src/lib/actions/rentals.ts` — `createRentalListing`, `createRentalBooking`, `updateRentalStatus`

**UI changes:** Rental grid with daily/weekly/monthly rates, availability calendar, booking form with date range selection.

**Test checklist:**
- [ ] Rental listings display with rates
- [ ] Date range booking form works
- [ ] Booking creates rental_bookings row
- [ ] Owner sees booking requests

**Rollback:** Remove pages and actions.

---

### Task 15.4 — Jobs board 🟢 LOW | L

**Problem:** `jobs`, `job_applications` tables exist. `/jobs` is in PUBLIC_ROUTES but has no page.

**Files affected (new):**
- `src/app/(marketing)/jobs/page.tsx` — job listing with type/location/budget filters
- `src/app/(marketing)/jobs/[id]/page.tsx` — job detail + application form
- `src/lib/actions/jobs.ts` — `createJob`, `applyToJob`, `updateJobStatus`

**UI changes:** Job cards with type, budget range, deadline. Application form. My applications list in applicable dashboards.

**Test checklist:**
- [ ] Public can browse jobs
- [ ] Authenticated user can apply to a job
- [ ] Job poster sees applications

**Rollback:** Remove pages and actions.

---

### Task 15.5 — Tenders board 🟢 LOW | L

**Problem:** `tenders`, `tender_bids` tables exist. Referenced in Constitution.

**Files affected (new):**
- `src/app/(marketing)/tenders/page.tsx` — tender notices
- `src/app/(marketing)/tenders/[id]/page.tsx` — tender detail + bid submission

**Note:** `tender-documents` storage bucket existence is uncertain (see DB schema notes). Verify before implementing.

**Test checklist:**
- [ ] Tenders list with deadline and budget
- [ ] Bid submission creates tender_bids row

**Rollback:** Remove pages.

---

## Phase 16 — Messaging

**Objective:** Build the real-time messaging system. All DB tables, Realtime subscriptions, and storage bucket already exist. This is entirely UI work.

**Dependencies:** Phase 1, Phase 17 (notifications for new messages), Phase 8 (service request conversations).

---

### Task 16.1 — Conversation list and message thread 🔴 HIGH | XXL

**Problem:** `conversations`, `conversation_participants`, `messages`, `message_attachments` tables exist with Realtime enabled. Zero UI coverage. Users cannot message each other despite the infrastructure being complete.

**Files affected (new):**
- `src/app/(dashboard)/messages/page.tsx` — conversation list with unread counts
- `src/app/(dashboard)/messages/[id]/page.tsx` — message thread with real-time updates
- `src/components/messaging/ConversationList.tsx` — list of conversations with last message preview and unread badge
- `src/components/messaging/MessageThread.tsx` — scrollable message list with sender avatar, timestamp, content
- `src/components/messaging/MessageInput.tsx` — text input with attachment button, send
- `src/components/messaging/AttachmentUpload.tsx` — file upload to `chat-attachments` bucket
- `src/hooks/messaging/useConversations.ts` — React Query hook with Realtime subscription
- `src/hooks/messaging/useMessages.ts` — React Query hook with Realtime subscription
- `src/lib/actions/messaging.ts` — new file: `createConversation`, `sendMessage`, `markConversationRead`, `uploadAttachment`

**Database changes:** None.

**Storage:** `chat-attachments` bucket exists.

**UI changes:**
- Sidebar: "Messages" nav item with unread count badge
- Conversation list: avatar, name, last message preview, timestamp, unread count
- Message thread: chat bubble layout (sender right, recipient left), timestamps, read receipts
- Message input: textarea that grows, attachment button, send on Enter

**Risks:** HIGH. Real-time messaging is the most technically complex UI in the platform. Use Supabase Realtime `channel.on('postgres_changes')` for message inserts. Handle optimistic updates for sent messages. File attachment upload must update `message_attachments` after storage upload completes.

**Test checklist:**
- [ ] User can start a new conversation with any other user
- [ ] Messages appear in real-time without page refresh
- [ ] Unread count updates when new message arrives
- [ ] Mark as read clears unread count
- [ ] File attachment uploads successfully and is viewable in thread
- [ ] Only conversation participants can read messages (RLS check)
- [ ] Message deleted (soft) shows "Message deleted"

**Rollback:** Remove all messaging pages, components, hooks, and actions.

---

### Task 16.2 — Context-linked conversations 🟡 MEDIUM | M

**Problem:** `conversations.related_entity_type` and `related_entity_id` support linking a conversation to a property or service request. The "Contact Seller" flow on property detail should create or open a conversation rather than just sending an inquiry form.

**Files affected:**
- `src/app/(marketing)/properties/[id]/page.tsx` — replace or supplement `PropertyInquiryForm` with "Message Seller" button
- `src/components/messaging/StartConversationButton.tsx` — creates conversation with context and redirects to `/messages/[id]`

**Test checklist:**
- [ ] "Message Seller" creates a conversation linked to the property
- [ ] Conversation appears in both seller's and buyer's message lists
- [ ] Conversation subject includes property title

**Rollback:** Keep PropertyInquiryForm as primary.

---

## Phase 17 — Notifications

**Objective:** Build the in-app notification inbox and wire all platform events to insert notification rows. The `notifications` table and some inserts already exist.

**Dependencies:** Phase 1, Phase 16 (messaging triggers notifications).

---

### Task 17.1 — Notification inbox page 🔴 HIGH | L

**Problem:** `notifications` table exists. Some notifications are written (admin approvals). No notification inbox page exists anywhere in the dashboard. Users have no way to see notifications.

**Files affected (new):**
- `src/app/(dashboard)/account/notifications/page.tsx` — notification list with type icons, title, body, timestamp, read/unread state, action_url link
- `src/components/notifications/NotificationList.tsx`
- `src/components/notifications/NotificationItem.tsx`
- `src/hooks/notifications/useNotifications.ts` — React Query hook with Realtime subscription

**Files affected (existing):**
- `src/components/layout/DashboardSidebar.tsx` — add unread notification count badge to a Bell icon in the sidebar header
- `src/lib/actions/auth.ts` — add `markNotificationRead(id)` and `markAllNotificationsRead()` actions

**Database changes:** None.

**UI changes:** Notification bell icon in sidebar with red unread badge. Notifications page with all/unread filter, type icons (message=Chat, payment=Wallet, verification=Shield, etc.), "Mark all as read" button.

**Test checklist:**
- [ ] Notification bell shows correct unread count
- [ ] Notifications page lists all user's notifications
- [ ] Clicking a notification marks it read and navigates to action_url
- [ ] "Mark all as read" sets all notifications' is_read = true
- [ ] Real-time: new notification count increments without page refresh

**Rollback:** Remove notification pages and the bell badge from sidebar.

---

### Task 17.2 — Wire notification inserts across all events 🟡 MEDIUM | L

**Problem:** Most platform events do not insert notification rows. Admin approval does, but: property inquiry received, new message, new quotation, order status change, escrow funded/released, service completed — all missing.

**Files affected:**
- `src/lib/actions/properties.ts` — insert notification on new inquiry to property owner
- `src/lib/actions/services.ts` — insert notifications: new request (to matching professionals), new quotation (to client), quotation accepted (to professional), service completed (to both)
- `src/lib/actions/escrow.ts` — insert notifications: escrow funded (to payee), escrow released (to payee), dispute filed (to both + admin)
- `src/lib/actions/vendor.ts` — insert notification: new order (to vendor), order status change (to buyer)
- `src/lib/actions/messaging.ts` — insert notification: new message (to recipient, if not in conversation)
- `src/lib/actions/auth.ts` — insert notification: account reactivated (to user)

**Database changes:** None.

**UI changes:** None (notifications surface in inbox built in Task 17.1).

**Test checklist:**
- [ ] Sending a property inquiry creates notification for property owner
- [ ] Receiving a message creates notification for recipient
- [ ] Escrow funding creates notification for payee
- [ ] All notification types display correct icon in inbox

**Rollback:** Remove the notification INSERT statements from each action (notifications are additive; no cascade effects).

---

### Task 17.3 — Notification preferences page 🟢 LOW | M

**Problem:** `notification_preferences` table exists with email/push/SMS toggles but no UI to manage them.

**Files affected (new):**
- `src/app/(dashboard)/account/notifications/preferences/page.tsx` — preferences form
- `src/lib/actions/auth.ts` — add `updateNotificationPreferences` action

**UI changes:** Toggle switches for email notifications, push notifications, SMS notifications. Per-type granular controls.

**Test checklist:**
- [ ] User can toggle email notifications
- [ ] Preferences persist after page reload
- [ ] Disabling push notifications prevents push sends (Phase 17.4 gate)

**Rollback:** Remove preferences page.

---

### Task 17.4 — Push notification dispatch 🟢 LOW | L

**Problem:** `profiles.expo_push_token` is stored but never used. No push notification dispatch logic exists.

**Files affected (new):**
- `src/lib/push/expo.ts` — Expo Push Notifications API client
- Integrate push dispatch calls in all notification INSERT points (Task 17.2)

**API changes:** External: Expo Push Notifications API (HTTPS).

**Risks:** MEDIUM. Requires Expo Push token registration on mobile app side. Mobile app does not exist yet (Phase 12+ dependency). This task only implements the server-side dispatch; actual delivery requires the mobile app.

**Test checklist:**
- [ ] Push notification sent when `expo_push_token` is set and push_notifications preference is enabled
- [ ] Invalid tokens handled gracefully (Expo returns an error code — log and remove stale token)

**Rollback:** Remove expo.ts and push dispatch calls.

---

## Phase 18 — Reviews Completion

**Objective:** Complete the review system. The `createReview` action and display components exist, but reviews are currently inoperable because they are gated on `service_requests.status = 'completed'` and that flow has no UI.

**Dependencies:** Phase 8 (service request flow must be built first — this is the hard prerequisite), Phase 17 (review notifications).

---

### Task 18.1 — Unlock review flow after service completion 🔴 HIGH | XS

**Problem:** Once Phase 8 (service request flow) is built, `createReview` already has the correct gate (`service_requests.status = 'completed'`). The `/account/reviews` page already shows pending reviews. This task connects the completed service to the review prompt.

**Files affected:**
- `src/app/(dashboard)/account/reviews/page.tsx` — already queries completed service_requests; this becomes functional automatically once services are built
- `src/lib/actions/reviews.ts` — verify no additional changes needed

**Database changes:** None.

**UI changes:** None (page already built; the data just wasn't available before).

**Test checklist:**
- [ ] Completed service request appears in "Pending Reviews" list
- [ ] Submitting a review sets `reviews.is_verified = true` (since it's from a verified service)
- [ ] Rating trigger updates `professional_profiles.rating_avg` and `rating_count`
- [ ] Review appears on professional's public profile

**Rollback:** N/A (no code changes; this task just tracks that reviews become unblocked).

---

### Task 18.2 — Review response UI 🟡 MEDIUM | M

**Problem:** `review_responses` table exists. Professionals can respond to reviews, but there is no UI for this.

**Files affected (new):**
- `src/components/reviews/ReviewResponseForm.tsx` — response textarea + submit button
- `src/lib/actions/reviews.ts` — add `createReviewResponse(reviewId, body)` action

**Files affected (existing):**
- `src/components/reviews/ReviewCard.tsx` — show response below review if exists; show response form for the reviewed professional

**Database changes:** None.

**UI changes:** "Reply" button on review card for the reviewed professional. Response displayed below review indented.

**Test checklist:**
- [ ] Professional can reply to their own reviews
- [ ] Non-professional cannot reply to reviews about others
- [ ] Response appears indented below the review
- [ ] Only one response per review (unique constraint on `review_id` + `responder_id`)

**Rollback:** Remove ResponseForm and action.

---

### Task 18.3 — Reviews on property listings 🟢 LOW | M

**Problem:** Properties can theoretically be reviewed (polymorphic reviews table), but there is no review form on property detail pages.

**Files affected:**
- `src/app/(marketing)/properties/[id]/page.tsx` — add reviews section: `ReviewList` for existing reviews, `ReviewForm` for buyers who've completed a transaction on this property

**Database changes:** May need a gate: only buyers who funded escrow for this property can review it.

**Test checklist:**
- [ ] Property detail shows star rating and reviews
- [ ] Only eligible buyers see the review form
- [ ] Review submission updates property rating aggregate (or `properties.rating_avg` if column exists)

**Rollback:** Remove reviews section from property detail.

---

## Phase 19 — Verification Centre

**Objective:** This phase consolidates and completes all verification-related features. Most tasks were already captured in Phase 3 (Task 3.2). This phase adds the user-facing resubmission improvements and document expiry tracking.

**Dependencies:** Phase 1 (Tasks 1.1, 1.2, 1.3), Phase 3 (Task 3.2).

---

### Task 19.1 — Document expiry tracking 🟡 MEDIUM | M

**Problem:** `kyc_records` has an `expires_at` column, but no logic checks if documents are expired. A professional could have approved documents that have since expired without any re-verification prompt.

**Files affected:**
- `src/components/dashboard/VerificationBanner.tsx` — add expired state check
- `src/lib/actions/auth.ts` — add cron-like check or trigger to set status = 'expired' when `expires_at < now()`

**Database changes:** Optional migration: PostgreSQL cron job via `pg_cron` to run `UPDATE kyc_records SET status = 'expired' WHERE expires_at < now() AND status = 'approved'`.

**UI changes:** VerificationBanner new state: "Your verification has expired. Please resubmit your documents." with CTA.

**Test checklist:**
- [ ] User with expired documents sees expiry banner
- [ ] User can resubmit documents after expiry
- [ ] Admin sees expired records in verification list

**Rollback:** Remove expiry check. Users with expired docs continue to appear verified (current behavior).

---

### Task 19.2 — Verification history for users 🟢 LOW | M

**Problem:** Users cannot see their own KYC submission history. They only see the current state (VerificationBanner), not the history of submissions and decisions.

**Files affected:**
- `src/app/(dashboard)/account/verification/page.tsx` — add history section showing all kyc_records for this user ordered by submitted_at DESC

**UI changes:** Timeline of submissions: submitted date, status, reviewer notes, reviewed date.

**Test checklist:**
- [ ] User can see all their verification submissions
- [ ] Each submission shows status and reviewer notes if present

**Rollback:** Remove history section.

---

## Phase 20 — Wallet Completion

**Objective:** Complete wallet features. Core balance display and top-up exist. Missing: bank transfer option, wallet limits enforcement, Stripe integration.

**Dependencies:** Phase 1, Phase 21 (payments infrastructure).

---

### Task 20.1 — Enforce minimum withdrawal in UI 🟡 MEDIUM | XS

**Problem:** `platform_settings.min_withdrawal_xaf = 5000` exists but is not enforced in the `PayoutRequestForm`. Users can technically submit payout requests below the minimum.

**Files affected:**
- `src/components/payments/PayoutRequestForm.tsx` — read `min_withdrawal_xaf` from platform_settings and add Zod `.min()` validation
- `src/lib/actions/payments.ts` — add server-side check against `platform_settings.min_withdrawal_xaf`

**Database changes:** None.

**UI changes:** Minimum amount message below payout amount input.

**Test checklist:**
- [ ] Submitting payout below minimum shows validation error
- [ ] Server action rejects below-minimum payouts even if client validation is bypassed

**Rollback:** Remove the minimum check. Payouts below minimum can be submitted.

---

### Task 20.2 — Stripe payment integration 🟢 LOW | XL

**Problem:** `payment_provider` enum has `'stripe'` but `platform_settings.stripe_enabled = false`. Stripe is not integrated. International buyers cannot pay by card.

**Files affected (new):**
- `src/lib/payments/stripe.ts` — Stripe SDK client
- `src/app/api/payments/webhook/stripe/route.ts` — Stripe webhook handler
- `src/components/payments/StripeCheckout.tsx` — Stripe Elements UI component

**Files affected (existing):**
- `src/components/payments/PaymentMethodSelector.tsx` — add Stripe card option (shown only if `stripe_enabled = true`)
- `src/lib/actions/payments.ts` — add Stripe payment intent creation

**API changes:** External: Stripe API. Requires Stripe account + API keys in env vars.

**Risks:** HIGH. Stripe integration requires PCI compliance consideration. Stripe handles cardholder data, but webhook signature verification is critical.

**Test checklist:**
- [ ] Stripe checkout only shown when `stripe_enabled = true`
- [ ] Stripe payment intent created successfully
- [ ] Webhook verifies signature before processing
- [ ] Successful payment funds escrow or wallet

**Rollback:** Disable stripe_enabled setting. Remove Stripe SDK references.

---

## Phase 21 — Payments Completion

**Objective:** Harden the payment infrastructure. The MTN MoMo and Orange Money flows exist; this phase adds missing robustness, retry logic, and Stripe.

**Dependencies:** Phase 1, Phase 20 (wallet must work).

---

### Task 21.1 — Payment status polling hardening 🟡 MEDIUM | M

**Problem:** The client polls `/api/payments/status/[id]` to check transaction status. If the webhook never fires (network issue), the transaction stays `pending` indefinitely. No timeout or retry mechanism exists.

**Files affected:**
- `src/app/api/payments/status/[id]/route.ts` — add fallback: if > 5 minutes since created and still `pending`, attempt a status re-check from the payment provider API
- `src/lib/actions/payments.ts` — add `retryPaymentCheck(transactionId)` that re-queries the provider

**Database changes:** None.

**UI changes:** "Payment taking longer than expected" message shown if poll exceeds 3 minutes.

**Test checklist:**
- [ ] Payment status polling correctly reflects provider status
- [ ] Stale `pending` transactions trigger a provider re-check
- [ ] Failed transactions update to `failed` status

**Rollback:** Remove fallback re-check logic.

---

### Task 21.2 — Failed payment retry flow 🟡 MEDIUM | M

**Problem:** If a payment fails, the user has no retry button. They must start a new payment flow.

**Files affected:**
- `src/components/payments/WalletTopUpForm.tsx` — add "Retry" button for failed transactions
- `src/lib/actions/payments.ts` — add `retryPayment(originalTransactionId)` that creates a new transaction linked to the original

**UI changes:** Failed payment notification with "Try Again" CTA.

**Test checklist:**
- [ ] Failed transaction shows retry button
- [ ] Retry creates new transaction with same amount/method
- [ ] Original failed transaction stays as a historical record

**Rollback:** Remove retry button.

---

### Task 21.3 — Commission auto-payout 🟢 LOW | M

**Problem:** Agent commissions are manually approved and paid by admins. There is no auto-payout once escrow releases.

**Files affected:**
- `src/lib/actions/commissions.ts` — update `recordAgentCommission` to optionally auto-credit the agent wallet rather than requiring manual admin approval

**Database changes:** None.

**Business rule change:** Auto-payout removes admin control over commission timing. Keep as admin-approval only for now (lower risk). This task remains LOW priority.

---

## Phase 22 — Escrow Completion

**Objective:** Complete the escrow system. Core funded/released/disputed flow exists. Missing: admin dispute resolution UI, auto-release cron, milestone creation UI.

**Dependencies:** Phase 1, Phase 21 (payments), Phase 3 (admin tools).

---

### Task 22.1 — Admin dispute resolution 🔴 HIGH | L

**Problem:** `/admin/escrow` shows disputed escrows but there is no resolution UI. Admins cannot release funds to either party when a dispute exists.

**Files affected:**
- `src/app/(dashboard)/admin/escrow/[id]/page.tsx` — add dispute detail: parties, amount, dispute reason, action buttons (Release to Payer / Release to Payee / Request Evidence)
- `src/lib/actions/escrow.ts` — add `adminResolveDispute(escrowId, releaseToParty: 'payer' | 'payee', resolution_notes)` action using `createAdminClient()`

**Database changes:** None. `release_escrow()` SECURITY DEFINER RPC already handles the fund transfer.

**UI changes:** Dispute detail page with payer/payee info, amount, dispute reason (from dispute dialog), evidence section, "Release to Payer" and "Release to Payee" buttons, resolution notes textarea.

**Test checklist:**
- [ ] Admin can view all disputed escrows
- [ ] Admin can resolve dispute by releasing to payer (full refund)
- [ ] Admin can resolve dispute by releasing to payee (payment complete)
- [ ] Platform fee deducted correctly in both outcomes
- [ ] Resolution notes stored
- [ ] Both parties notified of resolution

**Rollback:** Remove admin escrow detail page.

---

### Task 22.2 — Escrow auto-release mechanism 🟡 MEDIUM | M

**Problem:** `escrow_accounts.auto_release_at` column and `platform_settings.escrow_auto_release_days = 30` exist but no background job actually auto-releases escrows when the date passes.

**Options:**
1. Supabase Edge Function triggered by pg_cron (every day at midnight)
2. Vercel Cron Job (Next.js cron route)

**Files affected (new):**
- `src/app/api/cron/escrow-auto-release/route.ts` — Next.js route called by Vercel Cron
- `src/lib/actions/escrow.ts` — add `processAutoReleases()` that queries escrows where `auto_release_at < now() AND status = 'funded'` and releases them

**API changes:** Vercel Cron configuration in `vercel.json`.

**Risks:** MEDIUM. Auto-release is irreversible. Must double-check `status = 'funded'` and `disputed_at IS NULL` before releasing. Log all auto-releases to admin_logs.

**Test checklist:**
- [ ] Cron job runs daily
- [ ] Escrows with `auto_release_at < now()` and `status = 'funded'` are auto-released
- [ ] Disputed escrows are NOT auto-released
- [ ] Auto-release logged to admin_logs
- [ ] Both parties notified

**Rollback:** Delete cron route and disable Vercel Cron schedule. No escrows are auto-released (current behavior).

---

### Task 22.3 — Milestone creation UI 🟡 MEDIUM | L

**Problem:** `escrow_milestones` table exists and the detail page shows milestones, but there is no UI to define milestones when creating an escrow.

**Files affected:**
- `src/components/payments/EscrowList.tsx` (or a new CreateEscrowForm component) — add milestone definition step
- `src/lib/actions/escrow.ts` — update `createEscrow()` to accept milestones array and insert `escrow_milestones` rows

**UI changes:** When creating escrow, user can add milestone steps with name, amount, expected completion date. Milestone list with "Mark Complete" button (client/payer approves each milestone).

**Test checklist:**
- [ ] Can create escrow with 1–5 milestones
- [ ] Milestone amounts must sum ≤ escrow total
- [ ] Payer can approve individual milestones
- [ ] Approving final milestone auto-triggers escrow release

**Rollback:** Remove milestone creation step from CreateEscrowForm.

---

## Phase 23 — Analytics

**Objective:** Build analytics dashboards for admins and role-specific analytics for agents, vendors, and professionals.

**Dependencies:** Phase 3 (admin system), Phase 7 (vendor products), Phase 8 (service requests), Phase 17 (notification data).

---

### Task 23.1 — Admin analytics dashboard 🟡 MEDIUM | L

**Problem:** Admin sees static metric counts on the dashboard. No time-series data, no trends, no revenue charts.

**Files affected (new):**
- `src/app/(dashboard)/admin/analytics/page.tsx` — analytics page with charts
- `src/components/admin/ReportChart.tsx` — wrapper around a lightweight chart library (Chart.js or Recharts)

**Database changes:** May need a `SELECT date_trunc('day', created_at) AS day, COUNT(*) FROM ...` query pattern. Consider a materialized view for performance.

**UI changes:** Line chart for new users over time (30/60/90 days). Bar chart for properties by status. Revenue trend (transactions total by week). Top professionals by rating. Active escrows by status.

**Risks:** LOW. Read-only page. Chart library adds bundle size — use lazy import.

**Test checklist:**
- [ ] Charts render with real data
- [ ] Date range selector changes the chart data
- [ ] Revenue chart totals match sum of wallet_transactions

**Rollback:** Remove analytics page.

---

### Task 23.2 — Agent commission analytics 🟢 LOW | M

**Files affected:**
- `src/app/(dashboard)/agent/commissions/page.tsx` — add chart showing commission earnings over time

**Test checklist:**
- [ ] Commission chart shows correct monthly totals
- [ ] Chart updates when new commission is added

---

### Task 23.3 — Vendor sales analytics 🟢 LOW | M

**Files affected:**
- `src/app/(dashboard)/vendor/page.tsx` — add charts for product views, order conversions, revenue

---

## Phase 24 — Security Hardening

**Objective:** Audit and harden the platform's security posture. The existing security is strong but some gaps remain.

**Dependencies:** Phase 1 (all bug fixes), Phase 3 (admin system must be verified before hardening), Phase 26 (tests needed to confirm no regressions).

---

### Task 24.1 — Rate limiting on server actions 🔴 HIGH | L

**Problem:** Only password reset is rate-limited (`password_reset_rate_limits` table). Critical actions like `signUp`, `submitKycDocuments`, `createServiceRequest`, `sendMessage` have no rate limiting.

**Files affected:**
- `src/lib/utils/rateLimit.ts` — new utility using `password_reset_rate_limits` pattern or a new `rate_limits` table
- `src/lib/actions/auth.ts` — apply rate limit to `signUp` (5/hour per IP), `sendPasswordReset` (already limited), `recoverAccount` (3/day per IP)
- `src/lib/actions/messaging.ts` — apply rate limit to `sendMessage` (100/hour per user)
- `src/lib/actions/reviews.ts` — apply rate limit to `createReview` (5/day per user)

**Database changes:** Optional: generalize `password_reset_rate_limits` table into a generic `rate_limits(key TEXT, attempts INT, window_start TIMESTAMPTZ)` table.

**Risks:** MEDIUM. False positives can lock out legitimate users. Set conservative limits and log rejections.

**Test checklist:**
- [ ] `signUp` blocks after 5 attempts from same IP in 1 hour
- [ ] Rate limit error shows a user-friendly message ("Too many attempts, try again in X minutes")
- [ ] Rate limit resets after the window expires
- [ ] Admin actions are not rate-limited (service-role bypasses this)

**Rollback:** Remove rate limit calls. Actions become unlimited again.

---

### Task 24.2 — Content Security Policy headers 🟡 MEDIUM | M

**Problem:** No `Content-Security-Policy` header is set. XSS attacks via injected scripts are not mitigated at the HTTP layer.

**Files affected:**
- `next.config.ts` — add `headers()` function with CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

**Risks:** MEDIUM. A strict CSP can break legitimate functionality (e.g., Google Fonts, Supabase CDN). Start with `Content-Security-Policy-Report-Only` to detect violations before enforcing.

**Test checklist:**
- [ ] CSP header present on all pages
- [ ] No CSP violations in browser console (test all major flows)
- [ ] Google Fonts load correctly
- [ ] Supabase Realtime WebSocket allowed
- [ ] Image uploads to Supabase Storage allowed

**Rollback:** Remove `headers()` from next.config.

---

### Task 24.3 — Audit `createAdminClient()` usage 🔴 HIGH | S

**Problem:** `createAdminClient()` (service-role key) bypasses RLS. Any misuse exposes all data. Every call must be reviewed.

**Files affected:**
- All files that import `createAdminClient` — search: `grep -r 'createAdminClient' src/`
- Verify each call is: (a) in a server action, (b) immediately preceded by a role check, (c) not in any component file

**Database changes:** None. **UI changes:** None. This is a code review task.

**Test checklist:**
- [ ] No `createAdminClient` in any `*.tsx` client component file
- [ ] Every `createAdminClient` call is preceded by `profile.role !== 'admin'` guard
- [ ] `createAdminClient` not exposed in any API route that lacks auth verification

**Rollback:** N/A (code audit; no changes unless a vulnerability is found).

---

### Task 24.4 — Input sanitization for rich text fields 🟡 MEDIUM | M

**Problem:** `properties.description`, `service_requests.description`, `forum_posts.content` can contain user-supplied text displayed in the UI. While React prevents XSS by default, verify no `dangerouslySetInnerHTML` is used with unsanitized data.

**Files affected:**
- Search codebase for `dangerouslySetInnerHTML`
- If any found, wrap with DOMPurify or equivalent sanitizer

**Test checklist:**
- [ ] No `dangerouslySetInnerHTML` with unsanitized user content
- [ ] Script tags in description fields are escaped in output

**Rollback:** N/A (audit; no changes unless vulnerability found).

---

### Task 24.5 — Session timeout 🟢 LOW | M

**Problem:** No explicit session timeout. If a user leaves a tab open, their session remains indefinitely valid.

**Files affected:**
- `src/components/layout/providers/AuthProvider.tsx` — add inactivity detection (track last interaction timestamp; if > 30 minutes of inactivity, call `signOut`)

**UI changes:** Inactivity warning dialog: "You've been inactive for 25 minutes. Click to stay signed in."

**Test checklist:**
- [ ] Warning appears at 25-minute mark
- [ ] Session auto-terminates at 30 minutes of inactivity
- [ ] Active use resets the inactivity timer

**Rollback:** Remove inactivity detection.

---

## Phase 25 — Performance

**Objective:** Optimize the platform for production-level traffic. The current architecture is correct but has known performance improvement opportunities.

**Dependencies:** All feature phases (don't optimize until feature-complete or the optimizations will be premature).

---

### Task 25.1 — Incremental Static Regeneration for property listings 🟡 MEDIUM | M

**Problem:** `/properties` and `/properties/[id]` are fully dynamic (server components that run on every request). Properties don't change that frequently — caching them would dramatically reduce DB load.

**Files affected:**
- `src/app/(marketing)/properties/page.tsx` — add `export const revalidate = 60` (60-second ISR)
- `src/app/(marketing)/properties/[id]/page.tsx` — add `export const revalidate = 300` (5-minute ISR)

**Risks:** LOW. ISR means stale data for up to the revalidation period. For property pricing/status this is acceptable. For `active` → `sold` status, ensure admin property moderation triggers `revalidatePath`.

**Test checklist:**
- [ ] Property list page loads from cache on second visit
- [ ] Cache invalidates within 60 seconds for list, 5 minutes for detail
- [ ] Approving a property from admin triggers revalidation of the listing

**Rollback:** Remove `export const revalidate`. Pages return to fully dynamic.

---

### Task 25.2 — N+1 query elimination 🟡 MEDIUM | M

**Problem:** Several pages make multiple sequential Supabase queries where a single JOIN would suffice. Most notable: admin users page fetches all profiles then does individual queries per user for role profile data.

**Files affected:**
- `src/app/(dashboard)/admin/users/page.tsx` — replace N individual role profile queries with a single LEFT JOIN
- `src/app/(dashboard)/admin/professionals/page.tsx` — same pattern

**Database changes:** None (queries, not schema).

**Test checklist:**
- [ ] Admin users page loads faster (measure: < 500ms vs current)
- [ ] All data still displays correctly

**Rollback:** Revert query changes.

---

### Task 25.3 — Image optimization 🟡 MEDIUM | M

**Problem:** Property images are served from Supabase Storage without any transform pipeline. Large raw images are downloaded by browsers.

**Files affected:**
- `next.config.ts` — add Supabase Storage domain to `images.remotePatterns`
- `src/components/properties/PropertyCard.tsx` — ensure `sizes` prop is correctly set on `<Image>`
- Consider: Supabase Storage image transformations (built-in, add `?width=400&quality=80` suffix)

**Risks:** LOW.

**Test checklist:**
- [ ] Property cards load images at appropriate size for viewport
- [ ] Lighthouse LCP score improves
- [ ] WebP format served where browser supports it

**Rollback:** Remove image transform params.

---

### Task 25.4 — Bundle analysis and lazy imports 🟢 LOW | M

**Problem:** The app bundle has not been analyzed. Heavy components (PropertyGallery with Dialog, PropertyForm multi-step) may be included in pages that don't need them.

**Files affected:**
- `next.config.ts` — enable `@next/bundle-analyzer`
- Large client components — review for dynamic import opportunities (`dynamic(() => import(...), { ssr: false })`)

**Test checklist:**
- [ ] Bundle analyzer report shows no unexpected large dependencies
- [ ] PropertyGallery lightbox is lazy-loaded
- [ ] First page load JS size < 200KB gzipped

**Rollback:** Remove dynamic imports; revert to static imports.

---

### Task 25.5 — Database query indexes 🟡 MEDIUM | M

**Problem:** As data grows, queries on large tables without supporting indexes will degrade. Review the most common query patterns.

**Files affected:**
- Migration: Add composite index on `notifications(user_id, is_read, created_at DESC)` — supports unread count query
- Migration: Add index on `messages(conversation_id, created_at DESC)` — supports message thread load
- Migration: Add index on `service_requests(status, city)` — supports professional request discovery
- Migration: Add index on `orders(vendor_id, status, created_at DESC)` — supports vendor order list

**Database changes:** 4 new indexes (safe, additive).

**Risks:** LOW. Indexes add write overhead but significantly speed reads. Each migration is safe and reversible.

**Test checklist:**
- [ ] `EXPLAIN ANALYZE` on notification unread query uses new index
- [ ] Message thread query uses index
- [ ] No performance regression on writes

**Rollback:** Drop the new indexes.

---

## Phase 26 — Testing

**Objective:** Build a comprehensive test suite covering server actions, RLS policies, critical user flows, and performance. Some tests already exist (`src/lib/actions/*.test.ts`).

**Dependencies:** All phases (test after implementing, not before). Note: some test patterns can be written against existing functionality immediately.

---

### Task 26.1 — Expand unit tests for server actions 🔴 HIGH | L

**Problem:** Only 4 test files exist (`confirmEmail.test.ts`, `passwordResetRateLimit.test.ts`, `signUp.test.ts`, `updatePassword.test.ts`). All other server actions are untested.

**Files affected (new):**
- `src/lib/actions/auth.test.ts` — test: signIn, signOut, adminSuspendAccount, adminActivateAccount, adminAssignRole, adminApproveProfessional (all branches)
- `src/lib/actions/properties.test.ts` — test: createProperty (valid/invalid), updateProperty (ownership check), deleteProperty
- `src/lib/actions/escrow.test.ts` — test: createEscrow, disputeEscrow, completeMilestone
- `src/lib/actions/payments.test.ts` — test: initiatePayment, requestPayout
- `src/lib/actions/reviews.test.ts` — test: createReview (gate check, duplicate check)

**Test patterns:** Follow existing `signUp.test.ts` pattern (mock Supabase client, test validation and business logic paths).

**Test checklist:**
- [ ] All server actions have at least: happy path test, validation error test, permission check test
- [ ] Tests run in < 30 seconds total
- [ ] Tests pass in CI (GitHub Actions or similar)

**Rollback:** N/A (tests don't affect production).

---

### Task 26.2 — RLS policy integration tests 🔴 HIGH | L

**Problem:** Only `properties.rbac.test.ts` exists for RLS testing. All other table RLS policies are untested.

**Files affected (new):**
- `src/lib/actions/properties.rbac.test.ts` — already exists
- `tests/rls/profiles.test.ts` — buyer cannot read admin-only fields; admin can read all; user cannot update another user's row
- `tests/rls/kyc_records.test.ts` — user can only see own records; admin/moderator can see all
- `tests/rls/escrow_accounts.test.ts` — payer/payee can see own escrow; third party cannot
- `tests/rls/wallets.test.ts` — user can only see own wallet
- `tests/rls/notifications.test.ts` — user can only see own notifications
- `tests/rls/admin_logs.test.ts` — admin can see all; other roles cannot

**Test approach:** Run tests against a local Supabase Docker instance with seeded test users for each role.

**Test checklist:**
- [ ] Each RLS policy has at least one test for allowed access and one for denied access
- [ ] Test coverage includes: buyer, seller, agent, vendor, contractor, admin, moderator roles
- [ ] Tests catch the bucket name bug (Task 1.1) regression

**Rollback:** N/A.

---

### Task 26.3 — E2E tests for critical flows 🔴 HIGH | XL

**Problem:** No E2E test suite exists. Critical user flows (register → onboard → list property → admin approve → buyer inquire → escrow → release) are untested end-to-end.

**Files affected (new):**
- `tests/e2e/auth.spec.ts` — register, login, logout, password reset
- `tests/e2e/onboarding.spec.ts` — complete onboarding for each major role
- `tests/e2e/property.spec.ts` — create listing → admin approve → public browse → inquiry
- `tests/e2e/verification.spec.ts` — submit KYC → admin approve → account active
- `tests/e2e/escrow.spec.ts` — create escrow → fund → release
- `tests/e2e/admin.spec.ts` — admin dashboard → user management → moderation

**Framework:** Playwright (already referenced in session history with `chromium-cli` scripts).

**Database:** Test against local Supabase stack (`supabase start`). Seed test accounts for each role.

**Test checklist:**
- [ ] All E2E tests pass against local environment
- [ ] E2E tests can be run in CI against ephemeral Supabase project
- [ ] Test coverage includes all 6 critical user flows
- [ ] Tests are stable (no flakiness from timing issues)

**Rollback:** N/A.

---

### Task 26.4 — Performance tests 🟢 LOW | M

**Problem:** No performance benchmarks exist. The platform could be unacceptably slow under load.

**Files affected (new):**
- `tests/performance/property-browse.spec.ts` — Playwright load test: 50 concurrent users browsing properties
- Lighthouse CI configuration — run Lighthouse on every PR

**Test checklist:**
- [ ] `/properties` page loads < 2 seconds at p95 with 50 concurrent users
- [ ] Admin dashboard loads < 3 seconds
- [ ] Lighthouse performance score > 80 on mobile

**Rollback:** N/A.

---

### Task 26.5 — Validate migration history 🔴 HIGH | M

**Problem:** Remote Supabase project has 29 migrations applied via dashboard that have no local SQL files. `supabase db push` will fail. This blocks all future schema changes.

**Resolution approach:**
1. Run `supabase db pull` to generate local migration files from the remote schema
2. Reconcile with existing local migrations
3. Establish a policy: all future migrations must have a local SQL file BEFORE being applied to remote

**Files affected:**
- `supabase/migrations/` — new pulled migration file(s)
- `supabase/config.toml` — no changes needed

**Risks:** HIGH. Incorrect reconciliation could corrupt the migration history and make the remote DB unmanageable. Do this in a test branch first.

**Test checklist:**
- [ ] `supabase db push` succeeds with no "migration history conflict" error
- [ ] `supabase db diff` shows no untracked schema differences
- [ ] Local `supabase start` brings up a DB matching the remote schema

**Rollback:** Revert migration directory to pre-pull state. Remote DB is unaffected (pull is read-only).

---

## Dependency Graph Summary

```
Phase 1 (Bugs)
  ├── Phase 2 (Auth)
  ├── Phase 3 (Admin)
  │     ├── Phase 4 (Buyer)
  │     ├── Phase 5 (Seller)
  │     ├── Phase 6 (Agent)
  │     ├── Phase 7 (Vendor)
  │     │     └── Phase 15 (Marketplace)
  │     ├── Phase 8 (Contractor)
  │     │     ├── Phase 9 (Engineer)
  │     │     ├── Phase 10 (Architect)
  │     │     └── Phase 11 (Lawyer)
  │     │           └── Phase 18 (Reviews) ←── requires Phase 8
  │     └── Phase 12 (Property Manager)
  │           ├── Phase 13 (Maintenance)
  │           └── Phase 14 (Cleaning)
  ├── Phase 16 (Messaging)
  ├── Phase 17 (Notifications) ←── requires Phase 16
  ├── Phase 19 (Verification) ←── merged with Phase 3.2
  ├── Phase 20 (Wallet)
  │     └── Phase 21 (Payments)
  │           └── Phase 22 (Escrow)
  └── Phase 23 (Analytics) ←── requires Phase 7, 8, 17

Phase 24 (Security) ←── can start after Phase 1
Phase 25 (Performance) ←── after all features
Phase 26 (Testing) ←── parallel with all phases; E2E after all critical features
```

---

## Priority Summary

| Priority | Phase | Key Tasks |
|----------|-------|-----------|
| ✅ Complete | Phase 1 | Bug fixes (1.1–1.11) — all resolved 2026-07-17 |
| 🔴 Sprint 1 | Phase 3 | Verification centre, user detail actions |
| 🔴 Sprint 1 | Phase 5 | Seller inquiry inbox |
| 🔴 Sprint 2 | Phase 7 | Vendor product management |
| 🔴 Sprint 2 | Phase 8 | Service request flow |
| 🟡 Sprint 3 | Phase 16 | Messaging |
| 🟡 Sprint 3 | Phase 17 | Notifications |
| 🟡 Sprint 4 | Phase 15 | Public marketplace |
| 🟡 Sprint 4 | Phase 22 | Escrow completion |
| 🟡 Sprint 5 | Phase 4,5,6 | Dashboard completions |
| 🟡 Sprint 5 | Phase 23 | Analytics |
| 🟢 Sprint 6 | Phase 12,13,14 | New roles |
| 🟢 Sprint 6 | Phase 20,21 | Wallet/Payments completion |
| 🟢 Sprint 7 | Phase 24 | Security hardening |
| 🟢 Sprint 8 | Phase 25 | Performance |
| 🔴 Ongoing | Phase 26 | Testing (runs parallel with all) |

---

## Estimated Timeline

| Milestone | Phases | Estimated Duration |
|-----------|--------|------------------|
| Platform Stability | 1, 24 (partial), 26 (partial) | 1 week |
| Core Operations Complete | 3, 5 (inquiry), 7, 8 | 6 weeks |
| Full Platform (all roles) | 4–14, 16, 17, 18, 19 | 12 weeks |
| Marketplace Launch | 15 | 4 weeks |
| Hardened & Optimized | 20, 21, 22, 23, 24, 25, 26 | 6 weeks |
| **Total estimate** | All 26 phases | **~29 weeks** |

> Estimates assume one senior full-stack developer. A two-developer team would compress the timeline by approximately 35%.

---

## Changelog

### 2026-07-17
- **Task 3.5** ✅ — Added user search to `/admin/users`; `?q=` URL param; `query.or('email.ilike / full_name.ilike')`; search form with Clear link; subtitle and empty state contextualised; role/status/pagination links carry `q` — commit `d87adcd`
- **Task 3.6** ✅ — Added "Rejected" tab to `/admin/professionals`; queries `account_status = 'pending_verification'`, client-side filtered by `kyc_records[0].status === 'rejected'`; documents and review notes visible on the tab — commit `367d153`
- **Task 1.7** ✅ — Added `admin_logs` audit rows to `adminActivateAccount` (`action = 'activate_account'`) and `adminAssignRole` (`action = 'assign_role'`, `new_data: { role }`) — commit `8451de8`
- **Task 1.9** ✅ — Widened `revalidatePath('/admin/users')` to `'layout'` scope in all three admin user action functions — commit `8451de8`
- **Task 1.11** ✅ (new) — Fixed `property_status_history` missing `ON DELETE CASCADE`; extracted `DeletePropertyButton` client component with confirmation dialog — commit `9af1168`
- **Phase 1** ✅ — All 11 tasks resolved; phase declared complete

### 2026-07-15
- **Task 1.1** ✅ — KYC bucket name confirmed already correct (`verification-documents`); roadmap description validated — commit `703def9`
- **Task 1.4** ✅ N/A — Roadmap incorrectly named the column `metadata`; actual column is `new_data`; existing code was correct; no change made
- **Task 1.5** ✅ — `moderator` added to `UserRole` and all consuming structures; admin page guards extended; privilege-escalation blocked — commit `703def9`
- **Task 1.6** ✅ — `deactivated` added to `AccountStatus`; middleware signs out and redirects deactivated users — commit `703def9`
- **Task 1.8** ✅ — `__test_rls.mjs` confirmed absent from repository; no action needed

### 2026-07-14
- **Task 1.3** ✅ — `submitKycDocuments` resets `account_status` to `pending_verification` on resubmit — commit `e4d7e91`
- **Task 1.10** ✅ — `listing_type` enum aligned: `shortlet` → `short_term` across 6 files — commit `96dab94`

### 2026-07-13
- **Task 1.2** ✅ — `adminApproveProfessional` extended with `seller` and `vendor` branches — commit `a5f8551`
- Roadmap document created

---

*This roadmap must be updated whenever a task changes status or new requirements emerge. It is a living document governed by `00_PROJECT_CONSTITUTION.md`.*
