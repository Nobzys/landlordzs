# LANDLORDZS — Workflows Reference

Version: 1.0  
Source of truth: `src/lib/actions/`, `src/app/`, `supabase/migrations/`, `docs/02_DATABASE_SCHEMA.md`, `docs/03_USER_ROLES.md`  
Last updated: 2026-07-13

---

## Status Key

- ✅ **Implemented** — all steps functional, pages exist, server actions wired
- 🚧 **Partially Implemented** — backend/DB ready, some UI steps missing or stub
- 📋 **Planned** — schema and spec exist; no server actions or pages yet

---

## Table of Contents

1. [User Registration](#1-user-registration-)
2. [Login](#2-login-)
3. [Email Verification](#3-email-verification-)
4. [Password Reset](#4-password-reset-)
5. [Account Recovery (No Email Access)](#5-account-recovery-no-email-access-)
6. [Profile Completion / Onboarding](#6-profile-completion--onboarding-)
7. [KYC Submission](#7-kyc-submission-)
8. [Admin Approval — Professional/KYC](#8-admin-approval--professionalkyclc-)
9. [Buyer Journey](#9-buyer-journey-)
10. [Seller Journey](#10-seller-journey-)
11. [Agent Journey](#11-agent-journey-)
12. [Contractor Journey](#12-contractor-journey-)
13. [Engineer Journey](#13-engineer-journey-)
14. [Architect Journey](#14-architect-journey-)
15. [Lawyer Journey](#15-lawyer-journey-)
16. [Vendor Journey](#16-vendor-journey-)
17. [Property Posting](#17-property-posting-)
18. [Marketplace Product Posting](#18-marketplace-product-posting-)
19. [Service Posting](#19-service-posting-)
20. [Search & Discovery](#20-search--discovery-)
21. [Messaging](#21-messaging-)
22. [Notifications](#22-notifications-)
23. [Reviews & Ratings](#23-reviews--ratings-)
24. [Favorites](#24-favorites-)
25. [Property Viewing Requests](#25-property-viewing-requests-)
26. [Offers & Negotiation](#26-offers--negotiation-)
27. [Escrow Payment](#27-escrow-payment-)
28. [Wallet Top-Up](#28-wallet-top-up-)
29. [Withdrawal / Payouts](#29-withdrawal--payouts-)
30. [Admin Moderation](#30-admin-moderation-)
31. [Account Suspension](#31-account-suspension-)
32. [Account Appeals](#32-account-appeals-)
33. [Audit Logging](#33-audit-logging-)
34. [Summary](#34-summary)

---

## 1. User Registration ✅

**Trigger:** User clicks "Create Account" on `/register`.

### Step-by-step flow

1. User fills `RegisterForm` — full name, email, password, role selection (buyer/seller/agent/vendor/contractor/engineer/architect/lawyer)
2. Client submits form → calls `signUp(email, password, fullName, role)` server action
3. `signUp` → `supabase.auth.signUp({ email, password, options: { data: { full_name, role } } })`
4. Supabase Auth creates `auth.users` row; sends confirmation email with magic link
5. `on_auth_user_created` trigger fires AFTER INSERT on `auth.users` → `handle_new_user()` copies `full_name`, `role`, `email`, `avatar_url` from `raw_user_meta_data` into new `profiles` row (`account_status = 'pending_verification'`, `onboarding_completed = false`)
6. `on_profile_created` trigger fires AFTER INSERT on `profiles` → `handle_new_profile()` creates `wallets` row (balance = 0)
7. User sees "Check your email" confirmation UI
8. User clicks email link → Supabase redirects to `/api/auth/callback` → session established
9. Middleware detects `onboarding_completed = false` → redirects to `/onboarding`

### Pages involved

| Page | Role |
|------|------|
| `/register` | User fills registration form |
| `/api/auth/callback` | Supabase OAuth callback; sets session cookie |
| `/onboarding` | Post-registration profile setup |

### Database tables

| Table | Operation |
|-------|-----------|
| `auth.users` | INSERT by Supabase Auth |
| `profiles` | INSERT by `handle_new_user()` trigger |
| `wallets` | INSERT by `handle_new_profile()` trigger |

### Server actions

- `signUp` (`src/lib/actions/auth.ts`) — calls `supabase.auth.signUp()`

### Storage buckets

None at registration.

### Success path

`auth.users` created → `profiles` created (role set, `account_status = 'pending_verification'`) → `wallets` created → confirmation email sent → user lands on `/onboarding`

### Failure paths

| Failure | What happens |
|---------|-------------|
| Email already registered | Supabase returns `User already registered` error; form shows error message |
| `on_auth_user_created` trigger missing | `profiles` row not created; user stuck in loop (no profile → redirected to onboarding → no profile to read) — this was the pre-p1_fixes state |
| `on_profile_created` trigger missing | Wallet not created; wallet page shows 0 balance but no row to update |
| Email not confirmed | Session is not fully active; some RLS policies require confirmed email |

### Permissions

- `anon` role (unauthenticated) can call `signUp`
- RLS: `profiles` INSERT only via trigger (service-role path); direct INSERT by `anon` blocked

### Security checks

- Password strength: Supabase Auth enforces minimum length
- Email uniqueness: Supabase Auth enforces `auth.users.email` UNIQUE
- Role validation: Only `REGISTERABLE_ROLES` values accepted (admin cannot be selected)
- `handle_new_user()` reads from `raw_user_meta_data` — metadata is set by the application, not user-controlled

### Future improvements

- Captcha on registration form
- Phone number optional at registration
- Social sign-in (Google OAuth)
- Invite-only registration mode (for beta)

---

## 2. Login ✅

**Trigger:** User navigates to `/login` and submits credentials.

### Step-by-step flow

1. User enters email + password in `LoginForm`
2. Form submits → calls `signIn(email, password)` server action
3. `signIn` → `supabase.auth.signInWithPassword({ email, password })`
4. On success, reads `profiles.role`, `profiles.onboarding_completed`, `profiles.account_status`
5. `signIn` returns `{ role, onboarding_completed, account_status }` to client
6. Client-side redirect logic:
   - `account_status === 'suspended' || 'banned'` → server calls `signOut()` before returning; client redirects to `/login?error=account_suspended`
   - `onboarding_completed === false` → redirect to `/onboarding`
   - `account_status === 'pending_verification'` → redirect to `/account/pending`
   - Otherwise → redirect to `ROLE_DASHBOARDS[role]`
7. Middleware independently validates session on every request

### Pages involved

| Page | Role |
|------|------|
| `/login` | Credential entry |
| `ROLE_DASHBOARDS[role]` | Final destination |
| `/onboarding` | If onboarding incomplete |
| `/account/pending` | If awaiting verification |

### Database tables

| Table | Operation |
|-------|-----------|
| `auth.users` | SELECT by Supabase Auth (password validation) |
| `profiles` | SELECT role, account_status, onboarding_completed |

### Server actions

- `signIn` (`src/lib/actions/auth.ts`)

### Success path

Credentials valid → profile read → redirect to correct destination based on role + status

### Failure paths

| Failure | What happens |
|---------|-------------|
| Wrong password / email not found | Supabase returns `Invalid login credentials`; form shows error |
| Account suspended | `signIn` calls `signOut()`; returns `account_suspended` error; client redirects to `/login?error=account_suspended` |
| No profile row | `profile` null; user redirected to `/onboarding` via middleware (creates profile data on completion) |
| PKCE code verifier missing | Handled with dedicated error message (migration history: `c1481b9`) |
| Profile SELECT fails (pre-migration 20260714) | Error `42501` — `profiles` lacked `GRANT SELECT`; every user appeared as buyer — root cause of prior auth failure |

### Permissions

- `anon` can call `signIn`
- After login, Supabase sets `HttpOnly` session cookie; subsequent requests use `authenticated` role

### Security checks

- Rate limiting: Supabase Auth has built-in brute-force protection
- Suspended/banned check in `signIn` action before redirecting
- Middleware re-validates session on every protected route

### Future improvements

- "Remember me" extended sessions
- Multi-device session management
- Login activity notifications
- 2FA / TOTP support

---

## 3. Email Verification 🚧

**Trigger:** User registers → Supabase sends confirmation email → User clicks link.

### Step-by-step flow

1. On registration, Supabase sends confirmation email with a magic link pointing to `{SITE_URL}/api/auth/callback?code=...`
2. User clicks link → browser navigates to `/api/auth/callback`
3. Supabase exchanges `code` for session tokens (PKCE flow)
4. Session cookie set; user redirected to `/onboarding` (or saved `redirectTo` URL)
5. `profiles.email_confirmed` is implicitly tracked by Supabase Auth (`auth.users.email_confirmed_at`)

### What's missing

- `email_verifications` table (migration 0003) exists but no server actions write to it — custom email verification flow is not used; Supabase native flow handles it
- `/verify-email` page exists but is a placeholder — Supabase's email confirmation link goes to `/api/auth/callback`, not this page
- No resend-verification-email UI button in `/account` settings

### Pages involved

| Page | Role |
|------|------|
| `/verify-email` | Placeholder page (not currently used by Supabase callback) |
| `/api/auth/callback` | Supabase callback handler that exchanges code for session |
| `/auth/confirm` | Alternative confirmation page (exists in routes) |

### Database tables

| Table | Operation |
|-------|-----------|
| `auth.users` | UPDATE `email_confirmed_at` by Supabase Auth |
| `email_verifications` | Unused (📋 planned for custom flow) |

### Server actions

- `confirmEmail` (referenced in test file `src/lib/actions/confirmEmail.test.ts`) — may be a future custom flow

### Security checks

- Supabase token expiry (1-hour default for confirmation links)
- PKCE code verifier prevents token interception

### Future improvements

- Resend verification email button
- Custom-branded confirmation email template
- In-app banner prompting unverified users to confirm email

---

## 4. Password Reset ✅

**Trigger:** User clicks "Forgot password?" on `/login` or navigates to `/forgot-password`.

### Step-by-step flow

1. User enters email on `/forgot-password` (`ForgotPasswordForm`)
2. Form submits → `forgotPassword(email, ip)` server action
3. Rate limit check: `password_reset_attempts` table (service-role client)
   - SELECT count WHERE `email = $email AND created_at > now() - interval '15 minutes'` — must be < 3
   - SELECT count WHERE `ip = $ip AND created_at > now() - interval '15 minutes'` — must be < 3
4. If not rate-limited: INSERT into `password_reset_attempts` (email, ip)
5. `adminClient.auth.admin.generateLink({ type: 'recovery', email })` generates reset link
6. Email sent via Supabase's email provider (link → `/api/auth/callback?type=recovery&...`)
7. User receives email, clicks link → `/api/auth/callback` exchanges code for recovery session
8. User redirected to `/reset-password`
9. User enters new password in `ResetPasswordForm`
10. `supabase.auth.updateUser({ password: newPassword })` called
11. Session updated; user redirected to their dashboard

### Pages involved

| Page | Role |
|------|------|
| `/forgot-password` | Email input |
| `/reset-password` | New password input |
| `/api/auth/callback` | Code exchange; sets recovery session |

### Database tables

| Table | Operation |
|-------|-----------|
| `password_reset_attempts` | SELECT (rate limit check), INSERT (log attempt) |
| `auth.users` | UPDATE password hash (by Supabase Auth) |

### Server actions

- `forgotPassword` (`src/lib/actions/auth.ts`) — rate limit + email send
- `updatePassword` — calls `supabase.auth.updateUser({ password })`

### Storage buckets

None.

### Success path

Rate limit passes → attempt logged → reset email sent → user clicks link → new password set → session active → redirect to dashboard

### Failure paths

| Failure | What happens |
|---------|-------------|
| Email not found | Supabase silently succeeds (security: no user enumeration) |
| Rate limit exceeded (>3 per 15 min per email/IP) | Action returns error; email NOT sent |
| Expired reset link | Supabase Auth returns `token expired`; user must restart flow |
| User navigates to `/reset-password` without recovery session | `auth.getUser()` returns no user; `updateUser()` fails |

### Permissions

- `anon` can call `forgotPassword` (no auth required)
- `password_reset_attempts` has zero RLS policies — accessible only via service-role (`createAdminClient()`)

### Security checks

- IP + email based rate limiting (3 per 15 minutes)
- Uses `admin.generateLink()` via service-role — link generation never exposed to client
- `/reset-password` bypasses middleware's auth-route guard so recovery session can render the page (middleware special-case at line 41-43)

### Future improvements

- SMS OTP as alternative reset method
- Admin-triggered password reset from user detail page (`/admin/users/[id]`)
- Security alert email sent after password change

---

## 5. Account Recovery (No Email Access) ✅

**Trigger:** User cannot access their email and needs to recover account via support.

### Step-by-step flow

1. User navigates to `/account-recovery`
2. Fills form: full name, phone, alternative email, note
3. Submits → `submitAccountRecoveryRequest()` server action
4. INSERT into `account_recovery_requests` (expires in 7 days)
5. Admin reviews manually via Supabase Studio (no admin UI page yet)
6. Admin resolves via direct DB: UPDATE `status = 'resolved'` and manually resets password via `auth.admin.generateLink()`

### Pages involved

- `/account-recovery` — form page

### Database tables

| Table | Operation |
|-------|-----------|
| `account_recovery_requests` | INSERT (status = 'pending', expires_at = now() + 7 days) |

### Server actions

- `submitAccountRecoveryRequest` (`src/lib/actions/auth.ts`)

### Permissions

- No auth required — `anon` can submit
- `account_recovery_requests` has zero RLS policies — service-role only (read by admin via Studio)

### Future improvements

- Admin UI page to list and manage recovery requests
- Automated expiry (cron or pg_cron)
- Video identity verification for high-security recovery

---

## 6. Profile Completion / Onboarding ✅

**Trigger:** User has completed registration and email verification but `onboarding_completed = false`. Middleware redirects all non-onboarding routes to `/onboarding`.

### Step-by-step flow

**For Buyer (2 steps):**

1. **Step 1 — Basic Profile** (`BasicProfileStep`):
   - User fills: full name, display name, city, phone, bio, avatar
   - Submit → `updateBasicProfile()` → UPDATE `profiles` (name, display_name, city, phone, bio)
   - Avatar upload → Supabase storage `user-avatars/{user_id}/{uuid}` → UPDATE `profiles.avatar_url`
   - Click Next → Step 2

2. **Step 2 — Account Setup** (`RoleProfileStep`):
   - **Buyer**: Simple confirmation step → `completeOnboarding()` → UPDATE `profiles.onboarding_completed = true`
   - **Seller**: Store info input → calls dedicated step → `completeOnboarding()` → redirect to `/account/pending`
   - **Vendor**: Store name + slug → `completeVendorProfile()` → UPSERT `vendor_profiles` → UPDATE `profiles.account_status = 'pending_verification'` → `completeOnboarding()` → redirect to `/account/pending`

**For Professionals (agent/contractor/engineer/architect/lawyer) — 3 steps:**

1. **Step 1 — Basic Profile** (same as above)
2. **Step 2 — Role-Specific Setup** (`RoleProfileStep`):
   - **Agent**: License number, agency name, specialization, years experience → `completeAgentProfile()` → UPSERT `agent_profiles` → UPDATE `profiles.account_status = 'pending_verification'`
   - **Contractor/Engineer/Architect/Lawyer**: Company name, profession type, day rate, service areas, experience years → `completeProfessionalProfile()` → UPSERT `professional_profiles` → UPDATE `profiles.account_status = 'pending_verification'`
3. **Step 3 — KYC Upload** (`KycUploadStep`):
   - Upload national ID front + back; professionals also upload license/business certificate
   - Files uploaded to `verification-documents/{user_id}/{uuid}` storage bucket
   - `submitKycDocuments()` → INSERT `kyc_records` (level=1, status='pending')
   - `completeOnboarding()` → UPDATE `profiles.onboarding_completed = true`
   - Redirect to `/account/pending` (awaiting admin approval)

### Pages involved

| Page | Role |
|------|------|
| `/onboarding` | Host page; renders `OnboardingFlow` component |
| `/buyer/favorites` | Post-onboarding redirect for buyers |
| `/account/pending` | Post-onboarding redirect for all approval-required roles |

### Database tables

| Table | Operation |
|-------|-----------|
| `profiles` | UPDATE (basic profile fields, account_status, onboarding_completed) |
| `agent_profiles` | UPSERT (agents only) |
| `vendor_profiles` | UPSERT (vendors only) |
| `professional_profiles` | UPSERT (contractor/engineer/architect/lawyer) |
| `kyc_records` | INSERT (professionals/vendors only) |

### Server actions

- `updateBasicProfile` — UPDATE profiles
- `verifyPhoneOtp` — UPDATE profiles.phone, phone_verified (optional)
- `completeAgentProfile` — UPSERT agent_profiles, UPDATE account_status
- `completeVendorProfile` — UPSERT vendor_profiles, UPDATE account_status
- `completeProfessionalProfile` — UPSERT professional_profiles, UPDATE account_status
- `completeOnboarding` — UPDATE profiles.onboarding_completed = true
- `submitKycDocuments` — INSERT kyc_records

### Storage buckets

| Bucket | Used by |
|--------|---------|
| `user-avatars` | All roles (avatar upload, optional) |
| `verification-documents` | All approval-required roles (national ID + license) |

### Success path

All steps complete → `onboarding_completed = true` → buyer: `/buyer/favorites`; professionals/vendors/sellers: `/account/pending`

### Failure paths

| Failure | What happens |
|---------|-------------|
| Storage upload fails | Error shown; user can retry without restarting flow |
| `completeAgentProfile` errors | Step stays on screen; error message displayed |
| User closes browser mid-onboarding | `onboarding_completed` stays false; middleware sends them back to `/onboarding` on next visit; partial data preserved in DB |

### Permissions

- `authenticated` only (middleware enforces this)
- `profiles` UPDATE: restricted to own row; `WITH CHECK` prevents setting `role`, `is_verified`, `is_premium`, or `account_status` (except → `'pending_verification'`, which is explicitly allowed for onboarding)

### Security checks

- `account_status = 'pending_verification'` can be self-set only during onboarding (enforced by `profiles_update_own` WITH CHECK in migration `20260613000003`)
- KYC files validated: only JPEG/PNG/PDF accepted (storage bucket policy enforces mime types)
- Storage path includes `user_id` — users cannot upload to other users' paths (RLS: storage INSERT `USING (auth.uid() = user_id::uuid)`)

### Future improvements

- Save progress: allow users to resume mid-onboarding across devices
- In-app phone OTP verification (currently optional)
- Guided tour after first login
- Seller-specific onboarding step (currently missing `completeSellerProfile` action)

---

## 7. KYC Submission 🚧

**Trigger:** User (professional/seller/vendor) reaches Step 3 of onboarding, or returns to `/account/profile#identity-verification` to upload additional documents.

### Step-by-step flow

1. User is on KYC upload step in `/onboarding` OR on `/account/profile` verification section
2. User selects files: national ID front (required), national ID back (required), business license / professional certificate (required for professionals)
3. Each file uploaded to `verification-documents/{user_id}/{uuid}.ext` via Supabase storage client
4. Storage path returned → `submitKycDocuments({ nationalIdFrontPath, nationalIdBackPath, businessRegPath, level: 1 })` called
5. INSERT `kyc_records` (user_id, level=1, status='pending', national_id_front, national_id_back, business_reg, submitted_at=now())
6. User sees "Under Review" state

### What's missing

- Re-submission after rejection: no server action to update an existing `kyc_records` row back to `pending` (currently always INSERTs new row)
- File size validation UI (20 MB max enforced at storage policy level; no client-side feedback)
- Progress indicator for uploads

### Pages involved

| Page | Role |
|------|------|
| `/onboarding` (Step 3) | Primary KYC submission path |
| `/account/verification` | Secondary path for re-submission / status check |
| `/account/profile#identity-verification` | Link target from `/account/pending` page |

### Database tables

| Table | Operation |
|-------|-----------|
| `kyc_records` | INSERT (status='pending') |
| `profiles` | No direct write here (account_status was already set in Step 2) |

### Server actions

- `submitKycDocuments` (`src/lib/actions/auth.ts`)

### Storage buckets

- `verification-documents` (private) — path: `{user_id}/{uuid}.ext`

### Success path

Files uploaded → storage paths saved → `kyc_records` INSERT succeeds → user sees "pending review" notice

### Failure paths

| Failure | What happens |
|---------|-------------|
| File too large (> 20 MB) | Storage returns error; UI should show feedback (currently no explicit client error) |
| Wrong file type | Storage RLS rejects the MIME type; upload fails |
| Insert fails (DB constraint) | Error returned from server action; user can retry |
| Duplicate pending record | New record inserted anyway (no UNIQUE constraint on pending records — multiple pending rows possible) |

### Permissions

- `authenticated` only
- `kyc_records` INSERT: `kyc_own_insert` policy — `WITH CHECK (user_id = auth.uid())`
- `kyc_records` SELECT: `kyc_own_select` policy — `USING (user_id = auth.uid())`

### Security checks

- User cannot INSERT with a `user_id` different from their own (`kyc_own_insert` WITH CHECK)
- Storage INSERT: path must start with `auth.uid()` (bucket RLS policy)
- Admin/moderator can SELECT any record via `kyc_mod_all` policy — needed for review

### Future improvements

- Prevent multiple simultaneous pending submissions (UNIQUE constraint or status check)
- File preview in upload UI
- Liveness check (selfie with ID)
- OCR-assisted form fill from ID scan
- Automatic level upgrade (standard → enhanced) based on platform requirements

---

## 8. Admin Approval — Professional/KYC 🚧

**Trigger:** Admin navigates to `/admin/professionals` to review pending verification queue.

### Step-by-step flow

**View Queue:**
1. `/admin/professionals` page — `createAdminClient()` queries `profiles` (JOIN `kyc_records`, `professional_profiles`, `agent_profiles`) WHERE `role IN (approval-required roles) AND account_status = 'pending_verification' AND onboarding_completed = true`
2. For each user's KYC record, admin generates signed URL: `adminClient.storage.from('verification-documents').createSignedUrl(path, 3600)` — valid for 1 hour
3. Admin views documents (opens signed URL in browser)

**Approve:**
4. Admin clicks "Approve" → inline server action → `adminApproveProfessional(userId)` called
5. Action reads `profiles.role` via adminClient
6. Sets `profiles.account_status = 'active'`, `profiles.is_verified = true` via adminClient UPDATE
7. Branch on role:
   - `agent` → UPDATE `agent_profiles.license_verified = true`
   - `contractor | engineer | architect | lawyer` → UPDATE `professional_profiles.is_verified = true, professional_profiles.license_verified = true`
   - `seller` → ⚠️ No branch — sets `profiles` flags only (no `seller_profiles` table exists)
   - `vendor` → ⚠️ Missing branch — `vendor_profiles.is_verified` NOT updated (known gap R3 from `docs/03_USER_ROLES.md`)
8. Finds latest `kyc_records` row WHERE `user_id = userId AND status = 'pending'`  → UPDATE `status = 'approved', reviewed_by = adminId, reviewed_at = now()`
9. Page revalidated; user removed from pending queue
10. User's next login or page load reads new `account_status = 'active'` → redirected to their dashboard

**Reject:**
4. Admin clicks "Reject" → inline server action → `adminRejectProfessional(userId, reason)` called
5. Finds latest pending `kyc_records` → UPDATE `status = 'rejected', review_notes = reason`
6. INSERT `account_notices` (type='rejection', reason=reason, user_id=userId, created_by=adminId) via adminClient
7. User's `/account/pending` page shows rejection notice with reason

**Suspend (from professionals page):**
- Inline server action calls `adminSuspendAccount(userId, reason)` directly

### Pages involved

| Page | Role |
|------|------|
| `/admin/professionals` | Queue + approve/reject/suspend/reactivate/ban actions |
| `/admin/users/[id]` | Detailed user view with same actions |

### Database tables

| Table | Operation |
|-------|-----------|
| `profiles` | SELECT (queue filter), UPDATE (account_status, is_verified) |
| `kyc_records` | SELECT (latest pending), UPDATE (status, reviewed_by, reviewed_at, review_notes) |
| `agent_profiles` | UPDATE (license_verified) — agents only |
| `professional_profiles` | UPDATE (is_verified, license_verified) — contractor/engineer/architect/lawyer |
| `account_notices` | INSERT (type='rejection' on reject) |
| `admin_logs` | INSERT (currently not written by approve/reject — gap) |

### Server actions

- `adminApproveProfessional` (`src/lib/actions/auth.ts`)
- `adminRejectProfessional` (`src/lib/actions/auth.ts`)
- `adminSuspendAccount` (`src/lib/actions/auth.ts`)
- `adminActivateAccount` (`src/lib/actions/auth.ts`)
- `reviewVerification` (`src/lib/actions/properties.ts`) — used for property verifications, not KYC

### Storage buckets

- `verification-documents` — admin reads via signed URLs (3600s TTL)

### Success path (Approve)

Pending user → admin opens documents → clicks Approve → `profiles.account_status = 'active'` + `is_verified = true` → role-profile table updated → `kyc_records.status = 'approved'` → user can now create listings / access full features

### Failure paths

| Failure | What happens |
|---------|-------------|
| Signed URL fails (wrong bucket name) | Documents cannot be viewed; admin cannot make informed decision |
| `adminApproveProfessional` for `vendor` | Succeeds but `vendor_profiles.is_verified` stays `false` — bug (gap I1) |
| No `kyc_records` row | Action skips KYC update silently; `profiles` flags still set |
| Non-admin calls action | Action checks `callerProfile.role !== 'admin'` → returns error `'Insufficient permissions'` |

### Permissions

- Caller must have `profiles.role = 'admin'`
- All DB updates via `createAdminClient()` (service-role) — bypasses RLS
- `kyc_records` moderator access via `kyc_mod_all` policy (`is_moderator()`)

### Security checks

- Role check in every admin action (redundant with middleware but defense-in-depth)
- All writes via `adminClient` (service-role) — no user can forge these
- Signed URLs expire in 1 hour — documents not permanently accessible

### Future improvements

- Add `admin_logs` entries on approve/reject (currently missing)
- Add `account_notices` insert on approval (welcome/confirmation notice)
- Add `notifications` row to notify user of approval (planned in admin plan document)
- Handle `vendor` branch in `adminApproveProfessional`
- Handle `seller` explicitly with a notice
- "Request more info" action (needs `needs_more_info` enum value — planned)
- Property verification review page (`/admin/properties`) — separate workflow already exists

---

## 9. Buyer Journey 🚧

**Trigger:** User registers as Buyer or is redirected to buyer dashboard.

### End-to-end journey

1. Register → Onboarding (basic profile only) → `completeOnboarding()` → `/buyer/favorites`
2. Browse properties at `/properties` (page exists but is mostly public)
3. View property detail at `/properties/[id]`
4. Toggle favorite → `toggleFavorite(propertyId)` → INSERT/DELETE `property_favorites`
5. Send inquiry via `PropertyInquiryForm` → `submitInquiry(propertyId, data)` → INSERT `property_inquiries`
6. Browse `/account/wallet` (view balance)
7. Create escrow for a property purchase → `createEscrow()` → INSERT `escrow_accounts`
8. Fund escrow → `fundEscrow()` → wallet debited
9. Release escrow after receiving property keys/docs → `releaseEscrow()` → seller receives funds
10. Write review for agent via `/account/reviews` (after service_request completed)

### Pages involved

`/buyer/favorites`, `/properties`, `/properties/[id]`, `/account/wallet`, `/account/escrow`, `/account/escrow/[id]`, `/account/reviews`, `/account/transactions`

### Key tables

`profiles`, `property_favorites`, `property_inquiries`, `properties`, `wallets`, `escrow_accounts`, `escrow_milestones`, `escrow_events`, `wallet_transactions`, `reviews`

### Status

- `/buyer/favorites` — ✅ page exists, `FavoritesGrid` component renders favorites
- Property browse/detail — ✅ page exists with inquiry form
- Favorites toggle — ✅ `toggleFavorite` implemented
- Inquiries — ✅ `submitInquiry` implemented
- Wallet, Escrow — 🚧 pages exist, UI components exist; wallet top-up flow needs payment provider integration
- Reviews — 🚧 page + action exist; gated on `service_requests.status = 'completed'` (no service request flow yet for buyers)

---

## 10. Seller Journey 🚧

**Trigger:** User registers as Seller, completes onboarding, awaits approval.

### End-to-end journey

1. Register as Seller → Onboarding (basic profile + KYC upload) → `/account/pending`
2. Admin reviews → Approve → `account_status = 'active'`
3. User logs in → `/seller/listings`
4. Create listing: `/seller/listings/new` → `PropertyForm` → `createProperty()` → INSERT `properties` (status='draft')
5. Upload images → `addPropertyImage()` → INSERT `property_images` + storage `property-images`
6. Publish listing → `publishProperty(id, true)` → UPDATE `properties.status = 'active'`, `published_at = now()`
7. Request verification → `requestVerification(id)` → INSERT `property_verifications` + UPDATE `properties.status = 'pending_review'`
8. Admin approves verification → `reviewVerification(id, 'approved')` → UPDATE `property_verifications.status = 'approved'` + UPDATE `properties.is_verified = true, status = 'active'`
9. Receive inquiries (read via `property_inquiries`)
10. Negotiate → agree on price → buyer creates escrow → seller receives funds on release

### Pages involved

`/seller/listings`, `/seller/listings/new`, `/seller/listings/[id]/edit`, `/properties/[id]`, `/account/pending`, `/account/wallet`, `/account/escrow`

### Key tables

`properties`, `property_images`, `property_videos`, `property_verifications`, `property_inquiries`, `kyc_records`, `wallets`, `escrow_accounts`

### Known gaps

- No inquiry inbox page for sellers (inquiries exist in DB but no `/seller/inquiries` page)
- No notification when inquiry is received
- `completeSellerProfile` action missing — sellers don't explicitly set `account_status = 'pending_verification'` in a dedicated action

---

## 11. Agent Journey 🚧

**Trigger:** User registers as Agent, completes onboarding (including agent profile + KYC), awaits approval.

### End-to-end journey

1. Register as Agent → Onboarding Step 1 (basic) + Step 2 (agent profile: license, agency, specialization) + Step 3 (KYC: ID + license)
2. `completeAgentProfile()` → UPSERT `agent_profiles`, UPDATE `profiles.account_status = 'pending_verification'`
3. Admin approves → `agent_profiles.license_verified = true`
4. Agent logs in → `/agent/commissions`
5. List properties on behalf of clients (same as Seller: `/seller/listings/new`)
6. When property sells → escrow created → payer releases → `releaseEscrow()` calls `lookupPropertyAgent()` → if agent attached to property, `creditAgentCommission()` called
7. Commission recorded in `commission_records` (status='pending')
8. Agent sees commission at `/agent/commissions`
9. Admin pays commission → `payCommission()` → `wallet_transfer(null, agentId, amount)` → agent wallet credited

### Additional: agent can access both `/seller/*` and `/agent/*` routes (middleware allows both prefixes).

### Key tables

`agent_profiles`, `properties`, `commission_records`, `wallets`, `escrow_accounts`, `wallet_transactions`

### Status

- Agent onboarding, profile, KYC — ✅ backend complete
- Commission recording on escrow release — ✅ `creditAgentCommission` wired in `releaseEscrow` and `approveMilestone`
- `/agent/commissions` page — 🚧 page file exists, content is stub

---

## 12. Contractor Journey 🚧

**Trigger:** User registers as Contractor, completes professional onboarding.

### End-to-end journey

1. Register → Onboarding (basic + professional profile + KYC)
2. `completeProfessionalProfile()` → UPSERT `professional_profiles` (profession_type='contractor')
3. Admin approves → `professional_profiles.is_verified = true`
4. Contractor accesses `/contractor` dashboard (stub)
5. Creates service listings (`service_listings` table — UI planned)
6. Receives service requests from buyers/clients (`service_requests` table — UI planned)
7. Sends quotation → client accepts → service contract formed
8. Work completed → service request status → 'completed'
9. Client creates escrow / pays contractor
10. Client reviews contractor via `/account/reviews`

### Status

- Onboarding, KYC, approval — ✅ backend complete  
- Dashboard — 🚧 stub page exists (`/contractor`)
- Service listings, requests, quotations — 📋 planned

---

## 13. Engineer Journey 🚧

Same pattern as Contractor with `profession_type = 'engineer'`. Dashboard at `/engineer` (stub). All professional service tables (service_listings, service_requests) are planned.

---

## 14. Architect Journey 🚧

Same pattern as Contractor with `profession_type = 'architect'`. Dashboard at `/architect` (stub). All professional service tables planned.

---

## 15. Lawyer Journey 🚧

Same pattern as Contractor with `profession_type = 'lawyer'`. Dashboard at `/lawyer` (stub). Legal-specific service listings planned.

---

## 16. Vendor Journey 🚧

**Trigger:** User registers as Vendor, completes onboarding with store info.

### End-to-end journey

1. Register → Onboarding (basic + vendor profile: store name, slug, description)
2. `completeVendorProfile()` → UPSERT `vendor_profiles` (store_name, store_slug)
3. Admin approves → `profiles.is_verified = true` (⚠️ `vendor_profiles.is_verified` NOT updated — gap)
4. Vendor accesses `/vendor` dashboard (stub)
5. Creates product listings (`products` table — UI planned)
6. Uploads product images → `marketplace-products` bucket (requires `vendor_profiles` row in storage RLS)
7. Buyers place orders → `orders` table
8. Vendor manages orders → `/vendor` dashboard (planned)
9. Payment via escrow → vendor wallet credited on release

### Status

- Vendor onboarding, KYC — ✅ backend complete (approval has gap with `vendor_profiles.is_verified`)
- Dashboard — 🚧 stub page at `/vendor`
- Product listings, orders UI — 📋 planned

---

## 17. Property Posting ✅

**Trigger:** Seller/Agent navigates to `/seller/listings/new`.

### Step-by-step flow

1. Seller/Agent opens `/seller/listings/new`
2. Page calls `requireActiveProfile(profile)` — throws if `account_status !== 'active'`
3. `PropertyForm` rendered with `mode="create"`
4. User fills: title, description, property type, listing type, city, price, bedrooms, bathrooms, size, amenities
5. Form submits → `createProperty(data)` server action
6. Schema validation via `propertyCreateSchema` (Zod)
7. Author check: `PROPERTY_CREATOR_ROLES.includes(actor.role)` + `actor.account_status === 'active'`
8. INSERT `properties` (status='draft', owner_id=user.id, slug=slugify(title)+timestamp)
9. INSERT `property_amenities` (if provided)
10. Return `{ id, slug }` to client
11. Client navigates to `/seller/listings/[id]/edit` for image upload

**Image upload:**
12. User selects images → client uploads to `property-images/{user_id}/{property_id}/{uuid}.ext`
13. Upload success → `addPropertyImage(propertyId, url, path, isPrimary)` server action
14. INSERT `property_images` (url, is_primary, sort_order)

**Publish:**
15. Seller clicks publish toggle on `/seller/listings`
16. `publishProperty(id, true)` called
17. Account status re-checked
18. UPDATE `properties.status = 'active', published_at = now()`
19. Listing appears in public `/properties` feed

**Request Verification (optional):**
20. Seller clicks verify icon on draft/rejected listings
21. `requestVerification(propertyId)` called
22. Check: no existing pending/approved verification
23. INSERT `property_verifications` (status='pending')
24. UPDATE `properties.status = 'pending_review'`
25. Listing moves to admin verification queue at `/admin/properties`

**Admin reviews at `/admin/properties`:**
26. Admin clicks Approve → `reviewVerification(verificationId, 'approved')` server action
27. UPDATE `property_verifications.status = 'approved', verified_by, verified_at`
28. UPDATE `properties.is_verified = true, status = 'active'`
29. Verified badge shown on listing

### Pages involved

| Page | Role |
|------|------|
| `/seller/listings` | Listing management + publish/verify actions |
| `/seller/listings/new` | Create form |
| `/seller/listings/[id]/edit` | Edit + image upload |
| `/properties/[id]` | Public view (owner preview) |
| `/admin/properties` | Admin verification queue |
| `/admin/properties/[id]` | Admin property detail + approve/reject |

### Database tables

| Table | Operation |
|-------|-----------|
| `properties` | INSERT (draft), UPDATE (status, is_verified, published_at) |
| `property_images` | INSERT, DELETE |
| `property_amenities` | INSERT, DELETE |
| `property_verifications` | INSERT (pending), UPDATE (approved/rejected) |
| `admin_logs` | INSERT (agent assignment via `adminAssignAgent`) |

### Server actions

- `createProperty` — INSERT properties + amenities
- `updateProperty` — UPDATE properties + replace amenities
- `deleteProperty` — DELETE properties (own)
- `publishProperty` — UPDATE status active/off_market
- `addPropertyImage` — INSERT property_images + storage upload
- `removePropertyImage` — DELETE property_images + storage remove
- `addPropertyVideo` — INSERT property_videos
- `requestVerification` — INSERT property_verifications + UPDATE property status
- `reviewVerification` — Admin approve/reject property verification
- `adminAssignAgent` — UPDATE properties.agent_id + INSERT admin_logs

### Storage buckets

- `property-images` (public, max 10 MB, JPEG/PNG/WEBP/GIF)
- `property-videos` (public, max 100 MB, MP4/WEBM/MOV/AVI)

### Success path

Create (draft) → upload images → publish (active) → optional: request verification → admin approves → verified badge

### Failure paths

| Failure | What happens |
|---------|-------------|
| `account_status !== 'active'` | `requireActiveProfile` throws / redirect to `/account/pending`; `createProperty` also returns error |
| Role not in `PROPERTY_CREATOR_ROLES` | Server action returns 'not permitted' error |
| `prop_insert` RLS fails | DB error returned; `has_active_account()` or `is_property_creator()` returned false |
| Image upload: max 20 exceeded | No DB constraint; relies on client-side validation (platform_settings.max_property_images=20) |
| `search_vector` trigger fails | `properties_before_save` trigger error; INSERT rolls back |

### Security checks

- Double-guard: middleware (role prefix) + page guard (`requireActiveProfile`) + action guard (role + account_status) + RLS (`is_property_creator() AND has_active_account()`)
- `owner_id` set from `auth.uid()` in server action — cannot be spoofed
- Image path includes user_id — storage RLS enforces ownership
- `reviewVerification`: caller must be admin (role check in action + adminClient used for writes)

### Future improvements

- Featured listing promotion (INSERT payment + flag `properties.is_featured=true`)
- Video walkthrough upload
- 3D tour / virtual staging integration
- Floor plan upload
- Automated price suggestion based on comparable listings
- Bulk image reorder

---

## 18. Marketplace Product Posting 📋

**Trigger:** Vendor navigates to product creation page (not yet built).

### Schema ready

Tables: `products`, `product_images`, `product_variants`, `inventory_logs`  
Storage: `marketplace-products` (public, max 10 MB, JPEG/PNG/WEBP)  
Storage RLS: INSERT requires `vendor_profiles` row existence

### What's needed

- `/vendor/products/new` page
- `createProduct` server action
- `addProductImage` server action
- Product list at `/vendor/products`
- Product detail at `/products/[id]` (public)
- Cart: `cart_items` table exists, no UI

### Future improvements

- Inventory management with `inventory_logs`
- Bulk product CSV import
- Product variants (size, color, material)
- Promotional pricing / discounts

---

## 19. Service Posting 📋

**Trigger:** Professional (contractor/engineer/architect/lawyer) creates a service listing.

### Schema ready

Tables: `service_listings`, `service_categories` (10 categories seeded), `service_requests`, `service_quotations`, `service_contracts`, `service_bookings`  
Storage: `service-portfolios` (public, max 25 MB; INSERT requires `professional_profiles` row)

### What's needed

- `/contractor/services/new` (and similar for each professional role)
- `createServiceListing` server action
- Service browse page `/services` (not yet built)
- Service request form
- Quotation flow (accept/reject)
- Booking confirmation

### Future improvements

- Service packages (basic/standard/premium tiers)
- Calendar availability management
- Instant booking vs. quote-required modes

---

## 20. Search & Discovery 🚧

**Trigger:** User visits `/properties` or uses search bar.

### Implemented

- `/properties` page exists — queries `properties` table with basic filters
- `/properties/[id]` detail page with full property data + owner/agent profiles
- `properties.search_vector TSVECTOR` maintained by `properties_before_save` trigger (`to_tsvector('french', title || description || city || address)`)
- Properties SELECT: anon/authenticated can read `status IN ('active', 'under_offer')` listings

### How search works

- Full-text search: `supabase.from('properties').select('*').textSearch('search_vector', query, { type: 'websearch', config: 'french' })`
- Filters: city, listing_type, property_type, price range, bedrooms
- Sort: by `created_at` DESC or price

### What's missing

- Search bar UI (no component found in routes)
- Map view with `latitude/longitude`
- Saved searches (`saved_searches` table exists, no UI)
- Search results page with pagination
- Professional/service search (no browse pages)
- Marketplace product browse
- `increment_property_views()` function exists but not called from property detail page

### Pages involved

- `/properties` — listing browse (🚧 basic filters)
- `/properties/[id]` — property detail (✅)
- `/materials`, `/services`, `/professionals`, `/community` — not yet implemented

### Future improvements

- MapBox/Google Maps integration
- Proximity search (lat/lng radius)
- Saved search alerts (email on new matches)
- AI-powered search (semantic similarity)
- Autocomplete

---

## 21. Messaging 📋

**Trigger:** User clicks "Message" on a property listing, professional profile, or order.

### Schema ready

Tables: `conversations`, `conversation_participants`, `messages`, `message_attachments`  
Storage: `chat-attachments` (private; SELECT: participants only via `conversation_participants` check)  
Realtime: `conversations`, `conversation_participants`, `messages` all subscribed to Supabase Realtime

### What's needed

- Create conversation (linked to property/order/service)
- `/messages` inbox page
- `/messages/[id]` thread page with real-time updates
- `createConversation`, `sendMessage` server actions
- Unread count in navigation

### Security design (from migration)

- `chat-attachments` SELECT: requires `conversation_participants` membership check
- `messages` SELECT: requires participant in `conversation_participants`
- No strangers can send messages — must be conversation participants

### Future improvements

- Group conversations (property agents + multiple buyers)
- Message read receipts
- Voice messages
- Automated order/booking confirmation messages (system messages)
- Message translation (French/English)

---

## 22. Notifications 🚧

**Trigger:** Various platform events (approval, rejection, order update, message, etc.).

### Implemented

- `notifications` table exists with `notification_type` enum (13 types: message, enquiry, offer, booking, payment, review, property_update, order_update, service_update, job_update, system, promotional, verification)
- Realtime subscription: `notifications` table subscribed
- Admin actions INSERT notifications:
  - `adminRejectProfessional` — currently does NOT insert notification (gap)
  - `adminApproveProfessional` — currently does NOT insert notification (gap)
- `notifications` table SELECT: own rows only (`USING (user_id = auth.uid())`)

### What's missing

- No notifications inbox page (`/account/notifications`)
- No notification bell component in dashboard layout
- No unread count
- Approval/rejection notifications not automatically created (admin actions don't INSERT into `notifications`)
- Push notifications (Expo push token stored in `profiles.expo_push_token` but no push sending code found)

### Future improvements

- Notification preferences page (`notification_preferences` table exists)
- Email digest (daily/weekly summary)
- Expo push notifications for mobile app (token already stored)
- Mark all as read
- Notification types: inquiry received, message received, escrow funded, escrow released, KYC approved/rejected

---

## 23. Reviews & Ratings 🚧

**Trigger:** User navigates to `/account/reviews` after a `service_request` is completed.

### Step-by-step flow

1. Client has a `service_requests` row with `status = 'completed'`
2. An accepted `service_quotations` row links the request to a provider
3. Client navigates to `/account/reviews`
4. Page queries: `service_requests` WHERE `client_id = user AND status = 'completed'` → joins `service_quotations` → joins `profiles` (provider)
5. For each completed request without an existing review: shows `ReviewForm`
6. Client fills: rating (1–5), title (optional), body (optional), sub-ratings (cleanliness, communication, value, accuracy)
7. Submit → `createReview(input)` server action
8. Validates: request exists, `client_id = user.id`, status='completed'
9. Finds accepted quotation → gets `provider_id`
10. Validates provider role is in `REVIEWABLE_ROLES`
11. INSERT `reviews` (reviewer_id, target_type=provider_role, target_id=provider_id, rating, title, body, sub-ratings)
12. `revalidatePath('/account/reviews')`
13. Review appears in "Reviews You've Written" section

### Pages involved

- `/account/reviews` — review list + review form

### Database tables

| Table | Operation |
|-------|-----------|
| `service_requests` | SELECT (completed, own) |
| `service_quotations` | SELECT (accepted, for request) |
| `profiles` | SELECT (provider details) |
| `reviews` | SELECT (own reviews), INSERT |

### Server actions

- `createReview` (`src/lib/actions/reviews.ts`)

### Known limitation

Reviews are exclusively gated on `service_requests.status = 'completed'` — there is currently no UI for the service request flow (clients can't create requests, professionals can't update status). This means **the review system is currently unreachable** for users without manually-created DB data.

### Security checks

- `client_id = user.id` enforced in server action
- `status = 'completed'` check prevents premature reviews
- Duplicate review: INSERT fails with `23505` unique constraint error (no UNIQUE constraint defined yet — this is planned); server action handles it gracefully
- Provider role checked against `REVIEWABLE_ROLES` before INSERT

### Future improvements

- Reviews on properties (not just professionals)
- Reviews on marketplace products
- Seller/professional can respond to reviews (`review_responses` table exists, no UI)
- Verified purchase badge (auto-set `is_verified=true` on escrow-linked purchases)
- Aggregate rating display on professional profiles

---

## 24. Favorites ✅

**Trigger:** Authenticated user clicks heart/save icon on a property listing.

### Step-by-step flow

1. User clicks favorite button on `/properties` or `/properties/[id]`
2. `toggleFavorite(propertyId)` called
3. Checks `auth.getUser()` — unauthenticated returns `{ error: 'Sign in to save properties' }`
4. SELECT `property_favorites` WHERE `user_id = user.id AND property_id = propertyId`
5. If exists: DELETE → returns `{ favorited: false }`
6. If not exists: INSERT → returns `{ favorited: true }`
7. UI updates optimistically

### Saved favorites view

8. User navigates to `/buyer/favorites`
9. `FavoritesGrid` component renders saved properties

### Database tables

| Table | Operation |
|-------|-----------|
| `property_favorites` | SELECT (check existing), INSERT, DELETE |
| `properties` | SELECT (for favorites grid) |

### Server actions

- `toggleFavorite` (`src/lib/actions/properties.ts`)

### Permissions

- `authenticated` required to toggle
- `property_favorites` RLS: `pf_own_select/insert/delete` — own rows only

### Security checks

- User must be authenticated (action checks `auth.getUser()`)
- RLS prevents reading/modifying other users' favorites

### Future improvements

- Favorite count visible on listings
- Collections (organize favorites into named lists)
- Share a favorites list
- Notify user when a favorited property's price drops

---

## 25. Property Viewing Requests 📋

**Trigger:** Buyer clicks "Schedule Viewing" on a property page.

### Schema

No dedicated `property_viewings` table in current schema. Property inquiries (`property_inquiries`) could carry viewing requests as messages, but there is no structured viewing request flow.

### What's needed

- Viewing request form on `/properties/[id]`
- Seller/agent notification
- Calendar availability (seller sets available slots)
- Booking confirmation
- Reminder notifications

### Future improvements

- In-app video viewing option
- Virtual tour integration
- Multi-buyer group viewing sessions

---

## 26. Offers & Negotiation 📋

**Trigger:** Buyer clicks "Make Offer" on a property listing.

### Schema

No dedicated `offers` table exists. `properties.negotiable = true` flag exists but no offer workflow is built.

### What's needed

- `property_offers` table (buyer_id, property_id, amount, message, status, expires_at)
- Offer form on `/properties/[id]`
- Seller counter-offer
- Accept/reject/expire logic
- Transition from accepted offer to escrow creation

### Future improvements

- Sealed-bid auction mode (`properties.listing_type = 'auction'` enum value exists)
- Offer history timeline
- Admin arbitration for disputes

---

## 27. Escrow Payment 🚧

**Trigger:** Buyer initiates a secured payment for a property, service, or order.

### Step-by-step flow

**Create Escrow:**
1. Payer opens `/account/escrow` or is redirected from a transaction
2. Calls `createEscrow({ reference_type, reference_id, payee_id, amount, milestones? })`
3. Schema validation via `createEscrowSchema`
4. Cannot create escrow with self (`payer_id !== payee_id`)
5. Platform fee calculated: `Math.round(amount * 2.5 / 100)`
6. INSERT `escrow_accounts` (status='pending', release_date = now() + 30 days)
7. INSERT `escrow_events` (event_type='created')
8. If milestones provided: validate sum == total → INSERT `escrow_milestones`
9. Returns `{ id }` to client

**Fund Escrow:**
10. Payer opens `/account/escrow/[id]` → sees "Fund Escrow" button (status='pending')
11. Payer checks wallet balance
12. Sufficient balance: calls `fundEscrow(escrowId)`
13. `wallet_transfer(payer_id, null, amount, 'escrow', escrowId, 'Escrow funded')` — debit-only mode
14. UPDATE `escrow_accounts.status = 'funded', funded_at = now()`
15. INSERT `escrow_events` (event_type='funded')
16. Wallet balance decremented; `wallets.locked` NOT set (funds are debited out of wallet, not locked)

**Release Escrow (payer approves completion):**
17. Payer clicks "Release Funds" (only when status='funded')
18. `releaseEscrow(escrowId)` called
19. Checks: caller = payer, status = 'funded'
20. Calls DB function `release_escrow(p_escrow_id)` (SECURITY DEFINER)
21. `release_escrow()` calls `wallet_transfer(null, payee_id, amount - platform_fee, ...)` — credit-only mode
22. UPDATE `escrow_accounts.status = 'released'`
23. INSERT `escrow_events` (event_type='released')
24. Auto-commission: `lookupPropertyAgent()` → if property has agent → `creditAgentCommission()` → INSERT `commission_records`
25. Payee wallet credited; commission pending in `commission_records`

**Milestone-Based Release:**
26. Payee marks milestone complete: `completeMilestone({ milestone_id, evidence_urls, notes })`
27. UPDATE `escrow_milestones.status = 'completed', completed_at, evidence_urls`
28. Payer approves: `approveMilestone(milestoneId)`
29. `wallet_transfer(null, payee_id, milestone.amount, ...)` — partial credit
30. UPDATE `escrow_milestones.status = 'approved'`
31. Agent commission auto-triggered for property-linked milestones

**Dispute:**
32. Either party clicks "File Dispute" (when status='funded')
33. `disputeEscrow(escrowId, { reason })` called
34. Reason must be >= 20 characters
35. UPDATE `escrow_accounts.status = 'disputed', disputed_at, dispute_reason`
36. INSERT `escrow_events` (event_type='disputed')

**Admin Dispute Resolution:**
37. Admin opens `/admin/escrow` → sees disputed escrows
38. `resolveDisputeAdmin(escrowId, 'release_to_payee' | 'refund_to_payer', notes)` called
39. Checks caller is admin
40. If release_to_payee: net_amount = amount - platform_fee; credit payee
41. If refund_to_payer: amount = full; credit payer
42. `wallet_transfer(null, recipient_id, net_amount, ...)` via adminClient
43. UPDATE `escrow_accounts.status = 'released', resolved_at, resolution_notes`
44. INSERT `escrow_events` (event_type='dispute_resolved')

**Auto-release:**
- `auto_release_at` date exists on each escrow (now() + `escrow_auto_release_days` = 30 days)
- Auto-release mechanism not yet implemented (no cron/pg_cron job) — date stored but not acted on automatically

### Pages involved

| Page | Role |
|------|------|
| `/account/escrow` | Escrow list (payer + payee views) |
| `/account/escrow/[id]` | Escrow detail: fund, release, dispute, milestones, timeline |
| `/admin/escrow` | Admin escrow management + dispute resolution |

### Database tables

| Table | Operation |
|-------|-----------|
| `escrow_accounts` | INSERT, SELECT, UPDATE |
| `escrow_milestones` | INSERT, SELECT, UPDATE |
| `escrow_events` | INSERT (audit trail) |
| `wallets` | SELECT (balance check), updated via `wallet_transfer` |
| `wallet_transactions` | INSERT by `wallet_transfer()` function |
| `commission_records` | INSERT on release (if agent attached) |

### Server actions

- `createEscrow` — INSERT escrow + events + milestones
- `fundEscrow` — check balance + wallet_transfer + UPDATE status
- `releaseEscrow` — release_escrow() RPC + events + agent commission
- `disputeEscrow` — UPDATE status + events
- `completeMilestone` — payee marks milestone done
- `approveMilestone` — payer approves + partial credit + commission
- `resolveDisputeAdmin` — admin resolution + credit winner

### Security checks

- Cannot create escrow with self
- Only payer can fund and release
- Only payee can mark milestones complete
- Only payer can approve milestones
- Either party can dispute
- Only admin can resolve disputes
- `wallet_transfer` is SECURITY DEFINER — validates caller balance, prevents negative balance
- `release_escrow` is SECURITY DEFINER — atomic release

### Future improvements

- Auto-release cron job (when `auto_release_at` passes)
- Platform fee to platform wallet (currently fee is calculated but deducted by reducing net_amount; no platform wallet row)
- Multi-currency support
- Stripe integration for international payments
- Bank transfer payout for escrow release

---

## 28. Wallet Top-Up 🚧

**Trigger:** User opens `/account/wallet` and clicks "Top Up".

### Step-by-step flow

1. User opens `/account/wallet`
2. `WalletCard` component reads wallet balance
3. User clicks "Top Up" → Sheet opens with `WalletTopUpForm`
4. User enters amount + chooses payment method (MTN MoMo, Orange Money, or Stripe)
5. Form submits → `initiatePayment({ amount, provider, phone, transaction_type: 'wallet_topup' })` server action

**MTN MoMo path:**
6. INSERT `transactions` (status='pending')
7. `mtnRequestToPay({ referenceId, phone, amount })` — calls MTN MoMo API
8. Returns provider_ref to client
9. Client polls `checkPaymentStatus(provider_ref)` or waits for webhook
10. On webhook confirmation: `mtnGetPaymentStatus()` confirms → UPDATE `transactions.status = 'completed'`
11. `wallet_transfer(null, user.id, amount, 'wallet_topup', txnId, 'Wallet top-up')` — credit-only
12. `wallets.balance` incremented; `wallet_transactions` row written

**Orange Money path:** Same pattern with `orangeInitiatePayment` / `orangeGetPaymentStatus`.

**Wallet payment (immediate debit):**
6. Check balance ≥ amount
7. `wallet_transfer(user.id, null, amount, ...)` — debit-only
8. UPDATE `transactions.status = 'completed'`

### Pages involved

- `/account/wallet` — balance view + top-up sheet
- `/account/transactions` — transaction history

### Database tables

| Table | Operation |
|-------|-----------|
| `wallets` | SELECT (balance), UPDATE (via wallet_transfer) |
| `wallet_transactions` | INSERT (by wallet_transfer) |
| `transactions` | INSERT (payment record), UPDATE (status) |

### Server actions

- `initiatePayment` (`src/lib/actions/payments.ts`)

### Status

- UI: 🚧 `WalletTopUpForm` exists but payment provider integration incomplete
- MTN MoMo, Orange Money: 🚧 API helpers exist in `src/lib/utils/mtn-momo.ts` and `orange-money.ts`; webhook handling unclear
- Stripe: 📋 `stripe_enabled = false` in platform_settings; not implemented

### Future improvements

- Webhook endpoint for payment provider callbacks
- Instant notification on top-up success
- Minimum top-up amount validation
- Top-up history with receipt download

---

## 29. Withdrawal / Payouts 🚧

**Trigger:** User (seller/agent/vendor/contractor/etc.) opens `/account/payouts` and clicks "Withdraw".

### Step-by-step flow

1. User opens `/account/payouts`
2. `WalletCard` shows current balance
3. User clicks "Withdraw" → Sheet opens with `PayoutRequestForm`
4. User enters: amount, payment method (mtn_momo/orange_money/bank), account details (phone/account number)
5. `requestPayout({ amount, method, account_details })` server action (from `payments.ts`)
6. Schema validation via `requestPayoutSchema`
7. Check minimum withdrawal: amount >= `min_withdrawal_xaf` (5,000 XAF from platform_settings)
8. Check available balance: `wallets.balance - wallets.locked >= amount`
9. `wallet_lock(user.id, amount)` — increment `wallets.locked` by amount (funds reserved)
10. INSERT `payouts` (status='pending', method, account_details, amount)
11. Admin sees pending payout at `/admin/payouts`
12. Admin manually processes payout (via payment provider dashboard)
13. Admin marks payout complete → UPDATE `payouts.status = 'completed'`
14. `wallet_transfer(user.id, null, amount, 'payout', payoutId, 'Payout processed')` — debit wallet
15. `wallet_unlock(user.id, amount)` — decrement locked (undo reservation)

### Pages involved

| Page | Role |
|------|------|
| `/account/payouts` | User: request + history |
| `/admin/payouts` | Admin: review + process |

### Database tables

| Table | Operation |
|-------|-----------|
| `wallets` | SELECT (balance), UPDATE locked (via wallet_lock/unlock) |
| `payouts` | INSERT (pending), SELECT (own) |
| `wallet_transactions` | INSERT (by wallet_transfer on completion) |

### Server actions

- `requestPayout` (`src/lib/actions/payments.ts`)
- Admin payout processing (inline in `/admin/payouts` — needs verification)

### Security checks

- `payout_insert` RLS: `WITH CHECK (recipient_id = auth.uid())`
- `payout_own` RLS: `USING (recipient_id = auth.uid())`
- Balance check before locking (prevents overdraft)
- `wallet_lock/unlock` are SECURITY DEFINER — atomic operations

### Future improvements

- Automated MTN MoMo payout via `mtnTransfer()` (code exists in `payments.ts`)
- Same-day payout for verified sellers (admin-configurable)
- Payout schedule (weekly batch)
- Bank transfer integration

---

## 30. Admin Moderation 🚧

**Trigger:** Admin navigates to `/admin` dashboard or specific moderation pages.

### Implemented Actions

| Action | How triggered | Server action | Tables |
|--------|---------------|---------------|--------|
| View platform metrics | `/admin` page | `get_admin_metrics()` RPC | All (via RPC) |
| View activity feed | `/admin` page | `get_admin_activity()` RPC | `profiles`, `properties`, `admin_logs` (via RPC) |
| View user list | `/admin/users` | direct query | `profiles` |
| View user detail | `/admin/users/[id]` | direct query | `profiles`, `kyc_records`, `agent_profiles`, etc. |
| Filter users by role/status | `/admin/users?role=&status=` | query param filter | `profiles` |
| Assign role | `/admin/users` | `adminAssignRole` | `profiles` |
| Suspend user | `/admin/users` | `adminSuspendAccount` | `profiles`, `admin_logs`, `account_notices` |
| Activate user | `/admin/users` | `adminActivateAccount` | `profiles` |
| View KYC queue | `/admin/professionals` | direct query (adminClient) | `profiles`, `kyc_records`, `professional_profiles`, `agent_profiles` |
| Approve professional | `/admin/professionals` | `adminApproveProfessional` | `profiles`, `kyc_records`, role-profile tables |
| Reject professional | `/admin/professionals` | `adminRejectProfessional` | `kyc_records`, `account_notices` |
| View property verifications | `/admin/properties` | direct query | `property_verifications`, `properties`, `profiles` |
| Approve/reject property | `/admin/properties` | `reviewVerification` | `property_verifications`, `properties` |
| Assign agent to property | `/admin/properties/[id]` | `adminAssignAgent` | `properties`, `admin_logs` |
| View commissions | `/admin/commissions` | direct query | `commission_records` |
| Pay commission | `/admin/commissions` | `payCommission` | `commission_records`, `wallets`, `wallet_transactions` |
| Cancel commission | `/admin/commissions` | `cancelCommission` | `commission_records` |
| View disputes | `/admin/escrow` | direct query | `escrow_accounts` |
| Resolve dispute | `/admin/escrow` | `resolveDisputeAdmin` | `escrow_accounts`, `wallets`, `escrow_events` |
| View reports | `/admin/reports` | direct query | `moderation_reports` |
| View settings | `/admin/settings` | direct query | `platform_settings` |
| View payouts | `/admin/payouts` | direct query | `payouts` |

### Database tables

All tables (admin has `ALL` via RLS policies + adminClient service-role bypass).

### Security checks

- Middleware: `ROLE_PROTECTED_PREFIXES['/admin'] = ['admin']` — all `/admin/*` routes require role='admin'
- Page-level guard: `if (!profile || profile.role !== 'admin') redirect('/login')` in every admin page
- Action-level guard: `callerProfile.role !== 'admin'` check in every admin server action
- Triple-layer defense: middleware + page + action

### Future improvements

- `/admin/audit` — admin audit log viewer
- Bulk actions on user list (bulk suspend, bulk role assign)
- Content moderation queue (reports)
- Platform settings editor
- Admin-to-admin notifications
- Role: Moderator dashboard (currently broken — TypeScript type missing)

---

## 31. Account Suspension ✅

**Trigger:** Admin clicks "Suspend" on `/admin/users` or `/admin/users/[id]`.

### Step-by-step flow

1. Admin clicks "Suspend" button next to a user (cannot suspend self)
2. Form submits → `adminSuspendAccount(userId, reason)` server action
3. Auth guard: caller must be admin
4. `adminClient.from('profiles').update({ account_status: 'suspended' }).eq('id', userId)`
5. `adminClient.from('admin_logs').insert({ actor_id, action: 'suspend_account', target_id: userId, target_type: 'user', new_data: { reason } })`
6. `adminClient.from('account_notices').insert({ user_id: userId, type: 'suspension', reason, created_by: adminId })`
7. `revalidatePath('/admin/users')`

**User experience on next request:**
8. Middleware reads `profiles.account_status` on every request
9. Detects `account_status === 'suspended'`
10. Calls `supabase.auth.signOut()` — clears session cookie
11. Redirects to `/login?error=account_suspended`

**Suspended user who logs back in:**
12. `signIn()` detects `account_status === 'suspended'`
13. Calls `signOut()` before returning
14. Returns `{ error: 'account_suspended' }` to client
15. Client shown error: account suspended

**Viewing suspension reason:**
16. User navigates to `/account/suspended` (accessible — middleware only kicks on protected routes)
17. Page shows: reason from `account_notices`, appeal form
18. User can submit appeal (see Workflow 32)

### Database tables

| Table | Operation |
|-------|-----------|
| `profiles` | UPDATE account_status = 'suspended' |
| `admin_logs` | INSERT (action='suspend_account') |
| `account_notices` | INSERT (type='suspension') |

### Server actions

- `adminSuspendAccount` (`src/lib/actions/auth.ts`)

### Pages involved

- `/admin/users` — trigger point
- `/admin/users/[id]` — trigger point
- `/account/suspended` — user-facing explanation + appeal form

### Security checks

- Cannot suspend self (UI check: `u.id !== profile.id`)
- Caller must be admin (action guard)
- Session invalidated immediately on next request (middleware catches it)
- `admin_logs` note: action inserts `{ new_data: { reason } }` but column is named `metadata` — functional but inconsistent (gap I8 in schema doc)

### Future improvements

- Time-limited suspension (auto-reactivate after N days)
- Suspension escalation to ban (distinguish temp vs permanent)
- Email notification to suspended user
- Admin confirmation modal with reason field (currently reason is hardcoded as 'Admin action' from `/admin/users`)

---

## 32. Account Appeals ✅

**Trigger:** User on `/account/suspended` or `/account/pending` submits an appeal form.

### Step-by-step flow

**User submits appeal:**
1. User reads suspension/rejection reason from `account_notices`
2. Fills text area ("Explain why you believe this suspension should be reviewed")
3. Form submits → `submitAppeal(message, noticeId)` server action
4. INSERT `account_appeals` (user_id, notice_id, message, status='pending')
5. Page reloads with `?submitted=true` — shows confirmation message
6. User sees "Your appeal is under review" on subsequent visits (polls for `existingAppeal` status='pending')

**Admin reviews appeal:**
7. Admin views pending appeals (currently: no dedicated appeal management page — admin must query DB directly)
8. Admin updates `account_appeals.status = 'reviewed'` (no UI)
9. Admin then decides: `adminActivateAccount(userId)` OR leave suspended
10. On activation: `account_notices` row remains; `profiles.account_status = 'active'`
11. User's next login / page visit: `account_status = 'active'` → directed to dashboard

### Pages involved

| Page | Role |
|------|------|
| `/account/suspended` | Suspension notice + appeal form (trigger: suspension) |
| `/account/pending` | Rejection notice + correction request form (trigger: KYC rejection) |

### Database tables

| Table | Operation |
|-------|-----------|
| `account_notices` | SELECT (latest notice for user) |
| `account_appeals` | SELECT (existing pending), INSERT (new appeal) |

### Server actions

- `submitAppeal` (`src/lib/actions/auth.ts`)

### Security checks

- User must be authenticated
- `account_appeals` INSERT: own rows only (`account_appeals_user_insert` — `WITH CHECK (user_id = auth.uid())`)
- `account_appeals` SELECT: own rows only (`account_appeals_user_select` — `USING (user_id = auth.uid())`)

### Future improvements

- Admin UI page for appeal management (`/admin/appeals`)
- Appeal status notification to user (email + in-app)
- Appeal deadlines (expire after 30 days)
- Second-level appeal to super admin

---

## 33. Audit Logging 🚧

**Trigger:** Admin actions, user actions, system events.

### Admin Logs — Implemented

`admin_logs` table records discrete admin actions. Currently written by:

| Action | Written by |
|--------|-----------|
| `suspend_account` | `adminSuspendAccount` |
| `assign_agent` | `adminAssignAgent` |
| `remove_agent` | `adminAssignAgent` |

Not yet written by:
- `adminActivateAccount`
- `adminAssignRole`
- `adminApproveProfessional`
- `adminRejectProfessional`
- `reviewVerification`

### Activity Logs — Partial

`activity_logs` records user-initiated actions. Currently no server action explicitly writes to `activity_logs` from the codebase reviewed. The table exists; insert policies allow authenticated users to write own rows.

### RPC Audit Trail

`get_admin_activity()` RPC generates a UNION of:
1. Recent user registrations (from `profiles`)
2. Properties submitted (from `properties` WHERE status = 'pending_review')
3. Properties approved (from `properties` WHERE status = 'active')
4. Properties rejected (from `properties` WHERE status = 'rejected')
5. Account suspensions (from `admin_logs` WHERE action = 'suspend_account')

### Escrow Audit Trail — Implemented

`escrow_events` provides a complete per-escrow timeline:
- Written by: `createEscrow`, `fundEscrow`, `releaseEscrow`, `disputeEscrow`, `completeMilestone`, `approveMilestone`, `resolveDisputeAdmin`
- Events: created, funded, released, disputed, milestone_completed, milestone_approved, dispute_resolved

### Pages involved

- `/admin/users/[id]` — shows `admin_logs` for a user (SELECT where target_id = userId)
- `/admin` — activity feed via `get_admin_activity()` RPC
- `/account/escrow/[id]` — escrow timeline via `escrow_events`

### Future improvements

- `/admin/audit` — full admin audit log viewer with filters (action type, date range, actor, target)
- Write `admin_logs` on ALL admin actions (currently only 3 actions write it)
- Per-user activity history page (`/admin/users/[id]` shows recent activity)
- `activity_logs` integration (log every significant user action with IP, metadata)
- Immutable log stream (append-only with no DELETE policy — already enforced: no DELETE on `admin_logs` or `escrow_events`)

---

## 34. Summary

### Workflow counts

| Status | Count | Workflows |
|--------|-------|-----------|
| ✅ Implemented | 8 | User Registration, Login, Password Reset, Account Recovery, Profile Completion/Onboarding, Property Posting, Favorites, Account Suspension, Account Appeals |
| 🚧 Partially Implemented | 17 | Email Verification, KYC Submission, Admin Approval, Buyer Journey, Seller Journey, Agent Journey, Contractor Journey, Engineer Journey, Architect Journey, Lawyer Journey, Vendor Journey, Search & Discovery, Notifications, Reviews & Ratings, Escrow Payment, Wallet Top-Up, Withdrawal/Payouts, Admin Moderation, Audit Logging |
| 📋 Planned | 7 | Marketplace Product Posting, Service Posting, Messaging, Property Viewing Requests, Offers & Negotiation, (Forum — not listed as required) |

**Total documented: 32** (matching the 32 required workflows, with Account Recovery as an addition beyond the original 32 list)

### Fully functional end-to-end chains

| Chain | Status |
|-------|--------|
| Register → Onboard → Browse → Favorite → Inquiry | ✅ |
| Register as Seller → Onboard → KYC → Admin Approves → Create Listing → Publish | 🚧 (seller approval gap) |
| Register as Agent → Onboard → KYC → Admin Approves → List Property → Escrow → Commission | 🚧 (commission payment requires admin action) |
| Admin → Suspend → User Sees Reason → Appeal | ✅ |
| Password Forgot → Reset Email → New Password | ✅ |
| Create Escrow → Fund → Dispute → Admin Resolves | 🚧 (admin UI exists, but payment provider webhooks incomplete) |

### Broken workflows (blocking user journeys)

| # | Workflow | What's broken | Impact |
|---|----------|----------------|--------|
| B1 | Vendor Approval | `adminApproveProfessional` missing vendor branch → `vendor_profiles.is_verified` never set | Vendor cannot prove verified status to storage RLS for future product image uploads |
| B2 | Reviews | Gated on `service_requests.status='completed'`; no service request UI exists | Review system completely unreachable by end users |
| B3 | Notifications | Approval/rejection don't create notification rows | Users not notified of KYC decisions in-app |
| B4 | Moderator role | TypeScript `UserRole` type excludes `moderator` | Moderator cannot be assigned via UI; has no dashboard route |
| B5 | Seller `pending_verification` | No `completeSellerProfile` action to set `account_status = 'pending_verification'` | Sellers bypass the approval queue; admin doesn't know to review them |
| B6 | Escrow auto-release | `auto_release_at` date stored but no cron/pg_cron fires the release | Escrows never auto-release; require manual payer action |
| B7 | Property inquiries inbox | `property_inquiries` exist in DB but no seller inbox page | Sellers cannot read incoming inquiries |
| B8 | `admin_logs` metadata key | `adminSuspendAccount` writes `new_data` key; column is `metadata` | Inconsistent log structure; audit queries expecting `metadata` key fail |

### Missing workflows (spec referenced, not documented above)

| Workflow | Status | Notes |
|----------|--------|-------|
| Rental booking | 📋 | `rental_listings`, `rental_bookings` tables exist; no pages |
| Job posting & applications | 📋 | `jobs`, `job_applications` tables exist; no pages |
| Tender posting & bids | 📋 | `tenders`, `tender_bids` tables exist; no pages |
| Forum posts & comments | 📋 | `forum_posts`, `forum_comments` tables exist; no pages |
| Equipment rental | 📋 | `rental_categories` seeded; no listing/booking pages |
| Cart & checkout | 📋 | `cart_items` table exists; no cart UI |
| Report user/listing | 📋 | `moderation_reports` table exists; no report form UI |
| Platform settings management | 📋 | `platform_settings` table and `/admin/settings` page exist but write actions missing |
| Agency management | 📋 | `agencies` table exists; no agency creation/management pages |
| User session management | 📋 | `user_sessions` table exists; no UI |
