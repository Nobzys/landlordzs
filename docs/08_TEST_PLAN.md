# LANDLORDZS — End-to-End Test Plan

> **Generated:** 2026-07-13  
> **Mode:** CAUTIOUS IMPLEMENTATION — documentation only. No application code modified.  
> **Governing documents:** `00_PROJECT_CONSTITUTION.md` through `07_IMPLEMENTATION_ROADMAP.md`

---

## How to Use This Document

**Priority markers**

| Marker | Meaning |
|--------|---------|
| P1 | Critical — must pass before any deployment |
| P2 | High — must pass before a feature is merged |
| P3 | Medium — must pass before a release |
| P4 | Low — regression safety net; run nightly |

**Status field values:** `PASS` | `FAIL` | `BLOCKED` | `N/A`

**Test ID format:** `[SUITE]-[NUMBER]` — e.g. `AUTH-001`, `BUYER-005`

**Test environment requirements** are listed in Section 1. Each test lists its own preconditions.

---

## Section 1 — Test Environment Setup

### 1.1 Required Test Accounts

Seed the following accounts before running any suite. All passwords: `TestPass123!`

| Account alias | Email | Role | Status |
|---|---|---|---|
| `admin` | admin@test.landlordzs.com | admin | active |
| `buyer1` | buyer1@test.landlordzs.com | buyer | active |
| `buyer2` | buyer2@test.landlordzs.com | buyer | active |
| `seller1` | seller1@test.landlordzs.com | seller | active + is_verified |
| `seller2` | seller2@test.landlordzs.com | seller | pending_verification |
| `agent1` | agent1@test.landlordzs.com | agent | active + is_verified |
| `vendor1` | vendor1@test.landlordzs.com | vendor | active + is_verified |
| `contractor1` | contractor1@test.landlordzs.com | contractor | active + is_verified |
| `engineer1` | engineer1@test.landlordzs.com | engineer | active + is_verified |
| `architect1` | architect1@test.landlordzs.com | architect | active + is_verified |
| `lawyer1` | lawyer1@test.landlordzs.com | lawyer | active + is_verified |
| `suspended1` | suspended@test.landlordzs.com | buyer | suspended |
| `banned1` | banned@test.landlordzs.com | buyer | banned |
| `pending1` | pending@test.landlordzs.com | seller | pending_verification |
| `newuser` | newuser@test.landlordzs.com | — | not yet registered |

### 1.2 Required Seed Data

- At least 5 active property listings (owned by `seller1` and `agent1`)
- At least 1 property listing in `pending` status (submitted by `seller1`, awaiting admin approval)
- At least 1 KYC record in `pending` status (submitted by `pending1`)
- At least 1 KYC record in `rejected` status (for `seller2`)
- At least 1 `vendor_profiles` row for `vendor1` with `store_slug = 'test-store'`
- At least 3 products in `marketplace_products` for `vendor1`
- At least 1 `professional_profiles` row for each of: `contractor1`, `engineer1`, `architect1`, `lawyer1`
- At least 1 escrow in `funded` status between `buyer1` (payer) and `seller1` (payee)
- At least 1 wallet with balance > 0 for `seller1`, `contractor1`, `vendor1`
- Platform settings: `mtn_momo_enabled = true`, `platform_fee_percentage = 2.5`, `min_withdrawal_xaf = 5000`

### 1.3 Test Files

Upload the following to `/tests/fixtures/`:
- `valid_id_front.jpg` — a JPEG image, < 5 MB
- `valid_id_back.jpg` — a JPEG image, < 5 MB
- `business_reg.pdf` — a PDF document, < 10 MB
- `property_photo_1.jpg` to `property_photo_5.jpg` — JPEG images, < 5 MB each
- `large_file.jpg` — a file > 50 MB (for upload size limit testing)
- `malicious.html` — an HTML file (for MIME type testing)

### 1.4 Tools Required

- Browser: Chrome 120+ and Safari 17+ (for cross-browser)
- Mobile device or Chrome DevTools device emulation (iPhone 14, Pixel 7)
- Network throttle: Chrome DevTools → Slow 3G preset
- Accessibility: axe DevTools browser extension
- Postman or curl (for API/security tests)

---

## Section 2 — Authentication Test Suite (AUTH)

### AUTH-001
**Objective:** Successful login with valid credentials  
**Priority:** P1  
**Preconditions:** `buyer1` account exists and is active  
**Steps:**
1. Navigate to `/login`
2. Enter email: `buyer1@test.landlordzs.com`, password: `TestPass123!`
3. Click "Sign In"

**Expected result:** Redirected to `/buyer/favorites`. Dashboard sidebar visible. User name shown in sidebar.  
**Pass/Fail:** ___

---

### AUTH-002
**Objective:** Login fails with wrong password  
**Priority:** P1  
**Preconditions:** `buyer1` account exists  
**Steps:**
1. Navigate to `/login`
2. Enter email: `buyer1@test.landlordzs.com`, password: `WrongPassword!`
3. Click "Sign In"

**Expected result:** Error message shown ("Invalid email or password"). User stays on `/login`. No redirect.  
**Pass/Fail:** ___

---

### AUTH-003
**Objective:** Login fails for suspended account  
**Priority:** P1  
**Preconditions:** `suspended1` account exists with `account_status = 'suspended'`  
**Steps:**
1. Navigate to `/login`
2. Enter `suspended1` credentials
3. Click "Sign In"

**Expected result:** Login succeeds momentarily but middleware redirects to `/account/suspended`. Dashboard not accessible.  
**Pass/Fail:** ___

---

### AUTH-004
**Objective:** Login fails for banned account  
**Priority:** P1  
**Preconditions:** `banned1` account exists with `account_status = 'banned'`  
**Steps:**
1. Login with `banned1` credentials

**Expected result:** Redirected to `/account/banned`. "Account Permanently Banned" message. Sign out option visible. No appeal option.  
**Pass/Fail:** ___

---

### AUTH-005
**Objective:** Logout clears session  
**Priority:** P1  
**Preconditions:** `buyer1` is logged in  
**Steps:**
1. Click logout/sign out button in sidebar
2. Attempt to navigate to `/buyer/favorites`

**Expected result:** Redirected to `/login`. Session cookie cleared. Browser back button does not restore dashboard access.  
**Pass/Fail:** ___

---

### AUTH-006
**Objective:** Protected route redirects unauthenticated users  
**Priority:** P1  
**Preconditions:** No active session  
**Steps:**
1. In a new incognito window, navigate to `/admin`
2. Navigate to `/seller/listings`
3. Navigate to `/buyer/favorites`

**Expected result:** All three redirected to `/login?redirectTo=<original-path>`. After login, redirected to original path.  
**Pass/Fail:** ___

---

### AUTH-007
**Objective:** Role-based route protection — buyer cannot access seller routes  
**Priority:** P1  
**Preconditions:** `buyer1` is logged in  
**Steps:**
1. Navigate to `/seller/listings`
2. Navigate to `/agent/commissions`
3. Navigate to `/admin`

**Expected result:** All three redirect to `/buyer/favorites` (the buyer's dashboard). No access granted to foreign role routes.  
**Pass/Fail:** ___

---

### AUTH-008
**Objective:** Admin can access all role routes  
**Priority:** P1  
**Preconditions:** `admin` is logged in  
**Steps:**
1. Navigate to `/buyer/favorites`
2. Navigate to `/seller/listings`
3. Navigate to `/contractor`
4. Navigate to `/admin`

**Expected result:** All four pages load without redirect. Admin sees the content of each dashboard.  
**Pass/Fail:** ___

---

### AUTH-009
**Objective:** Pending user cannot access dashboard  
**Priority:** P1  
**Preconditions:** `pending1` account with `account_status = 'pending_verification'`  
**Steps:**
1. Login as `pending1`

**Expected result:** Redirected to `/account/pending`. Dashboard routes are blocked. "Upload Documents" CTA visible.  
**Pass/Fail:** ___

---

### AUTH-010
**Objective:** Session persists across browser tabs  
**Priority:** P2  
**Preconditions:** `buyer1` is logged in on Tab 1  
**Steps:**
1. Open new tab and navigate to `/buyer/favorites`

**Expected result:** Page loads without requiring login. Same session used.  
**Pass/Fail:** ___

---

## Section 3 — Registration Test Suite (REG)

### REG-001
**Objective:** Successful registration as Buyer  
**Priority:** P1  
**Preconditions:** `newuser` email not registered  
**Steps:**
1. Navigate to `/register`
2. Fill: Full Name "Test User", Email `newuser@test.landlordzs.com`, Password `TestPass123!`, Role "Buyer"
3. Click "Create Account"

**Expected result:** "Check your email" message shown. Email sent to `newuser`. `profiles` row created with `role='buyer'`, `account_status='pending_verification'`, `onboarding_completed=false`. `wallets` row created with `balance=0`.  
**Pass/Fail:** ___

---

### REG-002
**Objective:** Registration rejects duplicate email  
**Priority:** P1  
**Preconditions:** `buyer1` already registered  
**Steps:**
1. Navigate to `/register`
2. Fill form with `buyer1@test.landlordzs.com`
3. Submit

**Expected result:** Error message shown ("An account with this email already exists" or similar). No duplicate `auth.users` row created.  
**Pass/Fail:** ___

---

### REG-003
**Objective:** Registration validates password strength  
**Priority:** P2  
**Preconditions:** None  
**Steps:**
1. Navigate to `/register`
2. Enter password: `123` (too short)
3. Submit

**Expected result:** Zod/form validation error shown for password field. Form not submitted to server.  
**Pass/Fail:** ___

---

### REG-004
**Objective:** Registration validates required fields  
**Priority:** P2  
**Preconditions:** None  
**Steps:**
1. Navigate to `/register`
2. Submit form with all fields empty

**Expected result:** Validation errors shown for: Full Name required, Email required, Password required, Role required. No server request sent.  
**Pass/Fail:** ___

---

### REG-005
**Objective:** Registration as Seller triggers approval-required flow  
**Priority:** P1  
**Preconditions:** Fresh email address  
**Steps:**
1. Register with role = "Seller"
2. Confirm email
3. Complete onboarding (basic profile step)

**Expected result:** KYC upload step appears in onboarding. After KYC submission, `profiles.account_status = 'pending_verification'`. User redirected to `/account/pending`. Cannot access `/seller/listings`.  
**Pass/Fail:** ___

---

### REG-006
**Objective:** Registration as Contractor triggers professional profile + KYC flow  
**Priority:** P1  
**Preconditions:** Fresh email address  
**Steps:**
1. Register with role = "Contractor"
2. Confirm email
3. Complete basic profile step
4. Complete professional profile step (profession type, day rate, specialization, city)
5. Complete KYC upload step

**Expected result:** `professional_profiles` row created with `profession_type='contractor'`. `kyc_records` row created with `status='pending'`. User redirected to `/account/pending`.  
**Pass/Fail:** ___

---

### REG-007
**Objective:** Onboarding cannot be skipped  
**Priority:** P1  
**Preconditions:** New user registered but `onboarding_completed = false`  
**Steps:**
1. Login as newly registered user (before completing onboarding)
2. Navigate directly to `/buyer/favorites`

**Expected result:** Middleware redirects to `/onboarding`. Cannot bypass.  
**Pass/Fail:** ___

---

## Section 4 — Email Verification Test Suite (EMAILV)

### EMAILV-001
**Objective:** Email verification link activates account  
**Priority:** P1  
**Preconditions:** User registered but email not yet confirmed  
**Steps:**
1. Open confirmation email
2. Click the verification link
3. Observe redirect

**Expected result:** Redirected to `/verify-email?verified=true`. CheckCircle icon shown. "Continue to Setup" button leads to `/onboarding`.  
**Pass/Fail:** ___

---

### EMAILV-002
**Objective:** Expired verification link shows error  
**Priority:** P2  
**Preconditions:** A confirmation link older than 24 hours  
**Steps:**
1. Click an expired email verification link

**Expected result:** Error page shown on `/verify-email`. Option to request a new confirmation email.  
**Pass/Fail:** ___

---

### EMAILV-003
**Objective:** PKCE browser mismatch shows correct error  
**Priority:** P2  
**Preconditions:** User registered on Browser A; verification link opened in Browser B  
**Steps:**
1. Register on Chrome
2. Copy the verification link
3. Open it in Firefox (or incognito)

**Expected result:** `/verify-email?error=same_browser_required` shown. Distinct message explaining the PKCE browser requirement.  
**Pass/Fail:** ___

---

### EMAILV-004
**Objective:** Unverified user cannot log in  
**Priority:** P1  
**Preconditions:** User registered but email not confirmed  
**Steps:**
1. Attempt to login before clicking the confirmation email link

**Expected result:** Supabase Auth rejects login. Error shown: "Please confirm your email before signing in."  
**Pass/Fail:** ___

---

## Section 5 — Password Reset Test Suite (PWD)

### PWD-001
**Objective:** Successful password reset flow  
**Priority:** P1  
**Preconditions:** `buyer1` has a known email  
**Steps:**
1. Navigate to `/forgot-password`
2. Enter `buyer1@test.landlordzs.com`
3. Click "Send Reset Link"
4. Open email, click reset link
5. On `/reset-password`, enter new password `NewPass456!`
6. Submit

**Expected result:** Password updated. User redirected to login. Can log in with new password. Old password no longer works.  
**Pass/Fail:** ___

---

### PWD-002
**Objective:** Rate limiting on password reset requests  
**Priority:** P1  
**Preconditions:** `password_reset_rate_limits` table active  
**Steps:**
1. Navigate to `/forgot-password`
2. Submit the same email 4 times in quick succession

**Expected result:** After 3 requests (or per platform_settings threshold), further requests return a rate limit error. Error message indicates when to try again.  
**Pass/Fail:** ___

---

### PWD-003
**Objective:** Reset link with invalid token shows error  
**Priority:** P2  
**Preconditions:** None  
**Steps:**
1. Navigate to `/reset-password?token_hash=invalid123&type=recovery`

**Expected result:** Error message shown: "Invalid or expired reset link." Option to request a new one.  
**Pass/Fail:** ___

---

### PWD-004
**Objective:** Reset password validates password confirmation match  
**Priority:** P2  
**Preconditions:** Valid reset link  
**Steps:**
1. Open valid reset link
2. Enter `NewPass456!` as password
3. Enter `DifferentPass789!` as confirm password
4. Submit

**Expected result:** Client-side validation error shown: "Passwords do not match." Form not submitted.  
**Pass/Fail:** ___

---

## Section 6 — Profile Management Test Suite (PROFILE)

### PROFILE-001
**Objective:** User can update basic profile fields  
**Priority:** P2  
**Preconditions:** `buyer1` logged in  
**Steps:**
1. Navigate to account settings / profile page
2. Update Display Name to "Updated Buyer"
3. Update City to "Douala"
4. Update Bio to "Test bio text"
5. Save

**Expected result:** `profiles` row updated with new values. Sidebar shows updated name. Success toast shown.  
**Pass/Fail:** ___

---

### PROFILE-002
**Objective:** User can upload avatar  
**Priority:** P2  
**Preconditions:** `buyer1` logged in  
**Steps:**
1. Navigate to profile settings
2. Click avatar upload area
3. Select `valid_id_front.jpg` (< 5 MB JPEG)
4. Save

**Expected result:** Image uploaded to `user-avatars` bucket. `profiles.avatar_url` updated. New avatar displayed in sidebar and profile page.  
**Pass/Fail:** ___

---

### PROFILE-003
**Objective:** User cannot change their own role  
**Priority:** P1  
**Preconditions:** `buyer1` logged in  
**Steps:**
1. Attempt to PATCH `/api/profiles` with `{ role: 'admin' }` directly via Postman/curl, authenticated as `buyer1`

**Expected result:** Request rejected. RLS policy `profiles_update_own` prevents updating the `role` column. `profiles.role` remains `buyer`.  
**Pass/Fail:** ___

---

### PROFILE-004
**Objective:** User cannot set own `is_verified = true`  
**Priority:** P1  
**Preconditions:** `buyer1` logged in  
**Steps:**
1. Attempt direct Supabase client UPDATE: `UPDATE profiles SET is_verified = true WHERE id = <buyer1_id>` using `buyer1`'s auth token

**Expected result:** RLS policy blocks the update. `is_verified` remains `false` for `buyer1`.  
**Pass/Fail:** ___

---

### PROFILE-005
**Objective:** Professional profile step shown for professional roles  
**Priority:** P2  
**Preconditions:** New user registered as contractor, email confirmed  
**Steps:**
1. Login as new contractor
2. Progress through onboarding

**Expected result:** Step 2 shows professional profile form (profession type, company name, day rate, specializations, service areas). Step 3 shows KYC upload. Stepper shows 3 steps total.  
**Pass/Fail:** ___

---

## Section 7 — Admin / Super Admin Test Suite (ADMIN)

### ADMIN-001
**Objective:** Admin dashboard loads with real metrics  
**Priority:** P1  
**Preconditions:** `admin` logged in; seed data present  
**Steps:**
1. Navigate to `/admin`

**Expected result:** Metric cards show: Total Users, Active Properties, Pending Verifications, Active Escrows. Activity feed lists recent platform events. All counts match actual DB values via `get_admin_metrics()`.  
**Pass/Fail:** ___

---

### ADMIN-002
**Objective:** Admin can view paginated user list  
**Priority:** P1  
**Preconditions:** `admin` logged in  
**Steps:**
1. Navigate to `/admin/users`
2. Verify all seeded test users appear
3. Change page to page 2 (if > 20 users)

**Expected result:** User list shows name, email, role badge, status badge, join date. Pagination controls work. Role filter works.  
**Pass/Fail:** ___

---

### ADMIN-003
**Objective:** Admin can suspend a user  
**Priority:** P1  
**Preconditions:** `admin` logged in; `buyer1` active  
**Steps:**
1. Navigate to `/admin/users`
2. Find `buyer1`, click "Suspend"
3. Enter reason "Testing suspension"
4. Confirm

**Expected result:** `profiles.account_status = 'suspended'` for `buyer1`. `admin_logs` row inserted with action='suspend'. `account_notices` row inserted with type='suspension'. `buyer1` on next login redirected to `/account/suspended`.  
**Pass/Fail:** ___

---

### ADMIN-004
**Objective:** Admin can reactivate a suspended user  
**Priority:** P1  
**Preconditions:** `suspended1` exists with status='suspended'; `admin` logged in  
**Steps:**
1. Navigate to `/admin/users`, find `suspended1`
2. Click "Activate"
3. Confirm

**Expected result:** `profiles.account_status = 'active'`. `admin_logs` row inserted. `suspended1` can now log in and access their dashboard.  
**Pass/Fail:** ___

---

### ADMIN-005
**Objective:** Admin can change a user's role  
**Priority:** P1  
**Preconditions:** `admin` logged in; `buyer1` active  
**Steps:**
1. Navigate to `/admin/users`, find `buyer1`
2. Change role to "Seller"
3. Save

**Expected result:** `profiles.role = 'seller'` for `buyer1`. `buyer1` redirected to `/account/pending` on next login (seller requires verification). `admin_logs` row inserted.  
**Pass/Fail:** ___

---

### ADMIN-006
**Objective:** Admin cannot suspend themselves  
**Priority:** P1  
**Preconditions:** `admin` logged in  
**Steps:**
1. Navigate to `/admin/users`
2. Find the admin's own row

**Expected result:** "Suspend" button is absent or disabled for the admin's own row. Admin cannot self-suspend via UI.  
**Pass/Fail:** ___

---

### ADMIN-007
**Objective:** Admin can view pending verification queue  
**Priority:** P1  
**Preconditions:** `admin` logged in; at least one pending KYC exists  
**Steps:**
1. Navigate to `/admin/professionals`
2. View "Pending Verification" tab

**Expected result:** List shows users with `account_status='pending_verification'` and pending KYC records. Each row shows role, city, submitted date. Count matches DB.  
**Pass/Fail:** ___

---

### ADMIN-008
**Objective:** Admin can approve a professional  
**Priority:** P1  
**Preconditions:** `pending1` has submitted KYC; `admin` logged in  
**Steps:**
1. Navigate to `/admin/professionals`
2. Click "Approve" for `pending1`
3. Confirm

**Expected result:** `profiles.account_status = 'active'`, `profiles.is_verified = true`. KYC record `status = 'approved'`, `reviewed_by = admin_id`, `reviewed_at = now()`. Role-specific profile verified flag set. Notification created for `pending1`.  
**Pass/Fail:** ___

---

### ADMIN-009
**Objective:** Admin can reject a professional with reason  
**Priority:** P1  
**Preconditions:** A pending professional exists; `admin` logged in  
**Steps:**
1. Navigate to `/admin/professionals`
2. Click "Reject" for a pending professional
3. Enter reason "Document unclear — please re-upload"
4. Submit

**Expected result:** `kyc_records.status = 'rejected'`, `review_notes = 'Document unclear...'`. `account_notices` row inserted (type='rejection', message=reason). Notification created for the user. User sees rejection reason on `/account/pending`.  
**Pass/Fail:** ___

---

### ADMIN-010
**Objective:** Admin KYC document viewer works  
**Priority:** P1  
**Preconditions:** `pending1` has uploaded `valid_id_front.jpg` to `verification-documents` bucket; `admin` logged in  
**Steps:**
1. Navigate to `/admin/verifications` (or `/admin/professionals`)
2. Open detail view for `pending1`
3. Click on `national_id_front` document

**Expected result:** Document viewer modal opens. Image renders inline. Signed URL generated from `verification-documents` bucket (NOT `verification-documents-v2`). Download link works. Modal closable.  
**Pass/Fail:** ___

---

### ADMIN-011
**Objective:** Non-admin cannot access admin routes  
**Priority:** P1  
**Preconditions:** `buyer1` logged in  
**Steps:**
1. Navigate directly to `/admin`
2. Navigate to `/admin/users`

**Expected result:** Both redirected to `/buyer/favorites`. No admin data exposed.  
**Pass/Fail:** ___

---

### ADMIN-012
**Objective:** Admin platform metrics are accurate  
**Priority:** P2  
**Preconditions:** `admin` logged in; known seed data counts  
**Steps:**
1. Navigate to `/admin`
2. Compare "Total Users" metric to actual `SELECT COUNT(*) FROM profiles`
3. Compare "Pending Verifications" to `SELECT COUNT(*) FROM kyc_records WHERE status='pending'`

**Expected result:** All metrics match actual DB counts within a 1-second window (real-time, not stale cache).  
**Pass/Fail:** ___

---

### ADMIN-013
**Objective:** Admin can search users by email  
**Priority:** P2  
**Preconditions:** `admin` logged in  
**Steps:**
1. Navigate to `/admin/users`
2. Enter "buyer1@test" in search box
3. Submit

**Expected result:** Only `buyer1` appears in results. Other users filtered out. Case-insensitive match.  
**Pass/Fail:** ___

---

### ADMIN-014
**Objective:** Admin audit log records actions  
**Priority:** P2  
**Preconditions:** Admin has performed ADMIN-003 (suspend) in this test session  
**Steps:**
1. Navigate to `/admin/logs` (or `/admin/audit`)

**Expected result:** Suspension action from ADMIN-003 visible in log. Shows: actor (admin email), action ('suspend'), target user, timestamp, reason in metadata.  
**Pass/Fail:** ___

---

## Section 8 — Buyer Dashboard Test Suite (BUYER)

### BUYER-001
**Objective:** Buyer can view and browse properties  
**Priority:** P1  
**Preconditions:** `buyer1` logged in; at least 3 active properties seeded  
**Steps:**
1. Navigate to `/properties` (or the property browse page)
2. View property list

**Expected result:** All active properties displayed. PropertyCard shows: image, title, price, location, listing type badge, bedroom/bathroom count.  
**Pass/Fail:** ___

---

### BUYER-002
**Objective:** Buyer can save a property to favorites  
**Priority:** P1  
**Preconditions:** `buyer1` logged in; at least 1 active property  
**Steps:**
1. View a property listing
2. Click the heart/favorite icon

**Expected result:** `property_favorites` row created with `user_id=buyer1_id`. Heart icon fills/changes state. Property appears in `/buyer/favorites`.  
**Pass/Fail:** ___

---

### BUYER-003
**Objective:** Buyer can remove a property from favorites  
**Priority:** P2  
**Preconditions:** `buyer1` has at least 1 favorite  
**Steps:**
1. Navigate to `/buyer/favorites`
2. Click un-favorite / remove icon

**Expected result:** `property_favorites` row deleted. Property removed from favorites list. Count decrements.  
**Pass/Fail:** ___

---

### BUYER-004
**Objective:** Buyer can send a property inquiry  
**Priority:** P1  
**Preconditions:** `buyer1` logged in; at least 1 active property  
**Steps:**
1. Navigate to a property detail page
2. Fill inquiry form: "I'm interested in viewing this property"
3. Submit

**Expected result:** `property_inquiries` row created. Success message shown. Seller/agent receives notification (if Phase 18 implemented).  
**Pass/Fail:** ___

---

### BUYER-005
**Objective:** Buyer cannot create a property listing  
**Priority:** P1  
**Preconditions:** `buyer1` logged in  
**Steps:**
1. Navigate to `/seller/listings/new`

**Expected result:** Middleware redirects to `/buyer/favorites`. No property creation form accessible.  
**Pass/Fail:** ___

---

### BUYER-006
**Objective:** Buyer can view their sent inquiries  
**Priority:** P2  
**Preconditions:** `buyer1` has sent at least 1 inquiry (via BUYER-004)  
**Steps:**
1. Navigate to `/buyer/inquiries`

**Expected result:** Inquiry list shows: property title, message preview, sent date, status (pending/replied).  
**Pass/Fail:** ___

---

## Section 9 — Seller Dashboard Test Suite (SELLER)

### SELLER-001
**Objective:** Active seller can create a property listing  
**Priority:** P1  
**Preconditions:** `seller1` logged in (active + verified)  
**Steps:**
1. Navigate to `/seller/listings/new`
2. Fill all required fields: Title, Description, Price, City, Address, Type (sale), Listing Type (sale), Bedrooms (3), Bathrooms (2)
3. Upload 2 property photos
4. Submit

**Expected result:** `properties` row created with `owner_id=seller1_id`, `status='pending'` (requires admin approval). Property images in `property-images` bucket. Redirect to listings page. New listing visible in seller's listings list.  
**Pass/Fail:** ___

---

### SELLER-002
**Objective:** Pending seller cannot create a property listing  
**Priority:** P1  
**Preconditions:** `seller2` has `account_status='pending_verification'`  
**Steps:**
1. Login as `seller2`
2. Attempt to access `/seller/listings/new`

**Expected result:** Redirected to `/account/pending`. Cannot create listings until account is verified.  
**Pass/Fail:** ___

---

### SELLER-003
**Objective:** Seller can edit their own listing  
**Priority:** P1  
**Preconditions:** `seller1` logged in; has at least 1 listing  
**Steps:**
1. Navigate to `/seller/listings`
2. Click Edit on a listing
3. Update price from 50,000,000 to 55,000,000 XAF
4. Save

**Expected result:** `properties.price` updated. Edit page revalidated. Updated price shown in listing card.  
**Pass/Fail:** ___

---

### SELLER-004
**Objective:** Seller cannot edit another seller's listing  
**Priority:** P1  
**Preconditions:** `seller1` and `agent1` each have listings  
**Steps:**
1. Login as `seller1`
2. Attempt GET `/seller/listings/<agent1_listing_id>/edit`

**Expected result:** `notFound()` returned (404 page). RLS `prop_update` policy prevents updating listing not owned by `seller1`. No edit form shown.  
**Pass/Fail:** ___

---

### SELLER-005
**Objective:** Seller can view inquiries received on their listings  
**Priority:** P1  
**Preconditions:** `seller1` has a listing that received an inquiry from `buyer1`  
**Steps:**
1. Login as `seller1`
2. Navigate to `/seller/inquiries`

**Expected result:** Inquiry from `buyer1` visible. Shows buyer name, message, property title, date.  
**Pass/Fail:** ___

---

### SELLER-006
**Objective:** Seller can delete their own listing  
**Priority:** P2  
**Preconditions:** `seller1` has at least 2 listings  
**Steps:**
1. Navigate to `/seller/listings`
2. Click Delete on one listing
3. Confirm deletion

**Expected result:** `properties` row deleted (or status set to 'deleted'). Listing removed from seller's list. No longer visible in public browse.  
**Pass/Fail:** ___

---

## Section 10 — Agent Dashboard Test Suite (AGENT)

### AGENT-001
**Objective:** Agent can access both `/seller` and `/agent` routes  
**Priority:** P1  
**Preconditions:** `agent1` logged in (active + verified)  
**Steps:**
1. Navigate to `/seller/listings`
2. Navigate to `/agent/commissions`

**Expected result:** Both pages load without redirect. Agent sees their listings on `/seller/listings` and commissions on `/agent/commissions`.  
**Pass/Fail:** ___

---

### AGENT-002
**Objective:** Agent can create a property listing  
**Priority:** P1  
**Preconditions:** `agent1` logged in (active)  
**Steps:**
1. Navigate to `/seller/listings/new`
2. Complete listing creation form
3. Submit

**Expected result:** Listing created with `owner_id=agent1_id`. Same flow as SELLER-001.  
**Pass/Fail:** ___

---

### AGENT-003
**Objective:** Agent cannot access vendor or contractor routes  
**Priority:** P1  
**Preconditions:** `agent1` logged in  
**Steps:**
1. Navigate to `/vendor`
2. Navigate to `/contractor`

**Expected result:** Both redirect to `/agent/commissions` (or agent's default dashboard). No vendor/contractor content shown.  
**Pass/Fail:** ___

---

## Section 11 — Vendor Dashboard Test Suite (VENDOR)

### VENDOR-001
**Objective:** Active vendor can create a product listing  
**Priority:** P1  
**Preconditions:** `vendor1` logged in (active + is_verified + vendor_profiles row exists)  
**Steps:**
1. Navigate to `/vendor/products/new`
2. Fill: Title "Steel Rods 12mm", Category (select Structural Materials), Price 5000, Unit "per bundle", Stock 100
3. Upload 2 product images
4. Submit

**Expected result:** `marketplace_products` row created with `vendor_id=vendor1_id`, `is_available=true`. Product images in `marketplace-products` bucket. Product appears in vendor's product list.  
**Pass/Fail:** ___

---

### VENDOR-002
**Objective:** Vendor can toggle product availability  
**Priority:** P2  
**Preconditions:** `vendor1` has at least 1 product  
**Steps:**
1. Navigate to `/vendor/products`
2. Click toggle on a product to mark it unavailable

**Expected result:** `marketplace_products.is_available = false`. Product no longer shows in public catalogue.  
**Pass/Fail:** ___

---

### VENDOR-003
**Objective:** Vendor can view and manage orders  
**Priority:** P1  
**Preconditions:** `vendor1` has at least 1 order in `pending` status  
**Steps:**
1. Navigate to `/vendor/orders`
2. Click an order to view detail
3. Click "Confirm Order"

**Expected result:** Order visible with buyer info, items, total. After confirming: `orders.status = 'confirmed'`. Buyer notified.  
**Pass/Fail:** ___

---

### VENDOR-004
**Objective:** Vendor cannot see other vendors' orders  
**Priority:** P1  
**Preconditions:** Two vendors exist  
**Steps:**
1. Login as `vendor1`
2. Navigate to `/vendor/orders`
3. Note order IDs shown
4. Attempt direct Supabase SELECT for orders belonging to vendor2

**Expected result:** `vendor1` sees only their own orders. RLS `orders_vendor_select` policy blocks cross-vendor access.  
**Pass/Fail:** ___

---

## Section 12 — Professional Role Test Suites (CONTRACTOR, ENGINEER, ARCHITECT, LAWYER)

### PROF-001
**Objective:** Contractor dashboard loads with correct stats  
**Priority:** P1  
**Preconditions:** `contractor1` logged in (active + verified)  
**Steps:**
1. Navigate to `/contractor`

**Expected result:** ProfessionalDashboard renders: role-colored icon, VerificationBanner (active/green state), 4 stat cards (services offered, pending requests, completed jobs, wallet balance), availability toggle, quick action buttons.  
**Pass/Fail:** ___

---

### PROF-002
**Objective:** Engineer dashboard loads correctly  
**Priority:** P1  
**Preconditions:** `engineer1` logged in  
**Steps:**
1. Navigate to `/engineer`

**Expected result:** Same ProfessionalDashboard pattern. Engineer-specific color. Correct specialization shown.  
**Pass/Fail:** ___

---

### PROF-003
**Objective:** Architect dashboard loads correctly  
**Priority:** P1  
**Preconditions:** `architect1` logged in  
**Steps:**
1. Navigate to `/architect`

**Expected result:** ProfessionalDashboard renders with purple color scheme. Architect specializations shown.  
**Pass/Fail:** ___

---

### PROF-004
**Objective:** Lawyer dashboard loads correctly  
**Priority:** P1  
**Preconditions:** `lawyer1` logged in  
**Steps:**
1. Navigate to `/lawyer`

**Expected result:** ProfessionalDashboard renders with green color scheme. Lawyer specializations shown.  
**Pass/Fail:** ___

---

### PROF-005
**Objective:** Professional cannot access other professional routes  
**Priority:** P1  
**Preconditions:** `contractor1` logged in  
**Steps:**
1. Navigate to `/engineer`
2. Navigate to `/lawyer`

**Expected result:** Both redirect to `/contractor`. Cross-professional route access blocked.  
**Pass/Fail:** ___

---

### PROF-006
**Objective:** Availability toggle updates professional profile  
**Priority:** P2  
**Preconditions:** `contractor1` logged in; `professional_profiles.is_available = true`  
**Steps:**
1. Navigate to `/contractor`
2. Click availability toggle to set "Unavailable"

**Expected result:** `professional_profiles.is_available = false`. Toggle reflects new state. Professional no longer appears in active professionals search.  
**Pass/Fail:** ___

---

### PROF-007
**Objective:** Professional can add portfolio items  
**Priority:** P2  
**Preconditions:** `contractor1` logged in  
**Steps:**
1. Navigate to `/contractor/portfolio`
2. Click "Add Project"
3. Fill: Title "3-Bedroom Renovation", Description "Full renovation", Project Type "general_construction", Completed Date 2025-12-01, City "Yaoundé"
4. Upload 2 portfolio images
5. Submit

**Expected result:** `portfolio_items` row created. Portfolio images uploaded to `service-portfolios` bucket. New project visible in portfolio list.  
**Pass/Fail:** ___

---

## Section 13 — Property Management Test Suite (PROP)

### PROP-001
**Objective:** Property detail page loads all information  
**Priority:** P1  
**Preconditions:** At least 1 active property with images seeded  
**Steps:**
1. Navigate to `/properties/<id>` (or public property detail)

**Expected result:** PropertyGallery shows images in grid layout. Title, price, type, city, bedrooms, bathrooms, description displayed. Inquiry form visible. Map/location info shown. Favorite button functional.  
**Pass/Fail:** ___

---

### PROP-002
**Objective:** Property gallery lightbox works  
**Priority:** P2  
**Preconditions:** Property has at least 3 images  
**Steps:**
1. Navigate to property detail page
2. Click on a thumbnail image

**Expected result:** Lightbox/Dialog opens showing full-size image. Left/right navigation arrows visible. Image counter badge (e.g. "2 / 5"). X button closes lightbox.  
**Pass/Fail:** ___

---

### PROP-003
**Objective:** Property search filters work  
**Priority:** P1  
**Preconditions:** Multiple properties with different cities, types, prices seeded  
**Steps:**
1. Navigate to property browse page
2. Filter by City = "Yaoundé"
3. Filter by Type = "sale"
4. Filter by Price Max = 100,000,000 XAF

**Expected result:** Only properties matching ALL active filters returned. Clearing a filter expands results. Result count updates.  
**Pass/Fail:** ___

---

### PROP-004
**Objective:** Admin can approve a pending property  
**Priority:** P1  
**Preconditions:** `seller1` created a listing (SELLER-001); `admin` logged in  
**Steps:**
1. Navigate to `/admin` or admin property management
2. Find pending property
3. Approve it

**Expected result:** `properties.status = 'active'`. Property now visible in public browse. Seller notified.  
**Pass/Fail:** ___

---

### PROP-005
**Objective:** Pending properties not visible to public  
**Priority:** P1  
**Preconditions:** A property with `status='pending'` exists  
**Steps:**
1. In incognito (no session), navigate to `/properties`

**Expected result:** Pending properties not listed. Only `status='active'` properties shown.  
**Pass/Fail:** ___

---

### PROP-006
**Objective:** Property images upload to correct storage bucket  
**Priority:** P1  
**Preconditions:** `seller1` logged in  
**Steps:**
1. Create a new listing (SELLER-001 flow)
2. Upload `property_photo_1.jpg` through `property_photo_3.jpg`
3. After submission, check Supabase Storage → `property-images` bucket

**Expected result:** Files stored at path `{seller1_id}/{property_id}/{uuid}.jpg`. Signed/public URLs return valid images.  
**Pass/Fail:** ___

---

### PROP-007
**Objective:** Property creation validates required fields  
**Priority:** P2  
**Preconditions:** `seller1` logged in  
**Steps:**
1. Navigate to `/seller/listings/new`
2. Submit form with Title empty

**Expected result:** Zod validation error on Title field. Form not submitted. No `properties` row created.  
**Pass/Fail:** ___

---

### PROP-008
**Objective:** Maximum image upload limit enforced  
**Priority:** P2  
**Preconditions:** `seller1` logged in; `platform_settings.max_property_images = 20`  
**Steps:**
1. Navigate to `/seller/listings/new` or edit page
2. Attempt to upload 21 images

**Expected result:** Error shown: "Maximum 20 images allowed." 21st image rejected. Existing 20 retained.  
**Pass/Fail:** ___

---

## Section 14 — Marketplace Test Suite (MARKET)

### MARKET-001
**Objective:** Public can browse products without login  
**Priority:** P1  
**Preconditions:** At least 3 products in `marketplace_products` with `is_available=true`  
**Steps:**
1. In incognito, navigate to `/materials`

**Expected result:** Product grid visible. Category filter works. Search works. No login required to browse.  
**Pass/Fail:** ___

---

### MARKET-002
**Objective:** Authenticated user can add product to cart  
**Priority:** P1  
**Preconditions:** `buyer1` logged in; at least 1 available product  
**Steps:**
1. Navigate to a product detail page
2. Click "Add to Cart"
3. Navigate to `/buyer/cart`

**Expected result:** `cart_items` row created. Cart shows product name, price, quantity (1). Total calculated correctly. Cart badge in header shows count (1).  
**Pass/Fail:** ___

---

### MARKET-003
**Objective:** Guest cannot add to cart  
**Priority:** P1  
**Preconditions:** No active session  
**Steps:**
1. Navigate to a product page
2. Click "Add to Cart"

**Expected result:** Redirect to `/login?redirectTo=<product-page>`. `cart_items` row not created.  
**Pass/Fail:** ___

---

### MARKET-004
**Objective:** Cart quantity can be updated  
**Priority:** P2  
**Preconditions:** `buyer1` has item in cart  
**Steps:**
1. Navigate to `/buyer/cart`
2. Increase quantity to 3

**Expected result:** `cart_items.quantity = 3`. Total price updated (price × 3).  
**Pass/Fail:** ___

---

### MARKET-005
**Objective:** Checkout creates order records  
**Priority:** P1  
**Preconditions:** `buyer1` has items in cart; wallet has sufficient balance  
**Steps:**
1. Navigate to `/buyer/cart`
2. Click "Checkout"
3. Select payment method
4. Confirm order

**Expected result:** `orders` row created (one per vendor in cart). `order_items` rows created. `cart_items` cleared. Order confirmation page shown. Vendor receives notification.  
**Pass/Fail:** ___

---

## Section 15 — Service Requests Test Suite (SERVICES)

### SVC-001
**Objective:** Client can post a service request  
**Priority:** P1  
**Preconditions:** `buyer1` logged in  
**Steps:**
1. Navigate to `/services/new`
2. Fill: Title "Need plumbing repair", Category "plumbing", City "Douala", Budget "50000-100000", Deadline 2026-08-01, Description "Fix kitchen sink"
3. Submit

**Expected result:** `service_requests` row created with `client_id=buyer1_id`, `status='open'`. Request visible to matching contractors.  
**Pass/Fail:** ___

---

### SVC-002
**Objective:** Contractor can submit a quotation  
**Priority:** P1  
**Preconditions:** `contractor1` logged in; SVC-001 has been run  
**Steps:**
1. Navigate to `/contractor/requests`
2. Open the service request from SVC-001
3. Submit quotation: Price 75000 XAF, Delivery 3 days, Message "I can fix this tomorrow"
4. Submit

**Expected result:** `service_quotations` row created with `provider_id=contractor1_id`, `status='pending'`. Client (`buyer1`) sees new quotation on their request.  
**Pass/Fail:** ___

---

### SVC-003
**Objective:** Client can accept a quotation  
**Priority:** P1  
**Preconditions:** SVC-002 completed; `buyer1` logged in  
**Steps:**
1. Navigate to the service request from SVC-001
2. View quotations list
3. Click "Accept" on contractor1's quotation

**Expected result:** `service_quotations.status = 'accepted'` for contractor1's quote. All other quotes on this request set to `'declined'`. `service_contracts` row created. `service_requests.status = 'in_progress'`. Contractor notified.  
**Pass/Fail:** ___

---

### SVC-004
**Objective:** Completed service unlocks review  
**Priority:** P1  
**Preconditions:** SVC-003 completed; client marks service as done  
**Steps:**
1. `buyer1` marks the service request as completed
2. Navigate to `/account/reviews`

**Expected result:** `service_requests.status = 'completed'`. Service appears in "Pending Reviews" on `/account/reviews`. Review form visible for `contractor1`.  
**Pass/Fail:** ___

---

### SVC-005
**Objective:** Contractor cannot accept their own service request  
**Priority:** P1  
**Preconditions:** `contractor1` logged in  
**Steps:**
1. Attempt to create a service request and then submit a quotation for it from the same account

**Expected result:** RLS or server action logic prevents a contractor from acting as both client and provider on the same request.  
**Pass/Fail:** ___

---

## Section 17 — Messaging Test Suite (MSG)

### MSG-001
**Objective:** User can start a conversation  
**Priority:** P1  
**Preconditions:** `buyer1` and `seller1` both exist; messaging system implemented  
**Steps:**
1. Login as `buyer1`
2. Navigate to a seller's profile or property page
3. Click "Message Seller"

**Expected result:** New `conversations` row created. `conversation_participants` rows for both users. Redirected to `/messages/<conversation_id>`.  
**Pass/Fail:** ___

---

### MSG-002
**Objective:** User can send and receive messages in real-time  
**Priority:** P1  
**Preconditions:** `buyer1` and `seller1` in same conversation (MSG-001)  
**Steps:**
1. `buyer1` opens conversation in Tab 1
2. `seller1` opens same conversation in Tab 2
3. `buyer1` sends "Hello, is this property still available?"
4. Observe Tab 2 without refreshing

**Expected result:** Message appears in Tab 2 in real-time (Supabase Realtime subscription). `messages` row created. Sender sees message immediately. Receiver sees without refresh.  
**Pass/Fail:** ___

---

### MSG-003
**Objective:** Unread count updates on new message  
**Priority:** P2  
**Preconditions:** `seller1` receives a message from `buyer1`  
**Steps:**
1. Login as `seller1` in a separate session
2. `buyer1` sends a message
3. Observe seller1's notification bell/message badge

**Expected result:** Unread count increments on seller1's sidebar/header without page refresh.  
**Pass/Fail:** ___

---

### MSG-004
**Objective:** Users can only see their own conversations  
**Priority:** P1  
**Preconditions:** `buyer1` and `buyer2` each have separate conversations  
**Steps:**
1. Login as `buyer1`
2. Navigate to `/messages`
3. Attempt direct Supabase query for `buyer2`'s conversation ID

**Expected result:** Conversation list shows only `buyer1`'s conversations. RLS `conversations_participant_select` policy blocks cross-user access.  
**Pass/Fail:** ___

---

### MSG-005
**Objective:** File attachment uploads to chat-attachments bucket  
**Priority:** P2  
**Preconditions:** Users in a conversation  
**Steps:**
1. Click attachment icon in message input
2. Select `valid_id_front.jpg`
3. Send

**Expected result:** File uploaded to `chat-attachments` bucket. `message_attachments` row created. Image preview shown in thread. Recipient can download.  
**Pass/Fail:** ___

---

## Section 18 — Notifications Test Suite (NOTIFY)

### NOTIFY-001
**Objective:** Notification inbox shows all user notifications  
**Priority:** P1  
**Preconditions:** `buyer1` has received at least 1 notification (e.g. from an inquiry reply)  
**Steps:**
1. Login as `buyer1`
2. Navigate to `/account/notifications`

**Expected result:** List of notifications with: type icon, title, body text, timestamp, unread indicator. Correct notification type for each event.  
**Pass/Fail:** ___

---

### NOTIFY-002
**Objective:** Notification bell shows unread count  
**Priority:** P2  
**Preconditions:** `buyer1` has unread notifications  
**Steps:**
1. Login as `buyer1`
2. Check sidebar/header for notification bell

**Expected result:** Bell icon shows red badge with unread count matching `SELECT COUNT(*) FROM notifications WHERE user_id=buyer1_id AND is_read=false`.  
**Pass/Fail:** ___

---

### NOTIFY-003
**Objective:** Marking notification as read clears badge  
**Priority:** P2  
**Preconditions:** NOTIFY-001; unread notifications exist  
**Steps:**
1. Click a notification in the inbox

**Expected result:** `notifications.is_read = true`. Unread indicator removed on that notification. Badge count decrements by 1.  
**Pass/Fail:** ___

---

### NOTIFY-004
**Objective:** "Mark all as read" clears all unread notifications  
**Priority:** P2  
**Preconditions:** `buyer1` has multiple unread notifications  
**Steps:**
1. Navigate to `/account/notifications`
2. Click "Mark all as read"

**Expected result:** All `notifications.is_read = true` for `buyer1`. Badge count = 0. All unread indicators removed from list.  
**Pass/Fail:** ___

---

### NOTIFY-005
**Objective:** User cannot see other users' notifications  
**Priority:** P1  
**Preconditions:** `buyer1` and `buyer2` both have notifications  
**Steps:**
1. Login as `buyer1`
2. Attempt direct Supabase SELECT for `buyer2`'s notification IDs

**Expected result:** Zero rows returned. RLS `notifications_own` policy blocks cross-user reads.  
**Pass/Fail:** ___

---

## Section 18 — Reviews Test Suite (REVIEW)

### REVIEW-001
**Objective:** Completed service unlocks review submission  
**Priority:** P1  
**Preconditions:** SVC-004 completed; `buyer1` logged in  
**Steps:**
1. Navigate to `/account/reviews`
2. Find pending review for `contractor1`
3. Submit review: Rating 5, Title "Excellent work", Body "Fixed the issue quickly and professionally"

**Expected result:** `reviews` row created with `reviewer_id=buyer1_id`, `reviewed_id=contractor1_id`, `rating=5`, `is_verified=true`. `professional_profiles.rating_avg` and `rating_count` updated by DB trigger.  
**Pass/Fail:** ___

---

### REVIEW-002
**Objective:** Duplicate review prevented  
**Priority:** P1  
**Preconditions:** REVIEW-001 completed  
**Steps:**
1. Attempt to submit a second review for the same service request / contractor

**Expected result:** Error shown: "You have already reviewed this service." `reviews` unique constraint on `(reviewer_id, reviewed_id, service_request_id)` prevents duplicate.  
**Pass/Fail:** ___

---

### REVIEW-003
**Objective:** Review rating reflected on professional's public profile  
**Priority:** P2  
**Preconditions:** REVIEW-001 completed  
**Steps:**
1. Navigate to `contractor1`'s public profile

**Expected result:** Star rating displayed showing 5/5 (or average if multiple). Review text visible. Review count shown.  
**Pass/Fail:** ___

---

### REVIEW-004
**Objective:** Professional can respond to a review  
**Priority:** P2  
**Preconditions:** REVIEW-001 completed; `contractor1` logged in  
**Steps:**
1. Navigate to contractor's profile / reviews section
2. Click "Reply" on the review from `buyer1`
3. Enter response: "Thank you for your kind words!"
4. Submit

**Expected result:** `review_responses` row created. Response displayed below the review on the public profile. Response attributed to `contractor1`.  
**Pass/Fail:** ___

---

### REVIEW-005
**Objective:** Review cannot be submitted for an incomplete service  
**Priority:** P1  
**Preconditions:** A service_request exists with `status='in_progress'`  
**Steps:**
1. Login as the client
2. Attempt to navigate to review page for the in-progress service

**Expected result:** In-progress service does NOT appear in "Pending Reviews." Review form not accessible until service is completed.  
**Pass/Fail:** ___

---

## Section 19 — Verification Test Suite (VERIFY)

### VERIFY-001
**Objective:** User can submit KYC documents  
**Priority:** P1  
**Preconditions:** `seller2` logged in; `account_status = 'pending_verification'`  
**Steps:**
1. Navigate to `/account/verification`
2. Upload `valid_id_front.jpg` as "National ID Front"
3. Upload `valid_id_back.jpg` as "National ID Back"
4. Submit

**Expected result:** `kyc_records` row inserted with `status='pending'`. Files stored in `verification-documents` bucket at `{user_id}/{uuid}.jpg`. `profiles.account_status` remains `pending_verification`. User sees "Under Review" state on verification page.  
**Pass/Fail:** ___

---

### VERIFY-002
**Objective:** Rejected user can resubmit KYC  
**Priority:** P1  
**Preconditions:** `seller2` has `kyc_records.status = 'rejected'`  
**Steps:**
1. Login as `seller2`
2. Navigate to `/account/verification`
3. Upload new documents
4. Submit

**Expected result:** New `kyc_records` row inserted with `status='pending'`. `profiles.account_status` reset to `'pending_verification'` (NOT staying `suspended`). User sees "Under Review" state.  
**Pass/Fail:** ___

---

### VERIFY-003
**Objective:** Active accounts redirect away from verification page  
**Priority:** P1  
**Preconditions:** `seller1` logged in (active + verified)  
**Steps:**
1. Navigate directly to `/account/verification`

**Expected result:** Redirected to `seller1`'s default dashboard (`/seller/listings`). Verification page not shown to already-verified users.  
**Pass/Fail:** ___

---

### VERIFY-004
**Objective:** Documents stored in correct bucket  
**Priority:** P1  
**Preconditions:** VERIFY-001 completed  
**Steps:**
1. As `admin`, navigate to `/admin/verifications`
2. Open `seller2`'s KYC detail
3. Click on `national_id_front` document

**Expected result:** Document viewer loads image from `verification-documents` bucket (NOT `verification-documents-v2`). Signed URL is valid and expires in 3600 seconds.  
**Pass/Fail:** ___

---

### VERIFY-005
**Objective:** User cannot read other users' KYC documents  
**Priority:** P1  
**Preconditions:** `buyer1` and `seller2` both exist  
**Steps:**
1. Login as `buyer1`
2. Attempt Supabase SELECT: `SELECT * FROM kyc_records WHERE user_id = <seller2_id>`

**Expected result:** Zero rows returned. RLS `kyc_own_select` policy restricts reads to own records. `buyer1` cannot see `seller2`'s documents.  
**Pass/Fail:** ___

---

## Section 20 — Wallet Test Suite (WALLET)

### WALLET-001
**Objective:** User can view wallet balance  
**Priority:** P1  
**Preconditions:** `seller1` has wallet with balance > 0  
**Steps:**
1. Login as `seller1`
2. Navigate to `/account/wallet`

**Expected result:** WalletCard displays: Available Balance, Total Balance, In Escrow amount. Gradient card rendered. Balance matches DB `wallets.balance`.  
**Pass/Fail:** ___

---

### WALLET-002
**Objective:** Wallet created automatically on registration  
**Priority:** P1  
**Preconditions:** New user registered (REG-001 flow)  
**Steps:**
1. After registration and onboarding, navigate to `/account/wallet`

**Expected result:** Wallet shows balance of 0 XAF. `wallets` row exists with `balance=0`, `locked_balance=0`. Created by `on_profile_created` trigger.  
**Pass/Fail:** ___

---

### WALLET-003
**Objective:** User cannot view another user's wallet  
**Priority:** P1  
**Preconditions:** `buyer1` and `seller1` both exist  
**Steps:**
1. Login as `buyer1`
2. Attempt Supabase SELECT: `SELECT * FROM wallets WHERE user_id = <seller1_id>`

**Expected result:** Zero rows returned. RLS `wallets_own` policy blocks cross-user wallet access.  
**Pass/Fail:** ___

---

### WALLET-004
**Objective:** Payout request validates minimum withdrawal  
**Priority:** P1  
**Preconditions:** `seller1` logged in; `platform_settings.min_withdrawal_xaf = 5000`  
**Steps:**
1. Navigate to `/account/payouts`
2. Open withdraw dialog
3. Enter amount: 2000 XAF (below minimum)
4. Submit

**Expected result:** Validation error shown: "Minimum withdrawal is 5,000 XAF." Request not submitted. `payouts` row not created.  
**Pass/Fail:** ___

---

### WALLET-005
**Objective:** Payout request validates sufficient balance  
**Priority:** P1  
**Preconditions:** `seller1` has wallet with 10,000 XAF balance  
**Steps:**
1. Navigate to `/account/payouts`
2. Attempt to withdraw 50,000 XAF (more than balance)

**Expected result:** Error shown: "Insufficient balance." Request rejected. No `payouts` row created.  
**Pass/Fail:** ___

---

## Section 21 — Payments Test Suite (PAY)

### PAY-001
**Objective:** MTN MoMo payment initiation  
**Priority:** P1  
**Preconditions:** `buyer1` logged in; `platform_settings.mtn_momo_enabled = true`  
**Steps:**
1. Navigate to `/account/wallet`
2. Click "Top Up Wallet"
3. Select MTN MoMo
4. Enter amount: 10,000 XAF
5. Enter phone: 6XXXXXXXX
6. Submit

**Expected result:** `wallet_transactions` row created with `status='pending'`, `provider='mtn_momo'`. Payment prompt sent (MoMo push notification). Status polling begins. On success: `wallets.balance` increases by 10,000. Transaction status updated to `'completed'`.  
**Pass/Fail:** ___

---

### PAY-002
**Objective:** Failed payment shows retry option  
**Priority:** P2  
**Preconditions:** Payment provider returns failure for test number  
**Steps:**
1. Initiate MTN MoMo top-up with a test number that returns failure
2. Observe UI after webhook/polling receives failure

**Expected result:** `wallet_transactions.status = 'failed'`. Error message shown. "Try Again" button visible. `wallets.balance` unchanged.  
**Pass/Fail:** ___

---

### PAY-003
**Objective:** Platform fee (2.5%) deducted on transactions  
**Priority:** P1  
**Preconditions:** Escrow funded with 100,000 XAF; release triggered  
**Steps:**
1. Release escrow of 100,000 XAF
2. Check payee wallet balance after release

**Expected result:** Payee receives 97,500 XAF (100,000 minus 2.5%). `platform_fee_amount = 2,500`. Commission record created if agent involved. Fee tracked in `wallet_transactions`.  
**Pass/Fail:** ___

---

### PAY-004
**Objective:** Transaction history shows all wallet movements  
**Priority:** P2  
**Preconditions:** `seller1` has at least 2 transaction rows  
**Steps:**
1. Navigate to `/account/transactions`

**Expected result:** `TransactionList` shows all wallet_transactions: amount, type, provider, status, date. Credits shown in green, debits in red. Pagination works.  
**Pass/Fail:** ___

---

## Section 22 — Escrow Test Suite (ESCROW)

### ESCROW-001
**Objective:** Buyer can fund an escrow  
**Priority:** P1  
**Preconditions:** Escrow in `pending` status; `buyer1` is payer with sufficient wallet balance  
**Steps:**
1. Navigate to `/account/escrow/<id>`
2. Click "Fund Escrow"
3. Confirm (balance check passed)

**Expected result:** `escrow_accounts.status = 'funded'`. `wallets.locked_balance` increased for payer. Payee notified. Fund button replaced by "Funded" indicator.  
**Pass/Fail:** ___

---

### ESCROW-002
**Objective:** Payee can request release; payer must approve  
**Priority:** P1  
**Preconditions:** Escrow is funded; `seller1` is payee  
**Steps:**
1. Login as `seller1`
2. Navigate to `/account/escrow/<id>`
3. Click "Request Release"
4. Login as `buyer1`, navigate to same escrow
5. Click "Release Funds"

**Expected result:** After payer approves: `escrow_accounts.status = 'released'`. Platform fee deducted. Net amount credited to `seller1` wallet. Payer's `locked_balance` decremented.  
**Pass/Fail:** ___

---

### ESCROW-003
**Objective:** Buyer can dispute an escrow  
**Priority:** P1  
**Preconditions:** Escrow is funded  
**Steps:**
1. Login as `buyer1` (payer)
2. Navigate to escrow detail
3. Click "Dispute"
4. Enter dispute reason (at least 20 characters)
5. Submit

**Expected result:** `escrow_accounts.status = 'disputed'`, `disputed_at = now()`. Admin notified. Funds locked (neither party can release). Both parties see dispute status.  
**Pass/Fail:** ___

---

### ESCROW-004
**Objective:** Dispute reason minimum length enforced  
**Priority:** P2  
**Preconditions:** Funded escrow  
**Steps:**
1. Open dispute dialog
2. Enter reason "Short" (5 characters)
3. Submit

**Expected result:** Validation error: "Dispute reason must be at least 20 characters." Dispute not submitted.  
**Pass/Fail:** ___

---

### ESCROW-005
**Objective:** Third party cannot view or modify escrow  
**Priority:** P1  
**Preconditions:** Escrow between `buyer1` and `seller1`  
**Steps:**
1. Login as `buyer2` (not a party to this escrow)
2. Navigate to `/account/escrow/<escrow_id>`
3. Attempt Supabase SELECT for this escrow_id

**Expected result:** Page shows 404 or empty. RLS `escrow_parties_select` policy restricts access to payer and payee only.  
**Pass/Fail:** ___

---

### ESCROW-006
**Objective:** Auto-release respects platform setting  
**Priority:** P2  
**Preconditions:** Escrow with `auto_release_at = now() - 1 day`; cron job configured  
**Steps:**
1. Wait for cron to run (or trigger manually in test environment)
2. Check escrow status

**Expected result:** `escrow_accounts.status = 'released'`. Funds credited to payee. Auto-release logged in `admin_logs`.  
**Pass/Fail:** ___

---

## Section 23 — Analytics Test Suite (ANALYTICS)

### ANALYTICS-001
**Objective:** Admin analytics page renders with real data  
**Priority:** P2  
**Preconditions:** `admin` logged in; at least 1 week of seed data  
**Steps:**
1. Navigate to `/admin/analytics`

**Expected result:** Charts visible: new users over time, properties by status, revenue trend, escrow activity. Date range filter changes chart data.  
**Pass/Fail:** ___

---

### ANALYTICS-002
**Objective:** Seller listing view count increments  
**Priority:** P3  
**Preconditions:** A property listing exists  
**Steps:**
1. Navigate to property detail page as `buyer1`
2. Navigate to same page as `buyer2`

**Expected result:** `properties.views_count` increments with each unique visitor. Seller sees updated view count on their listings page.  
**Pass/Fail:** ___

---

## Section 24 — File Uploads & Storage Test Suite (UPLOAD)

### UPLOAD-001
**Objective:** File too large is rejected  
**Priority:** P1  
**Preconditions:** `seller1` logged in  
**Steps:**
1. Navigate to property listing form
2. Attempt to upload `large_file.jpg` (> 50 MB)

**Expected result:** Upload rejected before or after transfer. Error shown: "File too large. Maximum size is X MB." No file stored in bucket.  
**Pass/Fail:** ___

---

### UPLOAD-002
**Objective:** Unsupported MIME type rejected  
**Priority:** P1  
**Preconditions:** `seller1` logged in  
**Steps:**
1. Navigate to property listing form
2. Attempt to upload `malicious.html`

**Expected result:** Upload rejected. Error shown: "Unsupported file type. Please upload an image." No HTML stored in property-images bucket.  
**Pass/Fail:** ___

---

### UPLOAD-003
**Objective:** Storage bucket paths follow naming convention  
**Priority:** P2  
**Preconditions:** `seller1` uploads an avatar image  
**Steps:**
1. Upload avatar image as `seller1`
2. Check Supabase Storage `user-avatars` bucket

**Expected result:** File stored at `{seller1_user_id}/{uuid}.jpg`. URL structure matches `user-avatars/{user_id}/{uuid}`.  
**Pass/Fail:** ___

---

### UPLOAD-004
**Objective:** Verification documents inaccessible to unauthenticated users  
**Priority:** P1  
**Preconditions:** A KYC document exists in `verification-documents` bucket  
**Steps:**
1. Obtain the full storage path of a KYC document
2. Attempt to access it directly as an unauthenticated request (no token)

**Expected result:** Access denied. Storage RLS `lzs_verifydoc_select` policy requires `is_moderator()`. 403 or 401 returned.  
**Pass/Fail:** ___

---

### UPLOAD-005
**Objective:** Property images accessible publicly  
**Priority:** P1  
**Preconditions:** An active property has uploaded images  
**Steps:**
1. Copy the public URL of a property image
2. Open in incognito (no session)

**Expected result:** Image loads successfully. `property-images` bucket is configured for public read access for active listings.  
**Pass/Fail:** ___

---

## Section 25 — Permissions & RLS Test Suite (PERM)

### PERM-001
**Objective:** Buyer cannot INSERT into `properties` table  
**Priority:** P1  
**Preconditions:** `buyer1` has auth token  
**Steps:**
1. Using Supabase JS client with `buyer1`'s session, attempt:
   `supabase.from('properties').insert({ title: 'Hacked Property', ... })`

**Expected result:** `INSERT` blocked. Error: "new row violates row-level security policy". `prop_insert` policy requires `is_property_creator() AND has_active_account()`. Buyer role returns `false` for `is_property_creator()`.  
**Pass/Fail:** ___

---

### PERM-002
**Objective:** User cannot UPDATE another user's profile  
**Priority:** P1  
**Preconditions:** `buyer1` and `buyer2` exist  
**Steps:**
1. As `buyer1`, attempt: `supabase.from('profiles').update({ full_name: 'Hacked' }).eq('id', buyer2_id)`

**Expected result:** Zero rows affected. RLS `profiles_update_own` policy uses `auth.uid() = id`.  
**Pass/Fail:** ___

---

### PERM-003
**Objective:** User cannot DELETE another user's property  
**Priority:** P1  
**Preconditions:** `seller1` and `agent1` each have a listing  
**Steps:**
1. As `seller1`, attempt: `supabase.from('properties').delete().eq('id', <agent1_listing_id>)`

**Expected result:** Zero rows deleted. RLS `prop_delete` policy enforces `auth.uid() = owner_id`.  
**Pass/Fail:** ___

---

### PERM-004
**Objective:** Only admin can read all profiles  
**Priority:** P1  
**Preconditions:** `buyer1` and `admin` both exist  
**Steps:**
1. As `buyer1`, query: `supabase.from('profiles').select('*')` — note count
2. As `admin`, query same

**Expected result:** `buyer1` can SELECT all public profile fields but NOT protected fields (e.g., account_status internal details). `admin` (via `profiles_admin_all` policy) gets ALL rows and ALL fields including protected ones.  
**Pass/Fail:** ___

---

### PERM-005
**Objective:** `get_admin_metrics()` RPC blocked for non-admin  
**Priority:** P1  
**Preconditions:** `buyer1` has auth token  
**Steps:**
1. As `buyer1`, call: `supabase.rpc('get_admin_metrics')`

**Expected result:** Exception raised: "Access denied. Admin only." Function returns error. SECURITY DEFINER guard blocks non-admin callers.  
**Pass/Fail:** ___

---

### PERM-006
**Objective:** Admin logs not readable by regular users  
**Priority:** P1  
**Preconditions:** `admin_logs` has rows; `buyer1` exists  
**Steps:**
1. As `buyer1`, query: `supabase.from('admin_logs').select('*')`

**Expected result:** Zero rows returned. No RLS policy grants buyer SELECT on `admin_logs`.  
**Pass/Fail:** ___

---

## Section 26 — Security Test Suite (SEC)

### SEC-001
**Objective:** No XSS via property description field  
**Priority:** P1  
**Preconditions:** `seller1` can create listings  
**Steps:**
1. Create property with description: `<script>alert('xss')</script>Test Description`
2. View the property detail page as `buyer1`

**Expected result:** Script tag rendered as escaped text, NOT executed. No alert dialog appears. React's default escaping prevents XSS. No `dangerouslySetInnerHTML` in use on unescaped content.  
**Pass/Fail:** ___

---

### SEC-002
**Objective:** SQL injection via search field blocked  
**Priority:** P1  
**Preconditions:** Property browse page with search  
**Steps:**
1. Enter in search field: `'; DROP TABLE properties; --`
2. Submit

**Expected result:** Query parameterization (Supabase client uses prepared statements) prevents injection. Search returns no results or empty list. `properties` table unaffected.  
**Pass/Fail:** ___

---

### SEC-003
**Objective:** CSRF protection on server actions  
**Priority:** P1  
**Preconditions:** `admin` is logged in  
**Steps:**
1. Craft a cross-origin form POST to a server action endpoint (e.g., suspend user)
2. Submit from a different origin

**Expected result:** Next.js server actions validate `Origin` header. Cross-origin request rejected with 403 or ignored. Action does not execute.  
**Pass/Fail:** ___

---

### SEC-004
**Objective:** Rate limiting on sign-up prevents account farming  
**Priority:** P1  
**Preconditions:** Rate limit configured for `signUp`  
**Steps:**
1. Submit `/register` form 6 times in rapid succession from same IP

**Expected result:** After threshold (e.g. 5 per hour), rate limit error shown. Further registrations blocked temporarily. Supabase Auth built-in rate limiting applies.  
**Pass/Fail:** ___

---

### SEC-005
**Objective:** `createAdminClient()` not used in client components  
**Priority:** P1  
**Preconditions:** Codebase accessible  
**Steps:**
1. Run: `grep -r 'createAdminClient' src/components/`
2. Run: `grep -r 'createAdminClient' src/app/` — look for any `'use client'` files importing it

**Expected result:** Zero matches in any client component (`'use client'` directive). `createAdminClient` only used in server actions and server-side route handlers.  
**Pass/Fail:** ___

---

### SEC-006
**Objective:** Environment variables not exposed to client  
**Priority:** P1  
**Preconditions:** Application running  
**Steps:**
1. In browser console: `console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)`
2. View page source for any embedded secrets

**Expected result:** `undefined` for all server-only env vars. Only `NEXT_PUBLIC_*` variables exposed. `SUPABASE_SERVICE_ROLE_KEY` never appears in client JavaScript.  
**Pass/Fail:** ___

---

### SEC-007
**Objective:** Suspended user cannot make API calls  
**Priority:** P1  
**Preconditions:** `suspended1` has a valid session cookie  
**Steps:**
1. With a cached session for `suspended1`, make a Supabase query
2. Attempt to navigate to `/buyer/favorites`

**Expected result:** Middleware detects `account_status = 'suspended'` on every request. Session invalidated. Redirected to `/account/suspended`. API calls still blocked at RLS level even if session persists.  
**Pass/Fail:** ___

---

### SEC-008
**Objective:** File path traversal in storage prevented  
**Priority:** P1  
**Preconditions:** `buyer1` has auth token  
**Steps:**
1. Attempt storage upload to path: `../../admin/secrets.txt`

**Expected result:** Supabase Storage normalizes or rejects path traversal attempts. File not stored at traversal path. RLS policy on bucket enforces `{user_id}/` prefix only.  
**Pass/Fail:** ___

---

## Section 27 — Mobile Responsiveness Test Suite (MOBILE)

### MOBILE-001
**Objective:** Login page renders correctly on mobile  
**Priority:** P2  
**Preconditions:** Chrome DevTools → iPhone 14 preset (390×844)  
**Steps:**
1. Navigate to `/login`
2. Check layout

**Expected result:** Auth card centered, max-width respected, no horizontal overflow. Email/password fields full-width. Submit button accessible. No content cut off.  
**Pass/Fail:** ___

---

### MOBILE-002
**Objective:** Dashboard sidebar converts to mobile drawer  
**Priority:** P1  
**Preconditions:** `buyer1` logged in; mobile viewport  
**Steps:**
1. Navigate to `/buyer/favorites` on mobile viewport
2. Check sidebar

**Expected result:** Desktop sidebar hidden. Hamburger menu button visible. Tapping hamburger opens sidebar in a Sheet overlay. Nav items accessible. Close button closes the sheet.  
**Pass/Fail:** ___

---

### MOBILE-003
**Objective:** Property grid collapses to single column on mobile  
**Priority:** P2  
**Preconditions:** Property browse page; mobile viewport  
**Steps:**
1. Navigate to property browse page on mobile

**Expected result:** Properties listed in 1 column. On tablet (768px): 2 columns. On desktop: 3 columns. No horizontal overflow at any breakpoint.  
**Pass/Fail:** ___

---

### MOBILE-004
**Objective:** Property gallery adapts on mobile  
**Priority:** P2  
**Preconditions:** Property detail page with images; mobile viewport  
**Steps:**
1. Navigate to a property detail page on mobile

**Expected result:** Gallery shows single full-width image (not 3-column desktop grid). Lightbox opens full-screen on mobile. Navigation arrows accessible by touch.  
**Pass/Fail:** ___

---

### MOBILE-005
**Objective:** Forms are usable on mobile  
**Priority:** P2  
**Preconditions:** Mobile viewport  
**Steps:**
1. Navigate to `/register` on mobile
2. Attempt to fill and submit the form

**Expected result:** All input fields tap-to-focus correctly. No virtual keyboard overlap hides submit button. Form submits successfully. No horizontal overflow.  
**Pass/Fail:** ___

---

### MOBILE-006
**Objective:** Tables scroll horizontally on mobile  
**Priority:** P2  
**Preconditions:** Admin user list page; mobile viewport  
**Steps:**
1. Login as admin on mobile viewport
2. Navigate to `/admin/users`

**Expected result:** Table is contained within `overflow-x: auto` wrapper. Horizontal scroll available for table. Page body does NOT scroll horizontally.  
**Pass/Fail:** ___

---

### MOBILE-007
**Objective:** Mobile padding prevents content touching screen edges  
**Priority:** P3  
**Preconditions:** Mobile viewport (390px)  
**Steps:**
1. Navigate across several dashboard pages on mobile

**Expected result:** All content has at least 16px left/right padding. No text or buttons touching screen edge. `pt-14` padding at top prevents content behind mobile header.  
**Pass/Fail:** ___

---

## Section 28 — Performance Test Suite (PERF)

### PERF-001
**Objective:** Property list page loads within acceptable time  
**Priority:** P2  
**Preconditions:** 50+ properties seeded; production-like environment  
**Steps:**
1. Navigate to property browse page
2. Measure time to LCP (Largest Contentful Paint) using Chrome DevTools Performance tab

**Expected result:** LCP < 2.5 seconds on a fast connection. First Contentful Paint < 1.5 seconds.  
**Pass/Fail:** ___

---

### PERF-002
**Objective:** Admin dashboard loads within acceptable time  
**Priority:** P2  
**Preconditions:** 500+ users seeded; `get_admin_metrics()` called  
**Steps:**
1. Navigate to `/admin` and measure total load time

**Expected result:** Page fully interactive within 3 seconds. `get_admin_metrics()` RPC completes in < 500ms.  
**Pass/Fail:** ___

---

### PERF-003
**Objective:** Page loads gracefully on Slow 3G  
**Priority:** P3  
**Preconditions:** Chrome DevTools → Network → Slow 3G throttle  
**Steps:**
1. Navigate to property browse page under throttle
2. Observe loading states

**Expected result:** Loading skeleton (Skeleton component) displayed while content loads. Page not blank or unusable. Core content (property list) arrives within 8 seconds on Slow 3G.  
**Pass/Fail:** ___

---

### PERF-004
**Objective:** Image thumbnails appropriately sized  
**Priority:** P3  
**Preconditions:** Property with uploaded images  
**Steps:**
1. Open Network tab in Chrome DevTools
2. Navigate to property browse page
3. Filter by Images

**Expected result:** Property card thumbnails load images ≤ 200 KB each. `sizes` attribute correctly set on `<Image>`. No full-resolution image downloaded for thumbnail display.  
**Pass/Fail:** ___

---

### PERF-005
**Objective:** No memory leaks from Realtime subscriptions  
**Priority:** P3  
**Preconditions:** Messaging or notifications implemented  
**Steps:**
1. Open `/messages` page
2. Navigate away to `/buyer/favorites`
3. Check Chrome DevTools → Memory for retained Supabase Realtime channels

**Expected result:** Realtime channel unsubscribed on component unmount (`useEffect` cleanup). Memory usage does not grow unboundedly over multiple navigations.  
**Pass/Fail:** ___

---

## Section 29 — Property Manager, Maintenance, Cleaning Services (PLANNED ROLES)

> **Note:** These roles are 📋 Planned — not yet in the DB. Tests are written for future implementation validation.

### PMMAINT-001
**Objective:** Property Manager role can be registered  
**Priority:** P2** (when implemented)  
**Preconditions:** Phase 12 implemented; `property_manager` in user_role enum  
**Steps:**
1. Navigate to `/register`
2. Select role "Property Manager"
3. Complete onboarding

**Expected result:** `profiles.role = 'property_manager'`. Professional profile created. Onboarding includes professional details. Redirected to `/account/pending` for verification.  
**Pass/Fail:** ___

---

### PMMAINT-002
**Objective:** Maintenance role can be registered  
**Priority:** P2** (when implemented)  
**Preconditions:** Phase 13 implemented  
**Steps:**
1. Register as "Maintenance Service"
2. Complete onboarding

**Expected result:** `profiles.role = 'maintenance_service'`. Dashboard at `/maintenance` accessible after approval.  
**Pass/Fail:** ___

---

### PMMAINT-003
**Objective:** Cleaning Services role can be registered  
**Priority:** P2** (when implemented)  
**Preconditions:** Phase 14 implemented  
**Steps:**
1. Register as "Cleaning Service"
2. Complete onboarding

**Expected result:** `profiles.role = 'cleaning_service'`. Dashboard at `/cleaning-services` accessible after approval.  
**Pass/Fail:** ___

---

## Section 30 — Account Status & Appeals Test Suite (APPEALS)

### APPEALS-001
**Objective:** Suspended user can submit an appeal  
**Priority:** P1  
**Preconditions:** `suspended1` exists with `account_status = 'suspended'`  
**Steps:**
1. Login as `suspended1`
2. Navigate to `/account/suspended`
3. Enter appeal text: "I did not violate any rules. Please review my case."
4. Submit appeal

**Expected result:** `account_appeals` row created with `user_id=suspended1_id`, `status='pending'`, appeal message stored. UI switches to "Appeal submitted — under review" state. Submit form hidden.  
**Pass/Fail:** ___

---

### APPEALS-002
**Objective:** Admin can review and approve an appeal  
**Priority:** P1  
**Preconditions:** APPEALS-001 completed; `admin` logged in  
**Steps:**
1. Navigate to `/admin/users/<suspended1_id>`
2. View pending appeal
3. Click "Approve Appeal"

**Expected result:** `account_appeals.status = 'reviewed'`. `profiles.account_status = 'active'`. `suspended1` can now log in and access their dashboard.  
**Pass/Fail:** ___

---

### APPEALS-003
**Objective:** Banned account has no appeal option  
**Priority:** P1  
**Preconditions:** `banned1` logged in  
**Steps:**
1. Navigate to `/account/banned`

**Expected result:** No appeal form visible. Page shows "Account Permanently Banned" with support email link only. `account_status = 'banned'` is final — no UI to contest.  
**Pass/Fail:** ___

---

## Section 31 — Onboarding & Account Notices Test Suite (ONBOARD)

### ONBOARD-001
**Objective:** Onboarding stepper shows correct steps per role  
**Priority:** P1  
**Preconditions:** New buyer registered, email confirmed  
**Steps:**
1. Login after confirmation, reach `/onboarding`

**Expected result:** 2-step flow: Step 1 (Basic Profile), Step 2 confirmation. No KYC step for buyer. Stepper shows 2 dots at bottom.  
**Pass/Fail:** ___

---

### ONBOARD-002
**Objective:** Professional role onboarding shows 3 steps  
**Priority:** P1  
**Preconditions:** New contractor registered, email confirmed  
**Steps:**
1. Login, reach `/onboarding` as contractor

**Expected result:** 3-step flow: Step 1 (Basic Profile), Step 2 (Professional Profile), Step 3 (KYC Upload). Stepper shows 3 dots. Completed steps show green CheckCircle2 icon.  
**Pass/Fail:** ___

---

### ONBOARD-003
**Objective:** Rejection notice displayed on pending page  
**Priority:** P1  
**Preconditions:** `seller2` has `kyc_records.status = 'rejected'` with `review_notes = 'Document unclear'`  
**Steps:**
1. Login as `seller2`
2. Navigate to `/account/pending`

**Expected result:** Rejection reason "Document unclear" displayed. "Upload Documents" / "Resubmit" CTA visible. Correction request form shown. No approval yet message.  
**Pass/Fail:** ___

---

---

# Section 32 — Smoke Test Checklist

> Run this checklist after every deployment to verify core functionality is working. Estimated time: **15–20 minutes**.

## Authentication & Access

- [ ] `/login` loads without errors
- [ ] Login with valid credentials redirects to correct role dashboard
- [ ] Invalid credentials show error (no redirect)
- [ ] Unauthenticated `/admin` access redirects to `/login`
- [ ] Unauthenticated `/buyer/favorites` access redirects to `/login`
- [ ] Logout clears session and redirects to `/login`

## Registration

- [ ] `/register` page loads
- [ ] Registration form submits without errors
- [ ] "Check your email" state shown after submit
- [ ] Email confirmation link works (redirects to `/verify-email?verified=true`)
- [ ] Onboarding page loads after email confirmation

## Public Pages

- [ ] `/` (root) redirects authenticated users to their dashboard
- [ ] `/` redirects unauthenticated users to `/login`
- [ ] `/properties` loads (if implemented) or redirects gracefully
- [ ] `/login`, `/register`, `/forgot-password` all load without JS errors

## Admin Dashboard

- [ ] `/admin` loads with metric cards (not blank)
- [ ] `/admin/users` loads paginated user list
- [ ] `/admin/professionals` loads pending verification queue
- [ ] Admin can view at least 1 KYC document signed URL
- [ ] Admin can approve/reject a pending professional

## Buyer Core Flow

- [ ] `/buyer/favorites` loads (may be empty but no error)
- [ ] Property inquiry form submits successfully
- [ ] Favorite icon toggles on a property listing

## Seller Core Flow

- [ ] `/seller/listings` loads for active seller
- [ ] `/seller/listings/new` form loads with all required fields
- [ ] Property creation form validates required fields

## Professional Dashboards

- [ ] `/contractor` loads `ProfessionalDashboard` component
- [ ] `/engineer` loads `ProfessionalDashboard` component
- [ ] `/architect` loads `ProfessionalDashboard` component
- [ ] `/lawyer` loads `ProfessionalDashboard` component

## Wallet & Payments

- [ ] `/account/wallet` loads showing balance for authenticated user
- [ ] `/account/transactions` loads transaction list (may be empty)
- [ ] `/account/escrow` loads escrow list (may be empty)

## Account Management

- [ ] `/account/verification` loads for pending users
- [ ] `/account/suspended` loads for suspended users
- [ ] `/account/banned` loads for banned users (no appeal form)

---

# Section 33 — Full Regression Checklist

> Run before any feature branch is merged to `main`. Estimated time: **2–3 hours** (manual) or **30 minutes** (automated with Playwright).

## Authentication & Session Management

- [ ] AUTH-001: Valid login → correct dashboard redirect
- [ ] AUTH-002: Invalid credentials → error, no redirect
- [ ] AUTH-003: Suspended account → `/account/suspended`
- [ ] AUTH-004: Banned account → `/account/banned`
- [ ] AUTH-005: Logout clears session
- [ ] AUTH-006: Protected routes redirect unauthenticated users (with `redirectTo`)
- [ ] AUTH-007: Role-based route protection (buyer blocked from seller/admin routes)
- [ ] AUTH-008: Admin can access all routes
- [ ] AUTH-009: Pending user blocked from dashboard
- [ ] AUTH-010: Session persists across tabs

## Registration & Email Verification

- [ ] REG-001: New buyer registration → email sent → onboarding
- [ ] REG-002: Duplicate email rejected
- [ ] REG-003: Weak password rejected client-side
- [ ] REG-004: Required fields validated
- [ ] REG-005: Seller registration → KYC flow → pending state
- [ ] REG-006: Contractor registration → 3-step onboarding
- [ ] REG-007: Onboarding cannot be skipped
- [ ] EMAILV-001: Email confirmation link works
- [ ] EMAILV-004: Unconfirmed user cannot login

## Password & Account Recovery

- [ ] PWD-001: Full password reset flow works
- [ ] PWD-002: Rate limit applied to reset requests
- [ ] PWD-003: Invalid reset token shows error

## Profile & Permissions

- [ ] PROFILE-001: User can update name/city/bio
- [ ] PROFILE-002: Avatar upload works
- [ ] PROFILE-003: User cannot change own role
- [ ] PROFILE-004: User cannot set own `is_verified = true`
- [ ] PERM-001: Buyer cannot INSERT properties
- [ ] PERM-002: User cannot UPDATE another user's profile
- [ ] PERM-003: User cannot DELETE another user's property
- [ ] PERM-004: Non-admin cannot read all profiles (protected fields)
- [ ] PERM-005: `get_admin_metrics()` blocked for non-admin
- [ ] PERM-006: `admin_logs` not readable by regular users

## Admin Operations

- [ ] ADMIN-001: Dashboard shows real metrics
- [ ] ADMIN-002: User list paginated
- [ ] ADMIN-003: Admin can suspend user (logs written, status updated, notice created)
- [ ] ADMIN-004: Admin can reactivate suspended user
- [ ] ADMIN-005: Admin can change user role
- [ ] ADMIN-006: Admin cannot suspend themselves
- [ ] ADMIN-007: Pending verification queue accurate
- [ ] ADMIN-008: Approve professional (all role branches work: seller, vendor, agent, contractor, engineer, architect, lawyer)
- [ ] ADMIN-009: Reject professional with reason (notice created)
- [ ] ADMIN-010: KYC document viewer uses correct bucket (`verification-documents`, not `verification-documents-v2`)
- [ ] ADMIN-011: Non-admin blocked from admin routes

## Properties

- [ ] SELLER-001: Active seller can create listing
- [ ] SELLER-002: Pending seller cannot create listing
- [ ] SELLER-003: Seller can edit own listing
- [ ] SELLER-004: Seller cannot edit another seller's listing
- [ ] SELLER-006: Seller can delete own listing
- [ ] PROP-002: Property gallery lightbox navigates between images
- [ ] PROP-003: Property search filters return correct results
- [ ] PROP-004: Admin can approve pending property
- [ ] PROP-005: Pending properties not visible to public
- [ ] PROP-006: Property images stored in `property-images` bucket
- [ ] PROP-007: Property form validates required fields
- [ ] PROP-008: Max image count enforced (20)

## Buyer Flow

- [ ] BUYER-002: Buyer can save favorite
- [ ] BUYER-003: Buyer can unsave favorite
- [ ] BUYER-004: Buyer can send inquiry
- [ ] BUYER-005: Buyer cannot access listing creation

## Wallet, Payments & Escrow

- [ ] WALLET-001: Wallet balance visible
- [ ] WALLET-002: Wallet created automatically on registration
- [ ] WALLET-003: Wallet RLS blocks cross-user access
- [ ] WALLET-004: Payout below minimum rejected
- [ ] WALLET-005: Payout above balance rejected
- [ ] PAY-003: 2.5% platform fee deducted on escrow release
- [ ] ESCROW-001: Buyer can fund escrow
- [ ] ESCROW-002: Escrow release flow works
- [ ] ESCROW-003: Buyer can dispute escrow
- [ ] ESCROW-004: Dispute reason minimum length enforced
- [ ] ESCROW-005: Third party cannot view escrow

## Verification & KYC

- [ ] VERIFY-001: User can submit KYC documents
- [ ] VERIFY-002: Rejected user can resubmit (status resets to pending_verification)
- [ ] VERIFY-003: Active accounts redirect from verification page
- [ ] VERIFY-004: Documents in correct bucket
- [ ] VERIFY-005: User cannot read other users' KYC records

## Security

- [ ] SEC-001: XSS in description field prevented
- [ ] SEC-002: SQL injection in search field blocked
- [ ] SEC-005: `createAdminClient()` not in any client component
- [ ] SEC-006: Server-side env vars not exposed to client
- [ ] SEC-007: Suspended session blocked at middleware level

## File Uploads & Storage

- [ ] UPLOAD-001: Oversized files rejected
- [ ] UPLOAD-002: Unsupported MIME types rejected
- [ ] UPLOAD-003: Storage paths follow naming convention
- [ ] UPLOAD-004: Verification documents inaccessible without auth
- [ ] UPLOAD-005: Property images publicly accessible

## Mobile Responsiveness

- [ ] MOBILE-001: Login page renders on iPhone 14 (390px)
- [ ] MOBILE-002: Dashboard sidebar converts to Sheet drawer on mobile
- [ ] MOBILE-003: Property grid collapses to 1 column on mobile
- [ ] MOBILE-005: Forms usable on mobile (no keyboard overlap)

## Account Status

- [ ] APPEALS-001: Suspended user can submit appeal
- [ ] APPEALS-003: Banned account has no appeal option
- [ ] ONBOARD-001: Buyer gets 2-step onboarding
- [ ] ONBOARD-002: Contractor gets 3-step onboarding
- [ ] ONBOARD-003: Rejection reason shown on pending page

---

# Section 34 — Release Checklist

> Run this checklist before every public release (production deployment). All items must pass or have an accepted risk sign-off.

## Pre-Release: Code Quality

- [ ] `npx tsc --noEmit` passes with zero TypeScript errors
- [ ] `npm run build` completes without errors
- [ ] `npm test` passes all unit tests (100% of existing test suite)
- [ ] `grep -r 'console.log' src/` returns no debug logs in production code
- [ ] `grep -r 'TODO\|FIXME\|HACK' src/` reviewed; none are critical blockers
- [ ] No hardcoded test credentials in source (run: `grep -r 'TestPass123\|test@\|admin@local' src/`)

## Pre-Release: Database

- [ ] `supabase db push` completes without "migration history conflict" error (Task 26.5)
- [ ] `supabase db diff` shows zero untracked schema differences
- [ ] All new migrations reviewed for: no `DROP TABLE`, no `DROP COLUMN`, no `ALTER TABLE ... DROP`
- [ ] All new RLS policies reviewed: SELECT, INSERT, UPDATE, DELETE explicitly granted (no implicit allows)
- [ ] `VERIFY_DOCS_BUCKET` constant equals `'verification-documents'` (not `'verification-documents-v2'`)
- [ ] `platform_settings` table has correct production values: `platform_fee_percentage = 2.5`, `mtn_momo_enabled = true`, `stripe_enabled = false`, `min_withdrawal_xaf = 5000`

## Pre-Release: Security

- [ ] `createAdminClient()` usages audited — none in client components (SEC-005)
- [ ] All server actions protected by auth check: `if (!profile || profile.role !== 'admin') ...` for admin actions
- [ ] Environment variables verified in production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`
- [ ] No `NEXT_PUBLIC_` prefix on service role key or other secrets
- [ ] Storage bucket policies reviewed: `verification-documents` bucket NOT public; `property-images` bucket public only for approved listings

## Pre-Release: Smoke Tests

- [ ] Full Smoke Test Checklist (Section 32) completed and all items PASS
- [ ] ADMIN-010 specifically verified (KYC document bucket name correct)
- [ ] VERIFY-002 specifically verified (KYC resubmission resets account_status)

## Pre-Release: Critical Bug Fixes

- [ ] Task 1.1 (bucket name fix) confirmed deployed
- [ ] Task 1.2 (seller/vendor approval branches) confirmed deployed
- [ ] Task 1.3 (KYC resubmission resets status) confirmed deployed
- [ ] Task 1.4 (admin_logs metadata key) confirmed deployed

## Pre-Release: Cross-Browser & Device

- [ ] Chrome (latest) — smoke tests pass
- [ ] Safari (latest) — login, registration, property browse tested
- [ ] Firefox (latest) — login, registration tested
- [ ] iPhone 14 viewport (390×844) — MOBILE-001 through MOBILE-003 pass
- [ ] Android Pixel 7 viewport (412×915) — login and dashboard tested

## Pre-Release: Performance

- [ ] PERF-001: Property list page LCP < 2.5 seconds
- [ ] PERF-002: Admin dashboard load < 3 seconds
- [ ] No N+1 query regressions on admin/users or admin/professionals pages

## Pre-Release: Regression Suite

- [ ] Full Regression Checklist (Section 33) completed
- [ ] All P1 tests: PASS
- [ ] All P2 tests: PASS or documented with accepted risk
- [ ] Zero P1 tests with status FAIL or BLOCKED (no exceptions for release)
- [ ] Any BLOCKED tests have documented workaround and owner assigned

## Pre-Release: Final Sign-Off

| Check | Owner | Status |
|-------|-------|--------|
| TypeScript build passes | Developer | |
| Unit tests green | Developer | |
| Regression suite complete | QA | |
| Security review complete | Lead Developer | |
| DB migrations reviewed | Lead Developer | |
| Product smoke test | Product Owner | |
| Performance acceptable | Developer | |
| **Release approved** | Product Owner | |

---

## Appendix A — Test ID Index

| Suite | IDs | Count |
|-------|-----|-------|
| AUTH — Authentication | AUTH-001 to AUTH-010 | 10 |
| REG — Registration | REG-001 to REG-007 | 7 |
| EMAILV — Email Verification | EMAILV-001 to EMAILV-004 | 4 |
| PWD — Password Reset | PWD-001 to PWD-004 | 4 |
| PROFILE — Profile Management | PROFILE-001 to PROFILE-005 | 5 |
| ADMIN — Admin / Super Admin | ADMIN-001 to ADMIN-014 | 14 |
| BUYER — Buyer Dashboard | BUYER-001 to BUYER-006 | 6 |
| SELLER — Seller Dashboard | SELLER-001 to SELLER-006 | 6 |
| AGENT — Agent Dashboard | AGENT-001 to AGENT-003 | 3 |
| VENDOR — Vendor Dashboard | VENDOR-001 to VENDOR-004 | 4 |
| PROF — Professional Roles | PROF-001 to PROF-007 | 7 |
| PROP — Property Management | PROP-001 to PROP-008 | 8 |
| MARKET — Marketplace | MARKET-001 to MARKET-005 | 5 |
| SVC — Service Requests | SVC-001 to SVC-005 | 5 |
| MSG — Messaging | MSG-001 to MSG-005 | 5 |
| NOTIFY — Notifications | NOTIFY-001 to NOTIFY-005 | 5 |
| REVIEW — Reviews | REVIEW-001 to REVIEW-005 | 5 |
| VERIFY — Verification | VERIFY-001 to VERIFY-005 | 5 |
| WALLET — Wallet | WALLET-001 to WALLET-005 | 5 |
| PAY — Payments | PAY-001 to PAY-004 | 4 |
| ESCROW — Escrow | ESCROW-001 to ESCROW-006 | 6 |
| ANALYTICS — Analytics | ANALYTICS-001 to ANALYTICS-002 | 2 |
| UPLOAD — File Uploads & Storage | UPLOAD-001 to UPLOAD-005 | 5 |
| PERM — Permissions & RLS | PERM-001 to PERM-006 | 6 |
| SEC — Security | SEC-001 to SEC-008 | 8 |
| MOBILE — Mobile Responsiveness | MOBILE-001 to MOBILE-007 | 7 |
| PERF — Performance | PERF-001 to PERF-005 | 5 |
| PMMAINT — Planned Roles | PMMAINT-001 to PMMAINT-003 | 3 |
| APPEALS — Account Status & Appeals | APPEALS-001 to APPEALS-003 | 3 |
| ONBOARD — Onboarding & Notices | ONBOARD-001 to ONBOARD-003 | 3 |
| **TOTAL** | | **177** |

---

## Appendix B — Priority Distribution

| Priority | Count | Description |
|----------|-------|-------------|
| P1 | ~90 | Must pass before any deployment |
| P2 | ~65 | Must pass before feature merge |
| P3 | ~22 | Must pass before release |
| P4 | 0 | (Nightly regression; expand as needed) |

---

## Appendix C — Known Gaps (Tests Written for Unimplemented Features)

These tests are BLOCKED until the corresponding phase is implemented:

| Test IDs | Blocked on |
|----------|-----------|
| SVC-001 to SVC-005 | Phase 8 (Service Request Flow) |
| MSG-001 to MSG-005 | Phase 17 (Messaging) |
| NOTIFY-001 to NOTIFY-005 | Phase 18 (Notifications) |
| REVIEW-001 to REVIEW-005 | Phase 19 (Reviews — gated on Phase 8) |
| MARKET-001 to MARKET-005 | Phase 15 (Marketplace) |
| ANALYTICS-001 | Phase 24 (Analytics) |
| ESCROW-006 | Phase 23 (Escrow auto-release) |
| PMMAINT-001 to PMMAINT-003 | Phase 12-14 (New roles) |

All other tests can run against the current codebase after Phase 1 (Critical Bugs) is resolved.

---

*This test plan is a living document. Add new test cases when new features are implemented. Mark BLOCKED tests as PASS or FAIL once their prerequisite phase ships.*
