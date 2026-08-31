# LANDLORDZS — UI Design System

> **Generated:** 2026-07-13  
> **Mode:** CAUTIOUS IMPLEMENTATION — documentation only. No application code was modified.  
> **Scope:** Every implemented page, every reusable component, all design tokens, and a full gap analysis.

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Typography](#2-typography)
3. [Color System](#3-color-system)
4. [Spacing & Layout](#4-spacing--layout)
5. [Border & Shadow](#5-border--shadow)
6. [Animation & Transition](#6-animation--transition)
7. [Responsive Rules](#7-responsive-rules)
8. [Page Layouts](#8-page-layouts)
9. [Reusable Components — UI Primitives](#9-reusable-components--ui-primitives)
10. [Reusable Components — Domain](#10-reusable-components--domain)
11. [Public Pages](#11-public-pages)
12. [Authentication Pages](#12-authentication-pages)
13. [Onboarding](#13-onboarding)
14. [Account Pages (Shared)](#14-account-pages-shared)
15. [Buyer Dashboard](#15-buyer-dashboard)
16. [Seller Dashboard](#16-seller-dashboard)
17. [Agent Dashboard](#17-agent-dashboard)
18. [Vendor Dashboard](#18-vendor-dashboard)
19. [Contractor Dashboard](#19-contractor-dashboard)
20. [Engineer Dashboard](#20-engineer-dashboard)
21. [Architect Dashboard](#21-architect-dashboard)
22. [Lawyer Dashboard](#22-lawyer-dashboard)
23. [Property Manager Dashboard](#23-property-manager-dashboard)
24. [Maintenance Dashboard](#24-maintenance-dashboard)
25. [Cleaning Services Dashboard](#25-cleaning-services-dashboard)
26. [Admin Dashboard](#26-admin-dashboard)
27. [Super Admin Dashboard](#27-super-admin-dashboard)
28. [Missing Pages](#28-missing-pages)
29. [Missing Components](#29-missing-components)
30. [Duplicate Components](#30-duplicate-components)
31. [UI Inconsistencies](#31-ui-inconsistencies)
32. [Recommended Implementation Order](#32-recommended-implementation-order)

---

## 1. Design Tokens

Source files: `src/app/globals.css`, `tailwind.config.js`

All design tokens are CSS custom properties defined on `:root`. Tailwind resolves them via `hsl(var(--token))`. No raw color values appear in component files.

### CSS Custom Properties (Light Mode Only)

```css
/* Backgrounds */
--background:        0 0% 100%;          /* pure white */
--foreground:        222.2 84% 4.9%;     /* near-black text */
--card:              0 0% 100%;          /* card background */
--card-foreground:   222.2 84% 4.9%;

/* Brand */
--primary:           221.2 83.2% 53.3%; /* #3b82f6 blue */
--primary-foreground:210 40% 98%;       /* near-white on blue */

/* Neutral surfaces */
--secondary:         210 40% 96.1%;     /* light blue-gray */
--secondary-foreground: 222.2 47.4% 11.2%;
--muted:             210 40% 96.1%;     /* same as secondary */
--muted-foreground:  215.4 16.3% 46.9%;/* gray text */
--accent:            210 40% 96.1%;     /* same as muted */
--accent-foreground: 222.2 47.4% 11.2%;

/* Feedback */
--destructive:       0 84.2% 60.2%;     /* red */
--destructive-foreground: 210 40% 98%;

/* Borders & inputs */
--border:            214.3 31.8% 91.4%; /* light gray border */
--input:             214.3 31.8% 91.4%;
--ring:              221.2 83.2% 53.3%; /* focus ring = primary */

/* Radius */
--radius:            0.5rem;            /* 8px base */
```

> **Dark mode:** NOT defined. No `@media (prefers-color-scheme: dark)` block, no `.dark` class. The app is light-mode only.

### Tailwind Border Radius Scale

| Token | Value | Resolved |
|-------|-------|---------|
| `rounded-lg` | `var(--radius)` | 8px |
| `rounded-md` | `calc(var(--radius) - 2px)` | 6px |
| `rounded-sm` | `calc(var(--radius) - 4px)` | 4px |
| `rounded-xl` | 12px (Tailwind default) | 12px |
| `rounded-2xl` | 16px (Tailwind default) | 16px |
| `rounded-full` | 9999px | pill |

---

## 2. Typography

Source: `src/app/layout.tsx`

| Property | Value |
|---------|-------|
| Font family | Inter (Google Fonts, latin subset, CSS variable: `--font-inter`) |
| Font delivery | `next/font/google` with `display: 'swap'` |
| Applied via | `className={inter.variable}` on `<html>` → `font-sans` |
| Base size | Tailwind default 16px |
| Language | `lang="en"` |
| OG locale | `fr_CM` (Cameroon French) |

### Title Template

```
<title>%s — LANDLORDZS</title>
```

All pages set `metadata.title` as the segment; the root layout appends ` — LANDLORDZS`.

### Scale in Use

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Sub-labels, badges, helper text |
| `text-sm` | 14px | Body, form labels, nav items, card metadata |
| `text-base` | 16px | Default, card titles |
| `text-lg` | 18px | Section headings |
| `text-xl` | 20px | Sub-page headings |
| `text-2xl` | 24px | Page H1 headings |
| `text-3xl` | 30px | Large stats (wallet balance) |
| `text-4xl` | 36px | Hero/escrow amounts |

### Weight in Use

| Class | Weight | Usage |
|-------|--------|-------|
| `font-medium` | 500 | Nav items, labels, badge text |
| `font-semibold` | 600 | Section titles, card titles, stat values |
| `font-bold` | 700 | Page H1, hero numbers |

---

## 3. Color System

### Brand Palette

| Name | Hex approx | Usage |
|------|-----------|-------|
| Primary blue | `#3b82f6` | Buttons, active nav, links, focus rings |
| Primary dark (gradient end) | `#1e3a8a` | WalletCard gradient, theme meta color |
| Destructive red | `#f87171` | Error states, delete buttons, dispute |
| Emerald green | various | Verified badge, success states |
| Amber/yellow | various | Pending, warning states, vendor header |
| Blue-50/100/200 | shades | Info banners (VerificationBanner pending) |
| Red-50/100/200 | shades | Error banners (VerificationBanner rejected) |
| Green-50/100 | shades | Success banners (VerificationBanner approved) |

### Semantic Status Colors

| Status | Color | Component |
|--------|-------|-----------|
| `active` | emerald | account status, verified badge |
| `pending` / `pending_verification` | amber | banners, badges |
| `suspended` | red | account status page |
| `banned` | red | account status page |
| `sale` | `blue-600` | PropertyCard listing type |
| `rent` | `emerald-600` | PropertyCard listing type |
| `shortlet` | `amber-500` | PropertyCard listing type |

### Role Colors (ProfessionalDashboard)

| Role | Header color |
|------|-------------|
| contractor | orange |
| engineer | blue |
| architect | purple |
| lawyer | green |

### Listing Status Badges (seller/listings)

| Status | Color |
|--------|-------|
| `draft` | gray |
| `pending_review` | amber |
| `active` | emerald |
| `under_offer` | blue |
| `sold` / `rented` | purple |
| `archived` | red |
| `rejected` | red |
| `expired` | yellow |
| `shortlet_booked` | teal |

---

## 4. Spacing & Layout

### Page Content Container

| Context | Container |
|---------|-----------|
| Default page (wallet, transactions) | `max-w-3xl mx-auto px-4 py-8` |
| Wide page (listings, properties browse) | `max-w-7xl mx-auto` |
| Narrow page (profile, verification, reviews) | `max-w-2xl mx-auto px-4 py-8` |
| Extra narrow (verification docs) | `max-w-xl mx-auto px-4 py-8` |
| Account status pages (banned/suspended/pending) | `max-w-md w-full text-center` centered via flex |

### Sidebar Layout

| Breakpoint | Sidebar | Content |
|-----------|---------|---------|
| `< lg` (< 1024px) | Hidden; hamburger in top bar | Full width |
| `>= lg` | `w-64 h-screen sticky top-0` | Remaining width |

### Standard Sections

- `space-y-6`: page-level section gap
- `space-y-4`: within-section gap (form groups, card stacks)
- `space-y-3`: tight lists, action rows
- `gap-4`: grid gaps
- `p-4` / `p-6` / `p-8`: card padding (small / medium / auth card)
- `px-3 py-2`: form input padding
- `px-4 py-3`: compact banner padding

---

## 5. Border & Shadow

### Card Surfaces

| Element | Classes |
|---------|---------|
| Standard card | `rounded-xl border bg-card shadow-sm` |
| Card hover | `hover:shadow-md transition-shadow` |
| Auth card | `rounded-2xl border bg-background p-8 shadow-lg` |
| Status banner | `rounded-xl border border-{color}-200 bg-{color}-50` |
| Input fields | `rounded-md border` |
| Nav items | `rounded-lg` |

### Separator

`<Separator>` from shadcn/ui — used in escrow detail page between timeline and actions.

---

## 6. Animation & Transition

| Effect | Classes | Used In |
|--------|---------|---------|
| Image zoom on hover | `group-hover:scale-105 transition-transform duration-300` | PropertyCard image |
| Shadow lift on hover | `transition-shadow hover:shadow-md` | PropertyCard container |
| Thumbnail zoom | `hover:scale-105 transition-transform duration-200` | PropertyGallery thumbnails |
| Button loading spinner | `animate-spin` | LoginForm, RegisterForm submit |
| Skeleton pulse | `animate-pulse` | EscrowDetailPage loading, WalletCard skeleton |
| Color transitions | `transition-colors` | Nav links, stepper circles |

---

## 7. Responsive Rules

### Breakpoints

Standard Tailwind breakpoints used throughout:

| Prefix | Min-width | Primary use |
|--------|----------|-------------|
| `sm` | 640px | Form width hints, stepper connector width |
| `md` | 768px | Grid column changes (PropertyGallery) |
| `lg` | 1024px | Sidebar visibility; property detail 3-column grid |

### Responsive Patterns

**Sidebar navigation:**
- `< lg`: Hidden sidebar; fixed top bar (`h-14`) with hamburger menu triggering Sheet drawer
- `>= lg`: Visible sticky sidebar (`w-64`); no hamburger

**Property detail page (`/properties/[id]`):**
- Mobile: single column stack
- `lg`: `grid-cols-3`; main content `col-span-2`; sidebar inquiry form `col-span-1`

**PropertyCard grid (PropertyGrid component):**
- Mobile: 1 column
- `sm`: 2 columns
- `lg`: 3 columns (inferred from `max-w-7xl` container + grid)

**PropertyGallery:**
- `>0 thumbnails`: `grid-cols-3 grid-rows-2 h-[420px]`; primary image `col-span-2 row-span-2`
- `0 thumbnails`: single `col-span-3 h-72` block

**EscrowDetailPage party cards:**
- `grid-cols-2 gap-4` (always side-by-side)

**OnboardingFlow step connector:**
- Mobile: `w-16`; `sm`: `w-24`

**Mobile behavior:**
- All pages use `px-4` horizontal padding at minimum
- No horizontal scroll; all content constrained
- Forms stack vertically on mobile
- Grids collapse to single column

---

## 8. Page Layouts

### 8.1 Root Layout (`/`)

**File:** `src/app/layout.tsx`  
**Behavior:** No UI rendered. Server component. Smart redirect:
- Authenticated → `ROLE_DASHBOARDS[role]`
- Unauthenticated → `/login`

### 8.2 Auth Layout

**File:** `src/app/(auth)/layout.tsx`  
**URL pattern:** `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account-recovery`, `/verify-email`, `/confirm`

```
Outer: flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12
  Logo (above card, centered)
  Card: w-full max-w-md rounded-2xl border bg-background p-8 shadow-lg
    [page content slot]
  Copyright footer (below card, centered, text-sm text-muted-foreground)
```

**Mobile:** Full height centered card, `px-4` prevents edge touching.

### 8.3 Dashboard Layout

**File:** `src/app/(dashboard)/layout.tsx`  
**URL pattern:** `/buyer/*`, `/seller/*`, `/agent/*`, `/vendor/*`, `/contractor/*`, `/engineer/*`, `/architect/*`, `/lawyer/*`, `/admin/*`, `/account/*`

```
flex h-screen overflow-hidden
  DashboardSidebar (hidden on mobile, w-64 on desktop)
  main: flex-1 overflow-y-auto
    Mobile top bar (lg:hidden): h-14 border-b bg-card fixed top-0 inset-x-0 z-50
      Hamburger → Sheet with sidebar content
    Content area (pt-14 on mobile / pt-0 on desktop)
      [page content slot]
```

### 8.4 Marketing / Public Layout

**File:** `src/app/(marketing)/layout.tsx` (not individually read; inferred from property pages)  
**URL pattern:** `/properties`, `/properties/[id]`  
**Behavior:** Standard page layout without dashboard sidebar. Public access.

---

## 9. Reusable Components — UI Primitives

Source: `src/components/ui/`  
All are shadcn/ui components. Styled via CSS variables.

| Component | File | Usage in LANDLORDZS |
|-----------|------|---------------------|
| `Button` | `button.tsx` | Every page; variants: `default`, `outline`, `ghost`, `destructive`, `secondary`; sizes: `default`, `sm`, `icon` |
| `Input` | `input.tsx` | All forms; `rounded-md border px-3 py-2 text-sm` |
| `Badge` | `badge.tsx` | Status labels, role indicators; variants: `default`, `secondary`, `destructive`, `outline` |
| `Card` / `CardHeader` / `CardContent` / `CardTitle` | `card.tsx` | Dashboard stat cards, info sections |
| `Alert` / `AlertDescription` | `alert.tsx` | Form error messages, info banners |
| `Skeleton` | `skeleton.tsx` | Loading states (WalletCard, escrow loading) |
| `Separator` | `separator.tsx` | Section dividers (escrow detail, profile) |
| `Progress` | `progress.tsx` | Available (not observed in reading; likely used in commission/onboarding) |
| `Switch` | `switch.tsx` | Availability toggle (ProfessionalDashboard) |
| `Checkbox` | `checkbox.tsx` | Multi-select (AmenitiesForm) |
| `Select` | `select.tsx` | Dropdowns (PropertyForm city, listing type; role selectors) |
| `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter` | `dialog.tsx` | Escrow fund/dispute dialogs; PropertyGallery lightbox |
| `Sheet` / `SheetContent` / `SheetHeader` / `SheetTitle` / `SheetTrigger` | `sheet.tsx` | Mobile sidebar drawer; wallet top-up; payout request; DashboardSidebar mobile |
| `Form` / `FormField` / `FormControl` / `FormItem` / `FormLabel` / `FormMessage` | `form.tsx` | react-hook-form integration; login, register, property forms |
| `RadioGroup` / `RadioGroupItem` | `radio-group.tsx` | Role selector in RegisterForm |
| `Label` | `label.tsx` | Form field labels |
| `Textarea` | `textarea.tsx` | Description fields, appeal textarea, dispute reason |
| `Toaster` | `toaster.tsx` | Global toast notifications (mounted in Providers) |
| `LinkButton` | `link-button.tsx` | Custom: Button that renders as `<a>` or Next.js Link |

---

## 10. Reusable Components — Domain

### 10.1 Layout Components

#### `DashboardSidebar`
**File:** `src/components/layout/DashboardSidebar.tsx`  
**Status:** ✅ Implemented

**Desktop** (`hidden lg:flex`):
- `w-64 h-screen border-r bg-card sticky top-0 flex-col`
- Header: logo + app name
- User block: avatar initials circle + display name + role badge (`bg-primary/10 text-primary text-xs`)
- Nav links: `rounded-lg px-3 py-2 text-sm font-medium`
  - Active: `bg-primary text-primary-foreground`
  - Inactive: `text-muted-foreground hover:bg-accent`
- Footer: Sign out button

**Mobile** (`lg:hidden`):
- Fixed top bar `h-14 border-b bg-card`
- App logo + hamburger `Menu` icon
- `Sheet` drawer side="left" w-64 with identical sidebar body

**Navigation config** (from `src/lib/nav-config.ts` via `ROLE_NAV`):

| Role | Nav Items | Icons |
|------|-----------|-------|
| buyer | Saved Properties, Browse, Profile, Wallet | Heart, Search, User, Wallet |
| seller | My Listings, New Listing, Profile, Wallet | Building2, Plus, User, Wallet |
| agent | Dashboard, Properties, New Listing, Profile, Wallet | TrendingUp, Building2, Plus, User, Wallet |
| vendor | My Store, Profile, Wallet | Store, User, Wallet |
| contractor | Dashboard, Profile, Wallet | Hammer, User, Wallet |
| engineer | Dashboard, Profile, Wallet | HardHat, User, Wallet |
| architect | Dashboard, Profile, Wallet | PenTool, User, Wallet |
| lawyer | Dashboard, Profile, Wallet | Scale, User, Wallet |
| admin | Dashboard, Users, Properties, Verifications, Disputes, Payments, Reports, Wallet, Settings, Profile | LayoutDashboard, Users, Building2, ShieldCheck, Scale, TrendingUp, Flag, Wallet, Settings, User |

---

### 10.2 Auth Components

#### `LoginForm`
**File:** `src/components/auth/LoginForm.tsx`  
**Status:** ✅ Implemented  
**Pattern:** `useForm` + `zodResolver(loginSchema)` + `useTransition`

Fields:
- Email (`type="email"`, required)
- Password (`type="password"` with Eye/EyeOff toggle button)

States:
- Idle: submit button "Sign in"
- Pending: spinner + "Signing in…" (disabled)
- Error: `<Alert variant="destructive">` with server error message

Extra links:
- "Forgot password?" → `/forgot-password` (inline link next to password label)
- "Create account" → `/register`
- "Account recovery" → `/account-recovery`

---

#### `RegisterForm`
**File:** `src/components/auth/RegisterForm.tsx`  
**Status:** ✅ Implemented  
**Pattern:** `useForm` + `zodResolver(registerSchema)` + `useTransition`

Fields:
- Full name (text)
- Email
- Password
- Confirm password
- Role (`<RoleSelector>` — RadioGroup with role descriptions)

Two success states after submit:
1. `skipVerification=true`: immediate dashboard redirect
2. Verify email: "Check your inbox" message + resend link (dynamic import)

---

#### `ForgotPasswordForm`
**File:** `src/components/auth/ForgotPasswordForm.tsx`  
**Status:** ✅ Implemented (inferred from page)

Fields: Email  
Action: Sends password reset email via Supabase Auth  
Success state: "Reset instructions sent" message

---

#### `ResetPasswordForm`
**File:** `src/components/auth/ResetPasswordForm.tsx`  
**Status:** ✅ Implemented (inferred from page)

Fields: New password, confirm new password  
Requires: valid recovery token in URL (set by Supabase PKCE flow)

---

#### `AccountRecoveryForm`
**File:** `src/components/auth/AccountRecoveryForm.tsx`  
**Status:** ✅ Implemented (inferred from page)

Fields: Name, email, details/message  
Action: Submits support ticket / recovery request

---

#### `ConfirmEmailForm`
**File:** `src/components/auth/ConfirmEmailForm.tsx`  
**Status:** ✅ Implemented  
Input: `{ token_hash, type }` passed from server  
Behavior: Exchanges token, redirects to `/verify-email?verified=true` or error

---

#### `RoleSelector`
**File:** `src/components/auth/RoleSelector.tsx`  
**Status:** ✅ Implemented  
Type: `RadioGroup` with role cards  
Used in: RegisterForm  
Roles shown: All public-facing roles (buyer, seller, agent, vendor, contractor, engineer, architect, lawyer)

---

#### `KycVerificationSection`
**File:** `src/components/auth/KycVerificationSection.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/profile`  
Shows: KYC status + link to `/account/verification` for applicable roles

---

#### `KycResubmitForm`
**File:** `src/components/auth/KycResubmitForm.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/verification`  
Fields: National ID front (upload), National ID back (upload), Business registration (upload, optional)  
States: initial / re-submit after rejection

---

#### `ProfileForm`
**File:** `src/components/auth/ProfileForm.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/profile`  
Fields: display name, phone, city, bio, avatar (upload), role-specific fields loaded conditionally

---

#### `ChangePasswordForm`
**File:** `src/components/auth/ChangePasswordForm.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/profile`  
Fields: Current password, new password, confirm new password

---

#### `PhoneVerificationForm`
**File:** `src/components/auth/PhoneVerificationForm.tsx`  
**Status:** 🚧 Implemented (component exists; integration status unclear)

---

### 10.3 Onboarding Components

#### `OnboardingFlow`
**File:** `src/components/auth/OnboardingFlow.tsx`  
**Status:** ✅ Implemented

Layout: `mx-auto w-full max-w-lg space-y-8`

Step indicator: Horizontal stepper with:
- Completed: filled circle `bg-primary` + `CheckCircle2` icon
- Active: `border-2 border-primary text-primary`
- Future: `border-2 border-muted text-muted-foreground`
- Connector: `h-0.5 w-16 sm:w-24` colored primary when past

Step dots: Row of `Circle` icons below card

Steps:
| Step | Title | Description | Component | Roles |
|------|-------|-------------|-----------|-------|
| 1 | Basic Profile | Tell us who you are | `BasicProfileStep` | All |
| 2 | Account Setup | Role-specific profile | `RoleProfileStep` | All |
| 3 | Identity Verification | Upload ID + credentials | `KycUploadStep` | Professional roles only |

Card: `rounded-xl border bg-card p-6 shadow-sm`

#### `BasicProfileStep`
**File:** `src/components/auth/onboarding/BasicProfileStep.tsx`  
**Status:** ✅ Implemented

#### `RoleProfileStep`
**File:** `src/components/auth/onboarding/RoleProfileStep.tsx`  
**Status:** ✅ Implemented  
Branches on role type to show appropriate form (agent commission rate, vendor store name, professional experience/rate, etc.)

#### `KycUploadStep`
**File:** `src/components/auth/onboarding/KycUploadStep.tsx`  
**Status:** ✅ Implemented (inferred from OnboardingFlow usage)

---

### 10.4 Property Components

#### `PropertyCard`
**File:** `src/components/properties/PropertyCard.tsx`  
**Status:** ✅ Implemented

Container: `rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow relative group`

Structure:
```
Image container: aspect-[4/3]
  <Image> fill object-cover group-hover:scale-105 transition-transform duration-300
  Overlay link (z-[1]): absolute inset-0
  Listing type badge (top-left): bg-{color}/90 text-white text-xs
  BadgeCheck icon (top-right) if verified: text-blue-500
  Action buttons (bottom-right, z-[2]): FavoriteButton + ShareButton

Content:
  Price: font-bold + PropertyPriceTag
  Title: text-sm font-medium truncate
  Location: text-xs text-muted-foreground (MapPin icon + city)
  Stats row: Bed/Bath/Maximize2 icons + values + relative date
```

#### `PropertyCardSkeleton`
**File:** `src/components/properties/PropertyCardSkeleton.tsx`  
**Status:** ✅ Implemented  
Matches PropertyCard dimensions with Skeleton placeholders.

#### `PropertyGrid`
**File:** `src/components/properties/PropertyGrid.tsx`  
**Status:** ✅ Implemented  
Renders a responsive grid of `PropertyCard` items.  
Empty state: message + CTA to browse.

#### `PropertySearchBar`
**File:** `src/components/properties/PropertySearchBar.tsx`  
**Status:** ✅ Implemented  
Used in: `/properties` marketing page (hero section)  
Fields: keyword search, city filter, listing type filter  
Action: Updates URL search params

#### `PropertyFilters`
**File:** `src/components/properties/PropertyFilters.tsx`  
**Status:** ✅ Implemented  
Used in: `/properties` sidebar/top filter bar  
Fields: price range, bedrooms, bathrooms, property type, land title

#### `PropertyGallery`
**File:** `src/components/properties/PropertyGallery.tsx`  
**Status:** ✅ Implemented

Grid layout:
- With thumbnails: `grid-cols-3 grid-rows-2 h-[420px]`; primary `col-span-2 row-span-2`; up to 4 thumbnails; "+N" overlay on 5th+ thumbnail
- No thumbnails: full width `h-72`

Lightbox: `Dialog` with `max-w-5xl p-0 bg-black border-0`
- `h-[80vh]` image area
- Left/right chevron navigation
- Counter badge: "N / Total"
- Close X button

#### `PropertyDetails`
**File:** `src/components/properties/PropertyDetails.tsx`  
**Status:** ✅ Implemented (inferred)  
Used in: `/properties/[id]`  
Shows: title, price, key specs, description, location details

#### `PropertyAmenities`
**File:** `src/components/properties/PropertyAmenities.tsx`  
**Status:** ✅ Implemented (inferred)  
Used in: `/properties/[id]`  
Shows: categorized amenity checklist from `property_amenities` table

#### `PropertyInquiryForm`
**File:** `src/components/properties/PropertyInquiryForm.tsx`  
**Status:** ✅ Implemented  
Used in: `/properties/[id]` sidebar  
Fields: name, email, phone, message  
Action: Submits inquiry to `property_inquiries` table

#### `PropertyPriceTag`
**File:** `src/components/properties/PropertyPriceTag.tsx`  
**Status:** ✅ Implemented  
Formats XAF price with listing type suffix ("/month" for rent, "/night" for shortlet)

#### `FavoriteButton`
**File:** `src/components/properties/FavoriteButton.tsx`  
**Status:** ✅ Implemented  
Heart icon button; toggles `property_favorites`; visible on PropertyCard hover

#### `ShareButton`
**File:** `src/components/properties/ShareButton.tsx`  
**Status:** ✅ Implemented  
Share icon button; uses Web Share API or clipboard fallback

#### `FavoritesGrid`
**File:** `src/components/properties/FavoritesGrid.tsx`  
**Status:** ✅ Implemented  
Used in: `/buyer/favorites`  
Loads saved properties and renders PropertyGrid; empty state with browse CTA

#### `PropertyForm`
**File:** `src/components/properties/forms/PropertyForm.tsx`  
**Status:** ✅ Implemented  
Used in: `/seller/listings/new` and `/seller/listings/[id]/edit`  
Mode: `'create'` or `'edit'`

Sections (multi-part form):
1. Basic info: title, listing type, property type, city, neighborhood, address
2. Pricing: price, is_negotiable
3. Details: bedrooms, bathrooms, toilets, area_sqm, land_area_sqm, land_title, year_built, is_furnished, has_security, has_generator, has_borehole
4. Description: rich textarea
5. Amenities: `AmenitiesForm` (checkbox grid by category)
6. Images: `ImageUpload` (drag-drop, reorder, primary select)
7. Video: `VideoUpload`

#### `AmenitiesForm`
**File:** `src/components/properties/forms/AmenitiesForm.tsx`  
**Status:** ✅ Implemented  
Checkbox grid organized by amenity category

#### `ImageUpload`
**File:** `src/components/properties/forms/ImageUpload.tsx`  
**Status:** ✅ Implemented  
Uploads to Supabase storage `property-images` bucket; supports reorder, primary designation, delete

#### `VideoUpload`
**File:** `src/components/properties/forms/VideoUpload.tsx`  
**Status:** ✅ Implemented  
Uploads to Supabase storage `property-videos` bucket

---

### 10.5 Payment Components

#### `WalletCard`
**File:** `src/components/payments/WalletCard.tsx`  
**Status:** ✅ Implemented  
Uses: `useWallet()` React Query hook

Visual: `bg-gradient-to-br from-blue-700 to-blue-900 text-white border-0 shadow-lg`

Content:
- "LANDLORDZS Wallet" header + Wallet icon
- Available balance (`balance - locked`) in `text-3xl font-bold`
- "Available balance" subtitle
- Below separator: Total balance + In escrow (if locked > 0)

Loading state: Skeleton card with 3 Skeleton rows

#### `TransactionList`
**File:** `src/components/payments/TransactionList.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/wallet`, `/account/transactions`  
Loads wallet transactions; renders `TransactionCard` per item; infinite scroll or pagination (inferred)

#### `TransactionCard`
**File:** `src/components/payments/TransactionCard.tsx`  
**Status:** ✅ Implemented  
Shows: type icon, description, amount (colored by credit/debit), date, status badge

#### `WalletTopUpForm`
**File:** `src/components/payments/WalletTopUpForm.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/wallet` inside Sheet  
Fields: amount (number), payment method selector  
Action: Initiates top-up flow

#### `PaymentMethodSelector`
**File:** `src/components/payments/PaymentMethodSelector.tsx`  
**Status:** ✅ Implemented  
Used in: WalletTopUpForm  
Options: MTN Mobile Money, Orange Money, bank transfer (inferred from Cameroon context)

#### `EscrowList`
**File:** `src/components/payments/EscrowList.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/escrow`  
Loads user's escrow transactions; renders `EscrowCard` per item; links to `/account/escrow/[id]`

#### `EscrowCard`
**File:** `src/components/payments/EscrowCard.tsx`  
**Status:** ✅ Implemented  
Shows: reference type, counterparty, amount, status badge, date

#### `EscrowTimeline`
**File:** `src/components/payments/EscrowTimeline.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/escrow/[id]`  
Vertical timeline of escrow status events (funded, released, disputed, etc.)

#### `MilestoneList`
**File:** `src/components/payments/MilestoneList.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/escrow/[id]`  
Lists milestone payment stages; shows payer/payee release controls per milestone

#### `PayoutRequestForm`
**File:** `src/components/payments/PayoutRequestForm.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/payouts` inside Sheet  
Fields: amount, bank/mobile money details  
Action: Creates payout request

#### `PayoutsList`
**File:** `src/components/payments/PayoutsList.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/payouts`  
Lists payout requests with status (pending/approved/processing/paid/rejected)

#### `CommissionSummary`
**File:** `src/components/payments/CommissionSummary.tsx`  
**Status:** ✅ Implemented  
Used in: `/agent/commissions`  
Shows: total commissions earned, pending commissions, commission history

---

### 10.6 Dashboard Components

#### `VerificationBanner`
**File:** `src/components/dashboard/VerificationBanner.tsx`  
**Status:** ✅ Implemented  
Props: `{ accountStatus, kyc: KycRecord | null }`

Four states:
| Condition | Visual | Content |
|-----------|--------|---------|
| `accountStatus === 'active'` | `border-emerald-200 bg-emerald-50` | ShieldCheck icon + "Verified professional" |
| `accountStatus !== 'pending_verification'` | — | Returns null |
| `!kyc` | `border-amber-200 bg-amber-50` + AmberButton | AlertCircle + "Verification required" + checklist + "Upload Documents" button → `/account/verification` |
| `kyc.status === 'pending'` | `border-blue-200 bg-blue-50` | Clock icon + "Documents under review" + 1-2 day estimate |
| `kyc.status === 'rejected'` | `border-red-200 bg-red-50` + OutlineButton | ShieldX icon + "Verification rejected" + review_notes + "Resubmit Documents" button |

#### `ProfessionalDashboard`
**File:** `src/components/dashboard/ProfessionalDashboard.tsx`  
**Status:** ✅ Implemented  
Shared by: contractor, engineer, architect, lawyer pages

Header: role-colored icon + role label + `VerificationBanner`

Stat cards (4):
1. Experience years
2. Day rate (XAF/day)
3. Specializations count
4. Wallet balance

Availability toggle: `<Switch>` + "Available for work" label → calls `toggleProfessionalAvailability`

Specializations: List of `<Badge>` tags

Quick Actions:
- Update Profile → `/account/profile`
- Manage Wallet → `/account/wallet`
- View Earnings → `/account/transactions`
- Service Requests → `/services` (📋 planned)

Empty state: `Card` when no `professional_profiles` row — prompts completion

---

### 10.7 Review Components

#### `ReviewCard`
**File:** `src/components/reviews/ReviewCard.tsx`  
**Status:** ✅ Implemented  
Shows: reviewer avatar, name, `StarRating`, date, review text

#### `ReviewForm`
**File:** `src/components/reviews/ReviewForm.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/reviews`  
Fields: star rating (1-5) via `StarRating`, comment textarea  
Action: Submits review to `reviews` table

#### `ReviewList`
**File:** `src/components/reviews/ReviewList.tsx`  
**Status:** ✅ Implemented  
Used in: `/account/reviews`  
Renders list of `ReviewCard` components with empty state text

#### `StarRating`
**File:** `src/components/reviews/StarRating.tsx`  
**Status:** ✅ Implemented  
Interactive star selector (1-5); also used in read-only display mode

---

## 11. Public Pages

### 11.1 Root Page

**URL:** `/`  
**File:** `src/app/page.tsx`  
**Status:** 🚧 Partial (redirect-only, no landing page)

| Element | Value |
|---------|-------|
| Purpose | Smart redirect to role dashboard or login |
| UI | None — server-side redirect only |
| Components | None |
| Mobile | N/A |

**Gap:** No public landing/marketing page. Unauthenticated visitors see only the login page, not a promotional homepage.

---

### 11.2 Properties Browse

**URL:** `/properties`  
**File:** `src/app/(marketing)/properties/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Purpose | Public property search and browse |
| Access | Public (no authentication required) |
| Layout | Marketing layout (no dashboard sidebar) |

**Structure:**
```
Hero banner: bg-blue-700 py-12
  max-w-7xl mx-auto px-4
  H1: "Find Your Perfect Property" (white)
  Subtitle text
  <PropertySearchBar>

Below banner: max-w-7xl mx-auto px-4 py-8
  <PropertyFilters> (left sidebar or top bar)
  <PropertyGrid> (paginated listing of PropertyCards)
```

**Components:** `PropertySearchBar`, `PropertyFilters`, `PropertyGrid`, `PropertyCard`, `PropertyCardSkeleton`

**Empty state:** `PropertyGrid` shows "No properties found" + filter reset CTA

**Loading state:** `PropertyCardSkeleton` grid while fetching

**Error state:** Not explicitly defined; React error boundary fallback

**Mobile:** Filters may collapse to Sheet/drawer; grid to 1 column

**Tablet:** Grid 2 columns

**Desktop:** Grid 3 columns + sidebar filters

---

### 11.3 Property Detail

**URL:** `/properties/[id]`  
**File:** `src/app/(marketing)/properties/[id]/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Purpose | Full property listing view with inquiry |
| Access | Public with status guard |

**Status guard:**
- Public: can view `active` or `under_offer` listings
- Owner (seller/agent): can also view `draft` and `pending_review`
- All others: `notFound()` for non-public statuses

**Layout (`lg:grid-cols-3`):**
```
Main column (lg:col-span-2):
  <PropertyGallery> — image grid + lightbox
  <PropertyDetails> — title, price, specs, description
  <PropertyAmenities> — categorized amenity checklist

Sidebar (lg:col-span-1, sticky):
  <PropertyInquiryForm> — contact/inquiry form
```

**Components:** `PropertyGallery`, `PropertyDetails`, `PropertyAmenities`, `PropertyInquiryForm`, `PropertyPriceTag`

**Empty states:**
- No images: "No images" placeholder in gallery
- No amenities: section hidden

**Loading state:** `generateMetadata` fetches property server-side; no client loading state

**Mobile:** Single column; sidebar inquiry form below content

**Desktop:** 3-column grid

---

## 12. Authentication Pages

All auth pages use the Auth Layout: centered card `max-w-md`, `bg-muted/30` page background.

### 12.1 Login

**URL:** `/login`  
**File:** `src/app/(auth)/login/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Title tag | "Welcome back — LANDLORDZS" |
| H1 | "Welcome back" |
| Suspense | `<LoginForm>` wrapped in `<Suspense>` |

**Components:** `LoginForm`

**Form states:**
- Idle
- Submitting (spinner, disabled)
- Error (Alert destructive)

**Links:** Forgot password, Create account, Account recovery

**Empty state:** N/A  
**Error state:** Alert inline within form

---

### 12.2 Register

**URL:** `/register`  
**File:** `src/app/(auth)/register/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Title tag | "Create your account — LANDLORDZS" |
| H1 | "Create your account" |

**Components:** `RegisterForm`, `RoleSelector`

**Form states:**
- Idle
- Submitting (spinner, disabled)
- Error (Alert destructive)
- Success (skip verification): immediate redirect
- Success (verify email): "Check your inbox" with resend

---

### 12.3 Forgot Password

**URL:** `/forgot-password`  
**File:** `src/app/(auth)/forgot-password/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Title tag | "Forgot Password — LANDLORDZS" |
| H1 | "Forgot your password?" |
| Subtitle | "No worries — we'll send you reset instructions" |

**Components:** `ForgotPasswordForm`

---

### 12.4 Reset Password

**URL:** `/reset-password`  
**File:** `src/app/(auth)/reset-password/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Title tag | "Reset Password — LANDLORDZS" |
| H1 | "Set a new password" |
| Subtitle | "Your new password must be different from your previous one" |

**Components:** `ResetPasswordForm`

---

### 12.5 Account Recovery

**URL:** `/account-recovery`  
**File:** `src/app/(auth)/account-recovery/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Title tag | "Account Recovery — LANDLORDZS" |
| H1 | "Need help accessing your account?" |
| Subtitle | "Submit your details and our support team will help you regain access" |

**Components:** `AccountRecoveryForm`

---

### 12.6 Email Verification

**URL:** `/verify-email`  
**File:** `src/app/(auth)/verify-email/page.tsx`  
**Status:** ✅ Implemented

Three states based on `?verified=true` / `?error=<code>`:

| State | Icon | H1 | Primary CTA |
|-------|------|-----|-------------|
| Awaiting (default) | ✉️ blue circle | "Check your email" | None (text + re-register link) |
| Verified (`verified=true`) | CheckCircle2 green | "Email verified!" | "Continue to Setup" → `/onboarding` |
| Error (`error=<code>`) | XCircle red | "Verification failed" | "Create a new account" + "Back to Sign In" |

Special error: `error=same_browser_required` shows specific PKCE browser mismatch message.

---

### 12.7 Confirm Email

**URL:** `/confirm`  
**File:** `src/app/(auth)/confirm/page.tsx`  
**Status:** ✅ Implemented

Receives `?token_hash=<hash>&type=<type>&email=<email>` from Supabase email link.

| State | UI |
|-------|----|
| Missing params | XCircle + "Invalid confirmation link" + Back to Sign In |
| Valid params | `<ConfirmEmailForm>` processing |

**Components:** `ConfirmEmailForm`

---

## 13. Onboarding

**URL:** `/onboarding`  
**File:** `src/app/onboarding/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Title tag | "Setup Your Account — LANDLORDZS" |
| Access guard | Authenticated only; `profile.onboarding_completed` → redirect to dashboard |
| Layout | Full page `min-h-svh bg-muted/30 px-4 py-12` (NOT auth card layout) |

**Components:** `OnboardingFlow`

**Flow:**
- 2 steps for non-professional roles (buyer, seller, agent, vendor)
- 3 steps for professional roles (contractor, engineer, architect, lawyer)

**Step 1 — Basic Profile:**
- display_name, phone, city, bio, avatar upload

**Step 2 — Account Setup:**
- Buyer: no additional fields (confirms preferences)
- Seller: property count, years active
- Agent: commission rate, license number
- Vendor: store_name, store_slug, store_description, store_category
- Professional: company_name, experience_years, day_rate, specializations[], license_number

**Step 3 — Identity Verification (professionals only):**
- National ID front upload
- National ID back upload
- Business/professional certificate upload

**Navigation:** "Next" button per step; step indicators change color on completion; "Back" not present (no regression)

**Mobile:** Full width stepper, `max-w-lg` container

---

## 14. Account Pages (Shared)

All account pages accessible to any authenticated role under `/account/*`.

### 14.1 Account Index

**URL:** `/account`  
**Status:** ✅ Implemented (redirect only)  
Behavior: Server redirect to `/account/wallet`

---

### 14.2 Wallet

**URL:** `/account/wallet`  
**File:** `src/app/(dashboard)/account/wallet/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Title tag | "Wallet" (inferred) |
| Container | `max-w-2xl mx-auto px-4 py-8 space-y-6` |
| H1 | "Wallet" |

**Layout:**
```
Header row: "Wallet" H1 + "Top Up" Sheet trigger Button
<WalletCard> — gradient blue card with balances
<TransactionList> — paginated transaction history

Sheet (Top Up):
  <WalletTopUpForm>
```

**Components:** `WalletCard`, `TransactionList`, `WalletTopUpForm`, `PaymentMethodSelector`

**Empty state:** `TransactionList` shows "No transactions yet"

**Loading state:** `WalletCard` skeleton; `TransactionList` skeletons

**Mobile:** Single column; Sheet slides from right

---

### 14.3 Profile

**URL:** `/account/profile`  
**File:** `src/app/(dashboard)/account/profile/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Container | `max-w-2xl mx-auto px-4 py-8 space-y-8` |
| H1 | "Account Settings" |

**Sections:**
1. Pending verification amber banner (if applicable)
2. `<ProfileForm>` — display name, phone, city, bio, avatar
3. `<KycVerificationSection>` — only for APPROVAL_REQUIRED_ROLES
4. `<ChangePasswordForm>` — current + new + confirm password

**Role-specific data loaded server-side:**
- `agent_profiles` for agent
- `vendor_profiles` for vendor
- `professional_profiles` for contractor/engineer/architect/lawyer
- `kyc_records` for all

**Components:** `ProfileForm`, `KycVerificationSection`, `ChangePasswordForm`

**Mobile:** Stacked sections, full-width forms

---

### 14.4 Verification

**URL:** `/account/verification`  
**File:** `src/app/(dashboard)/account/verification/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Access | APPROVAL_REQUIRED_ROLES only; active accounts redirect to profile |
| Container | `max-w-xl mx-auto px-4 py-8 space-y-6` |

**States:**
1. `kyc.status === 'pending'`: Blue info banner "Documents under review" + 1-2 day message
2. `kyc.status === 'rejected'`: Rejection reason banner + `<KycResubmitForm>`
3. No KYC / initial: "Verify Your Account" + `<KycResubmitForm>`

**Header:** Back chevron link to `/account/profile` + title

**Components:** `KycResubmitForm`

---

### 14.5 Escrow List

**URL:** `/account/escrow`  
**File:** `src/app/(dashboard)/account/escrow/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Container | `max-w-3xl mx-auto px-4 py-8 space-y-6` |
| H1 | "Escrow" |
| Subtitle | "Secure milestone-based payments for property transactions and services" |

**Components:** `EscrowList`, `EscrowCard`

**Empty state:** "No escrow transactions" (within EscrowList)

---

### 14.6 Escrow Detail

**URL:** `/account/escrow/[id]`  
**File:** `src/app/(dashboard)/account/escrow/[id]/page.tsx`  
**Status:** ✅ Implemented  
**Type:** Client component (React Query hooks)

| Element | Value |
|---------|-------|
| Container | `max-w-3xl mx-auto px-4 py-8 space-y-6` |

**Sections:**
1. **Header**: Reference type + role (payer/payee) + status Badge
2. **Amount card**: Blue gradient; secured amount (text-4xl), platform fee, payee receives, auto-release date
3. **Parties**: 2-column grid; payer card + payee card; highlighted card for current user
4. **Milestones** (if any): `<MilestoneList>`
5. **History**: `<Separator>` + `<EscrowTimeline>` (if events exist)
6. **Actions** (conditional):
   - Payer + pending: "Fund Escrow" button → Fund dialog
   - Payer + funded: "Release Funds" button
   - Payer or payee + funded: "File Dispute" button (destructive)

**Dialogs:**
- **Fund Escrow**: Shows required vs. wallet balance; "Confirm & Fund" if sufficient; "Top Up Wallet" link if insufficient
- **File Dispute**: Textarea (min 20 chars) + "Submit Dispute" destructive button

**Status labels:** pending=Awaiting Payment, funded=Funds Secured, released=Completed, disputed=Under Dispute, refunded=Refunded, cancelled=Cancelled

**Loading state:** `animate-pulse` skeleton (h-8 heading + h-48 card)

**Error state:** `notFound()` if escrow not found

**Components:** `EscrowTimeline`, `MilestoneList`, `Dialog`, `Textarea`

---

### 14.7 Reviews

**URL:** `/account/reviews`  
**File:** `src/app/(dashboard)/account/reviews/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Container | `max-w-2xl mx-auto px-4 py-8 space-y-8` |
| H1 | "My Reviews" |
| Subtitle | "Rate the professionals you've worked with on completed service requests." |

**Two sections:**

**Pending Reviews:**
- Lists completed service requests without a review
- Each item: `Card` with request title + provider name/role in CardHeader
- `<ReviewForm>` in CardContent

**Reviews You've Written:**
- `<ReviewList>` of submitted reviews
- Each: `ReviewCard` with star rating + comment

**Empty states:**
- Pending: "No completed requests are awaiting a review."
- Written: "You haven't submitted any reviews yet."

**Components:** `ReviewForm`, `ReviewList`, `ReviewCard`, `StarRating`

---

### 14.8 Payouts

**URL:** `/account/payouts`  
**File:** `src/app/(dashboard)/account/payouts/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Container | `max-w-2xl mx-auto px-4 py-8 space-y-6` |

**Layout:**
```
Header row: "Payouts" H1 + "Withdraw" Sheet trigger Button (Plus icon)
<WalletCard>
<PayoutsList>

Sheet (Withdraw):
  "Request Payout" title
  <PayoutRequestForm>
```

**Components:** `WalletCard`, `PayoutsList`, `PayoutRequestForm`

**Empty state:** Within `PayoutsList` — "No payout requests yet"

---

### 14.9 Transaction History

**URL:** `/account/transactions`  
**File:** `src/app/(dashboard)/account/transactions/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Container | `max-w-3xl mx-auto px-4 py-8 space-y-6` |
| H1 | "Transaction History" |

**Layout:**
```
H1
rounded-xl border px-4
  <TransactionList>
```

**Components:** `TransactionList`, `TransactionCard`

**Empty state:** "No transactions yet" within TransactionList

---

### 14.10 Banned

**URL:** `/account/banned`  
**File:** `src/app/(dashboard)/account/banned/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Access guard | `account_status !== 'active'` required; redirects active accounts |
| Layout | `flex items-center justify-center min-h-[60vh] px-4` |
| Container | `max-w-md w-full text-center space-y-6` |

**Structure:**
```
Ban icon in h-16 w-16 rounded-full bg-red-100
H1: "Account Permanently Banned"
Two paragraphs explaining ban + appeal via support
Actions:
  "Contact Support" → mailto link (SUPPORT_EMAIL + email in subject)
  "Sign out" form action
```

**Components:** `Button`  
**No appeal form** — bans are final; only email contact option

---

### 14.11 Suspended

**URL:** `/account/suspended`  
**File:** `src/app/(dashboard)/account/suspended/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Access guard | Active accounts redirect to `/account` |
| Layout | `flex items-center justify-center min-h-[60vh] px-4` |
| Container | `max-w-md w-full text-center space-y-6` |

**Structure:**
```
ShieldOff icon in bg-red-100 circle
H1: "Account Suspended"
Explanation paragraph

If latestNotice exists:
  Red banner: "Reason for suspension" + reason text

Appeal form section (mutually exclusive states):
  ?submitted=true → Green banner: "Appeal submitted"
  existingAppeal → Amber banner: "Appeal is under review"
  default → Textarea form + "Submit Appeal" button

Footer actions:
  "Email Support" → mailto link
  "Sign out" form action
```

**DB queries:** `account_notices` (type=suspension), `account_appeals` (status=pending)

**Components:** `Button`, `Textarea` (raw HTML)

---

### 14.12 Pending (Under Review)

**URL:** `/account/pending`  
**File:** `src/app/(dashboard)/account/pending/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Access guard | Active accounts redirect to role dashboard |
| Layout | `flex items-center justify-center min-h-[60vh] px-4` |
| Container | `max-w-md w-full text-center space-y-6` |

**Structure:**
```
Clock icon in amber-100 circle
H1: "Account Under Review"
"Usually takes 1–2 business days" paragraph

If latestNotice (rejection type):
  Red banner: "Review feedback" + reason

"Upload Verification Documents" primary button → /account/profile#identity-verification

Info box: "While you wait, you can:" checklist with links

Correction request form (mutually exclusive):
  ?submitted=true → Green banner
  existingAppeal → Amber "under review" banner
  default → Textarea + "Submit Correction Request" button

"Contact Support" outline button → mailto
```

**DB queries:** `account_notices` (type=rejection), `account_appeals` (status=pending)

**Components:** `Button`, `Textarea` (raw HTML)

---

## 15. Buyer Dashboard

### 15.1 Favorites

**URL:** `/buyer/favorites`  
**File:** `src/app/(dashboard)/buyer/favorites/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Container | `max-w-7xl mx-auto px-4 py-8` |
| H1 | "Saved Properties" |
| Nav | Heart icon in ROLE_NAV |

**Layout:**
```
H1: "Saved Properties"
<FavoritesGrid>
```

**Components:** `FavoritesGrid`, `PropertyCard`, `PropertyCardSkeleton`

**Empty state:** "No saved properties yet" + "Browse Properties" CTA → `/properties`

**Loading state:** Grid of `PropertyCardSkeleton`

**Mobile:** 1 column grid  
**Tablet:** 2 columns  
**Desktop:** 3 columns

---

### 15.2 Missing Buyer Pages

| Page | URL | Status |
|------|-----|--------|
| Buyer dashboard home | `/buyer` | 📋 Missing (no dashboard index page; nav links to `/buyer/favorites` and `/properties`) |
| Service requests | `/buyer/services` or `/services` | 📋 Missing |
| My inquiries | `/buyer/inquiries` | 📋 Missing |

---

## 16. Seller Dashboard

### 16.1 My Listings

**URL:** `/seller/listings`  
**File:** `src/app/(dashboard)/seller/listings/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Guard | `requireActiveProfile(profile)` — must be active |
| Container | `max-w-7xl mx-auto px-4 py-8` |
| H1 | "My Listings" |

**Layout:**
```
Header row: "My Listings" H1 + "New Listing" Button → /seller/listings/new

Listings list (vertical):
  Per listing: rounded-xl border p-4
    Left: Primary image thumbnail + status badge
    Middle: title, city, listing type badge, price, view_count + enquiry_count
    Right: Action icons row
      Eye → /properties/[id]
      Edit → /seller/listings/[id]/edit
      ToggleRight (if draft/rejected) → publish action
      ShieldCheck (if active) → request verification
      Trash2 → delete action
```

**Status badges:**
| Status | Color |
|--------|-------|
| draft | gray secondary |
| pending_review | amber |
| active | emerald |
| under_offer | blue |
| sold | purple |
| rented | purple |
| archived | red |
| rejected | red |
| expired | yellow |
| shortlet_booked | teal |

**Empty state:** "No listings yet" + "Create your first listing" CTA → `/seller/listings/new`

**Loading state:** Not explicitly defined; server-rendered

**Mobile:** List items stack vertically; action icons may truncate

---

### 16.2 New Listing

**URL:** `/seller/listings/new`  
**File:** `src/app/(dashboard)/seller/listings/new/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Guard | `requireActiveProfile` + role in ['seller','agent','admin'] |
| Container | `max-w-3xl mx-auto px-4 py-8` |
| H1 | "Create New Listing" |

**Components:** `PropertyForm` (mode="create")

**Sections:** (see PropertyForm in §10.4)

---

### 16.3 Edit Listing

**URL:** `/seller/listings/[id]/edit`  
**File:** `src/app/(dashboard)/seller/listings/[id]/edit/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Guard | `requireActiveProfile` + owner check (eq owner_id) |
| Container | `max-w-3xl mx-auto px-4 py-8` |
| H1 | "Edit Listing" |

**Components:** `PropertyForm` (mode="edit", defaultValues populated from DB)

**Error state:** `notFound()` if property not found or not owned by user

---

### 16.4 Missing Seller Pages

| Page | URL | Status |
|------|-----|--------|
| Seller dashboard home | `/seller` | 📋 Missing (nav links direct to `/seller/listings`) |
| Listing analytics | `/seller/listings/[id]/analytics` | 📋 Missing |
| Inquiry management | `/seller/inquiries` | 📋 Missing |

---

## 17. Agent Dashboard

### 17.1 Commissions

**URL:** `/agent/commissions`  
**File:** `src/app/(dashboard)/agent/commissions/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| Container | `max-w-3xl mx-auto` |

**Layout:**
```
<VerificationBanner accountStatus={profile.account_status} kyc={kyc}>
<CommissionSummary>
```

**Components:** `VerificationBanner`, `CommissionSummary`

**Empty state:** Within CommissionSummary — "No commissions yet"

---

### 17.2 Missing Agent Pages

| Page | URL | Status |
|------|-----|--------|
| Agent dashboard home | `/agent` | 📋 Missing (TrendingUp nav → no page) |
| Agent properties | `/agent/properties` | 📋 Missing |
| Client management | `/agent/clients` | 📋 Missing |
| Service requests | `/agent/services` | 📋 Missing |

---

## 18. Vendor Dashboard

### 18.1 Vendor Home

**URL:** `/vendor`  
**File:** `src/app/(dashboard)/vendor/page.tsx`  
**Status:** ✅ Implemented

| Element | Value |
|---------|-------|
| H1 | "My Store" with Store icon + amber-100/700 header |

**Structure when vendor profile exists:**
```
Header: Store icon (amber-100 bg, amber-700 text) + "My Store" + store_name
3 Stat cards:
  1. Wallet Balance (XAF)
  2. Store Status (active/inactive/pending badge)
  3. Verification Status

Store Info Card:
  store_name
  store_slug (used in URL)
  store_description

Quick Actions:
  Update Store → /account/profile
  Manage Wallet → /account/wallet
  View Transactions → /account/transactions
  Browse Listings → /properties
```

**Empty state when no vendor profile:**
```
Card with amber AlertCircle icon
"Store Not Set Up"
"Complete your store profile to start listing products and services."
"Set Up Store" CTA → /account/profile
```

**Components:** `Card`, `Badge`, `Button`

---

### 18.2 Missing Vendor Pages

| Page | URL | Status |
|------|-----|--------|
| Product listings | `/vendor/products` | 📋 Missing |
| Order management | `/vendor/orders` | 📋 Missing |
| Service requests (vendor services) | `/vendor/services` | 📋 Missing |

---

## 19. Contractor Dashboard

### 19.1 Contractor Home

**URL:** `/contractor`  
**File:** `src/app/(dashboard)/contractor/page.tsx`  
**Status:** ✅ Implemented

Delegates to `<ProfessionalDashboard>` (see §10.6) with role='contractor', orange color theme.

DB queries: `professional_profiles`, `wallets`, `kyc_records`

**Missing:** Service requests panel, portfolio display, client inquiries

---

## 20. Engineer Dashboard

### 20.1 Engineer Home

**URL:** `/engineer`  
**File:** `src/app/(dashboard)/engineer/page.tsx`  
**Status:** ✅ Implemented

Identical pattern to contractor — delegates to `<ProfessionalDashboard>` with role='engineer', blue color theme.

---

## 21. Architect Dashboard

### 21.1 Architect Home

**URL:** `/architect`  
**File:** `src/app/(dashboard)/architect/page.tsx`  
**Status:** ✅ Implemented

Delegates to `<ProfessionalDashboard>` with role='architect', purple color theme.

---

## 22. Lawyer Dashboard

### 22.1 Lawyer Home

**URL:** `/lawyer`  
**File:** `src/app/(dashboard)/lawyer/page.tsx`  
**Status:** ✅ Implemented

Delegates to `<ProfessionalDashboard>` with role='lawyer', green color theme.

---

## 23. Property Manager Dashboard

**Status:** 📋 Not Implemented

No routes, pages, or components exist for `property_manager` role. The role exists in the database schema and `ROLE_NAV` returns an empty array (or defaults). A `property_manager` user would log in and have no navigation and no dashboard content.

| Missing Page | URL |
|-------------|-----|
| PM Dashboard | `/property-manager` |
| Property assignments | `/property-manager/properties` |
| Maintenance oversight | `/property-manager/maintenance` |
| Tenant communications | `/property-manager/tenants` |

---

## 24. Maintenance Dashboard

**Status:** 📋 Not Implemented

No routes, pages, or components exist for `maintenance` role.

| Missing Page | URL |
|-------------|-----|
| Maintenance Dashboard | `/maintenance` |
| Work orders | `/maintenance/jobs` |
| Schedule | `/maintenance/schedule` |

---

## 25. Cleaning Services Dashboard

**Status:** 📋 Not Implemented

No routes, pages, or components exist for `cleaning_services` role.

| Missing Page | URL |
|-------------|-----|
| Cleaning Dashboard | `/cleaning-services` |
| Job assignments | `/cleaning-services/jobs` |
| Schedule | `/cleaning-services/schedule` |

---

## 26. Admin Dashboard

All admin pages use dashboard layout + admin guard pattern:
```typescript
const profile = await getServerProfile()
if (!profile || profile.role !== 'admin') redirect('/login')
```

Protected at middleware level via `ROLE_PROTECTED_PREFIXES['/admin'] = ['admin']`.

### 26.1 Admin Home / Metrics

**URL:** `/admin`  
**File:** `src/app/(dashboard)/admin/page.tsx`  
**Status:** 🚧 Partial

| Element | Value |
|---------|-------|
| H1 | "Admin Dashboard" |
| Data source | `get_admin_metrics()` and `get_admin_activity()` RPCs (SECURITY DEFINER) |

**Metric cards (6):**
1. Total Users
2. Active Listings
3. Pending Verifications
4. Active Disputes
5. Platform Revenue
6. Pending Payouts

**Activity feed:** Recent platform events from `get_admin_activity()` RPC  
**Gap:** No real-time updates; no date range filter; no chart/graph visualizations

---

### 26.2 User Management

**URL:** `/admin/users`  
**File:** `src/app/(dashboard)/admin/users/page.tsx`  
**Status:** 🚧 Partial

| Element | Value |
|---------|-------|
| H1 | "User Management" |

**Table columns:** Name/email, Role badge, Status badge, Joined date, Action buttons  
**Actions per row:** Suspend, Activate  
**Filters:** Role, Status, Search (name/email)

**Gap:** No `/admin/users/[id]` detail page — rows have no link. No bulk actions. No role change from this view.

---

### 26.3 Professional Verifications

**URL:** `/admin/professionals`  
**File:** `src/app/(dashboard)/admin/professionals/page.tsx`  
**Status:** 🚧 Broken

| Element | Value |
|---------|-------|
| H1 | "Professional Verifications" |

**Gap (B1):** Signed URLs point to `verification-documents-v2` bucket (does not exist). Real bucket is `verification-documents`. Documents cannot be viewed.

**Features that work:**
- Lists pending KYC records
- Approve / Reject inline action buttons

**Features broken:**
- Document viewing (wrong bucket name)
- No link to user detail page

---

### 26.4 Property Moderation

**URL:** `/admin/properties`  
**File:** `src/app/(dashboard)/admin/properties/page.tsx`  
**Status:** 🚧 Partial

Table of all properties with status filter; approve/reject pending_review listings.

---

### 26.5 Dispute Resolution

**URL:** `/admin/disputes`  
**File:** `src/app/(dashboard)/admin/disputes/page.tsx`  
**Status:** 📋 Planned / Minimal

Lists disputes; no resolution workflow implemented.

---

### 26.6 Payment Management

**URL:** `/admin/payments`  
**File:** `src/app/(dashboard)/admin/payments/page.tsx`  
**Status:** 🚧 Partial

Lists payout requests; `processPayoutAdmin` and `retryPayoutAdmin` server actions exist.

---

### 26.7 Reports / Analytics

**URL:** `/admin/reports`  
**File:** `src/app/(dashboard)/admin/reports/page.tsx`  
**Status:** 📋 Minimal / Planned

---

### 26.8 Activity Logs

**URL:** `/admin/logs`  
**File:** `src/app/(dashboard)/admin/logs/page.tsx`  
**Status:** 📋 Minimal

Reads `admin_logs` and `activity_logs` tables; no filter UI yet.

---

### 26.9 Platform Settings

**URL:** `/admin/settings`  
**File:** `src/app/(dashboard)/admin/settings/page.tsx`  
**Status:** 📋 Placeholder

---

### 26.10 Role Management

**URL:** `/admin/roles`  
**File:** `src/app/(dashboard)/admin/roles/page.tsx`  
**Status:** 🚧 Partial

`adminAssignRole` action exists; UI table of users; role change dropdown.

---

### 26.11 Admin Profile

**URL:** `/admin/profile`  
**File:** `src/app/(dashboard)/admin/profile/page.tsx`  
**Status:** ✅ Implemented

Standard `ProfileForm` + `ChangePasswordForm`.

---

### 26.12 Missing Admin Pages

| Page | URL | Status |
|------|-----|--------|
| User detail | `/admin/users/[id]` | 📋 Missing (rows are dead — no link target) |
| Verification center | `/admin/verifications` | 📋 Missing |
| Verification detail | `/admin/verifications/[id]` | 📋 Missing |
| "View as user" preview | `/admin/users/[id]/preview` | 📋 Missing |
| Wallet admin | `/admin/wallet` | Listed in ROLE_NAV but no page |
| Escrow admin panel | `/admin/escrow` | 📋 Missing |
| Notification center | `/admin/notifications` | 📋 Missing |

---

## 27. Super Admin Dashboard

**Status:** 📋 Not Implemented

No `super_admin` role defined in TypeScript types or `ROLE_NAV`. The database has no `super_admin` account status or role value. Super admin functionality (if planned) would need a separate role definition, routes, and elevated permissions.

---

## 28. Missing Pages

The following pages are required by the platform specification but have no implementation:

### 28.1 Public / Marketing

| # | Page | URL | Priority |
|---|------|-----|---------|
| M1 | Landing / Homepage | `/` (currently redirect) | High |
| M2 | About Us | `/about` | Low |
| M3 | Contact | `/contact` | Medium |
| M4 | Terms of Service | `/terms` | High |
| M5 | Privacy Policy | `/privacy` | High |
| M6 | Pricing / Plans | `/pricing` | Medium |
| M7 | Professional directory | `/professionals` | Medium |
| M8 | Vendor marketplace | `/marketplace` | Medium |
| M9 | Blog / Resources | `/blog` | Low |

---

### 28.2 Role Dashboards (No Home Page)

| # | Role | Missing URL |
|---|------|------------|
| D1 | Buyer | `/buyer` (nav TrendingUp goes nowhere) |
| D2 | Seller | `/seller` (nav goes to `/seller/listings`) |
| D3 | Agent | `/agent` (nav TrendingUp goes nowhere) |
| D4 | Property Manager | `/property-manager` (entire role) |
| D5 | Maintenance | `/maintenance` (entire role) |
| D6 | Cleaning Services | `/cleaning-services` (entire role) |
| D7 | Super Admin | `/super-admin` (entire role) |

---

### 28.3 Feature Pages

| # | Page | URL | Priority |
|---|------|-----|---------|
| F1 | Service Requests — create | `/services/new` | High |
| F2 | Service Requests — list | `/services` | High |
| F3 | Service Requests — detail | `/services/[id]` | High |
| F4 | Buyer inquiries | `/buyer/inquiries` | Medium |
| F5 | Seller inquiries | `/seller/inquiries` | Medium |
| F6 | Agent clients | `/agent/clients` | Medium |
| F7 | Vendor products | `/vendor/products` | Medium |
| F8 | Vendor orders | `/vendor/orders` | Medium |
| F9 | Agent properties | `/agent/properties` | Medium |
| F10 | Listing analytics | `/seller/listings/[id]/analytics` | Low |
| F11 | Booking management | `/seller/bookings` (shortlet) | Medium |
| F12 | Portfolio (professional) | `/[role]/portfolio` | Medium |
| F13 | Admin verifications list | `/admin/verifications` | High |
| F14 | Admin user detail | `/admin/users/[id]` | High |
| F15 | Admin verification detail | `/admin/verifications/[id]` | High |
| F16 | Admin escrow management | `/admin/escrow` | Medium |
| F17 | Admin notification center | `/admin/notifications` | Low |

---

## 29. Missing Components

| # | Component | Used By | Status |
|---|-----------|---------|--------|
| C1 | `ServiceRequestForm` | `/services/new` | 📋 Not built |
| C2 | `ServiceRequestCard` | Service lists | 📋 Not built |
| C3 | `ServiceRequestDetail` | `/services/[id]` | 📋 Not built |
| C4 | `QuotationForm` | Professionals responding | 📋 Not built |
| C5 | `PortfolioCard` / `PortfolioUpload` | Professional dashboards | 📋 Not built |
| C6 | `InquiryList` | Seller/buyer inquiry pages | 📋 Not built |
| C7 | `InquiryCard` | InquiryList | 📋 Not built |
| C8 | `BookingCalendar` | Shortlet booking | 📋 Not built |
| C9 | `NotificationList` | Admin notifications | 📋 Not built |
| C10 | `NotificationBell` | Dashboard header | 📋 Not built |
| C11 | `AdminUserDetail` | `/admin/users/[id]` | 📋 Not built |
| C12 | `DocumentViewerModal` | `/admin/verifications/[id]` | 📋 Not built |
| C13 | `AdminVerificationDetail` | `/admin/verifications/[id]` | 📋 Not built |
| C14 | `PropertyManagerPanel` | PM role dashboard | 📋 Not built |
| C15 | `MaintenanceJobCard` | Maintenance role | 📋 Not built |
| C16 | `CleaningJobCard` | Cleaning role | 📋 Not built |
| C17 | `OrderCard` | Vendor orders | 📋 Not built |
| C18 | `ProductForm` | Vendor products | 📋 Not built |
| C19 | `ReportChart` | `/admin/reports` | 📋 Not built |
| C20 | `AuditLogEntry` | `/admin/logs` | 🚧 Minimal |
| C21 | `DisputeCard` | `/admin/disputes` | 🚧 Minimal |
| C22 | `LandingHero` | `/` homepage | 📋 Not built |
| C23 | `FeatureGrid` | `/` homepage | 📋 Not built |
| C24 | `PropertySearchBar` (mobile overlay) | Mobile browse | 🚧 Partial (no modal version) |

---

## 30. Duplicate Components

| # | Description | Components | Verdict |
|---|------------|------------|---------|
| DU1 | **Raw `<textarea>` vs `<Textarea>`** | `SuspendedPage` and `PendingPage` use raw `<textarea>` with inline className. `EscrowDetailPage` and `ReviewForm` use `<Textarea>` from shadcn/ui. | Should standardize on `<Textarea>` everywhere |
| DU2 | **Wallet display** | `WalletCard` (client, React Query) used on wallet/payouts pages. `vendor/page.tsx` fetches `wallets.balance` server-side and shows a raw stat card. | Should reuse `WalletCard` on vendor page |
| DU3 | **Inline appeal form** | Identical textarea + submit form pattern in both `SuspendedPage` and `PendingPage` (copy-pasted). | Should extract to `AppealForm` component |
| DU4 | **Status badge logic** | Status → color mapping defined in both `seller/listings/page.tsx` (STATUS_BADGE map) and `admin/professionals/page.tsx` (separate inline mapping). | Should extract to shared status utility |
| DU5 | **Professional dashboard pattern** | Contractor, engineer, architect, and lawyer pages are identical — same 3 DB queries, same component call, only metadata title differs. | ✅ Already resolved via `ProfessionalDashboard` shared component — but the 4 page files themselves are still boilerplate copies |
| DU6 | **Auth guard pattern** | `if (!profile || profile.role !== 'X') redirect('/login')` repeated in every dashboard page. | Acceptable for Next.js App Router pattern; no centralized per-role middleware hook needed |

---

## 31. UI Inconsistencies

| # | Inconsistency | Location | Recommendation |
|---|--------------|----------|----------------|
| UI1 | **Rounded corners mix** | `rounded-xl` used for most cards; `rounded-2xl` used for auth card; `rounded-lg` used for nav items and some banners. The variation is intentional but not documented. | Define a semantic tier: `panel=xl`, `auth=2xl`, `interactive=lg` |
| UI2 | **Container width variation** | `max-w-xl`, `max-w-2xl`, `max-w-3xl`, `max-w-7xl` all appear on `mx-auto` containers without clear rule. | Define: narrow pages (verification, profile)=2xl; financial pages (wallet, escrow)=3xl; list pages=7xl |
| UI3 | **Loading states inconsistent** | `WalletCard` has a skeleton loading state; `EscrowDetailPage` has an `animate-pulse` custom skeleton; most server-rendered pages have no loading state at all. | Add `loading.tsx` files for key dashboard routes |
| UI4 | **Empty state design** | Some empty states use a `Card` container (`ProfessionalDashboard`, `vendor/page.tsx`); others use plain text paragraphs; others use icon + text + CTA. No consistent pattern. | Define empty state component: icon + heading + description + optional CTA |
| UI5 | **Dark mode** | Not implemented. `themeColor: '#1e40af'` (dark blue) in meta suggests dark theme intent but globals.css has no dark mode variables. The app renders identically regardless of system theme. | Either add dark mode variables or remove the dark meta themeColor |
| UI6 | **Icon consistency** | Most pages use Lucide React. One emoji (`✉️`) used directly in `/verify-email` page for the "check email" icon. | Replace the emoji with `Mail` Lucide icon |
| UI7 | **Form action vs. useTransition** | `SuspendedPage` and `PendingPage` use `<form action={handleAppeal}>` (React 19 inline server action in a `page.tsx`). Other forms use `useTransition` + client components. The mix creates inconsistency. | Neither is wrong; document the pattern |
| UI8 | **Wallet page missing H1** | The wallet page header area exists but H1 is shown only implicitly; the Sheet trigger button is the only labeled element above the `WalletCard`. | Add `<h1 className="text-2xl font-bold">Wallet</h1>` |
| UI9 | **No 404 page** | `notFound()` is called in several pages but there is no custom `not-found.tsx` file. Next.js default 404 renders without LANDLORDZS branding. | Create `src/app/not-found.tsx` |
| UI10 | **No error boundary** | No `error.tsx` files in dashboard routes. Runtime errors would show Next.js default error UI. | Add `src/app/(dashboard)/error.tsx` at minimum |
| UI11 | **Suspense boundary coverage** | `LoginForm` is wrapped in `<Suspense>`. `ForgotPasswordForm` is wrapped. `RegisterForm` is not. Inconsistent use of Suspense for form components that use `useSearchParams`. | Audit and wrap all auth forms that may use `useSearchParams` |
| UI12 | **Mobile top bar height** | Dashboard top bar is `h-14` fixed. Page content does not consistently add `pt-14` on mobile. Content may appear behind the top bar on some pages. | Audit all dashboard pages for correct `pt-14 lg:pt-0` |
| UI13 | **Role badge location** | In `DashboardSidebar`, role badge is `bg-primary/10 text-primary`. In `PropertyCard`, listing type badges are `bg-{color}/90 text-white`. In `seller/listings`, status badges use `Badge` variants. Three different badge systems. | Standardize role/status badges on `<Badge>` component variants |
| UI14 | **Currency display** | `formatXAF()` utility is used on most financial values but not all (vendor stat card shows raw balance). | Ensure all monetary values use `formatXAF()` |

---

## 32. Recommended Implementation Order

### Sprint 1 — Critical Gaps (blocking user flows)

| Priority | Item | Why Critical |
|----------|------|-------------|
| 1 | Fix `/admin/professionals` bucket name bug | Admins cannot view uploaded documents — verification workflow completely broken |
| 2 | `/admin/users/[id]` user detail page | Admin rows have no link target; user management is incomplete |
| 3 | `/admin/verifications` + `/admin/verifications/[id]` | No dedicated verification review center; admins rely on broken professionals page |
| 4 | Service request pages (`/services`, `/services/new`, `/services/[id]`) | Professional roles have "Service Requests" Quick Action that leads nowhere; core revenue flow unimplemented |
| 5 | `not-found.tsx` + `error.tsx` | Unbranded error pages ship in every production deployment |

---

### Sprint 2 — Role Completeness

| Priority | Item | Roles Affected |
|----------|------|---------------|
| 6 | `/buyer` dashboard home | buyer |
| 7 | `/agent` dashboard home + `/agent/properties` | agent |
| 8 | `/seller/inquiries` + `/buyer/inquiries` | buyer, seller |
| 9 | `/vendor/products` + `/vendor/orders` | vendor |
| 10 | Portfolio pages for professionals | contractor, engineer, architect, lawyer |

---

### Sprint 3 — Platform Completeness

| Priority | Item | Notes |
|----------|------|-------|
| 11 | `/` homepage (landing page) | Currently redirects to login; no public marketing surface |
| 12 | `/properties` search improvements | Filters exist but no sort; no map view |
| 13 | `property_manager` role — full dashboard | 3 pages minimum |
| 14 | `maintenance` role — full dashboard | 2 pages minimum |
| 15 | `cleaning_services` role — full dashboard | 2 pages minimum |

---

### Sprint 4 — Polish & Dark Mode

| Priority | Item |
|----------|------|
| 16 | Dark mode CSS variables (`@media (prefers-color-scheme: dark)`) |
| 17 | `loading.tsx` files for all major dashboard routes |
| 18 | `AppealForm` extracted component (remove duplication in suspended/pending pages) |
| 19 | Consistent empty state component |
| 20 | `NotificationBell` + notification center |
| 21 | `/admin/reports` charts (ReportChart component) |
| 22 | Mobile top bar `pt-14` audit across all dashboard pages |

---

### Sprint 5 — Super Admin

| Priority | Item |
|----------|------|
| 23 | Define `super_admin` role in TypeScript + DB |
| 24 | `/super-admin` dashboard with platform-wide controls |
| 25 | Role elevation UI (promote admin → super_admin) |
| 26 | Audit log with full impersonation log viewer |

---

## Summary

| Category | Count |
|----------|-------|
| Implemented pages | 38 |
| Partially implemented pages | 9 |
| Planned / missing pages | 28 |
| Reusable UI primitive components | 19 |
| Reusable domain components | 38 |
| Missing components | 24 |
| Duplicate/redundant patterns | 6 |
| UI inconsistencies | 14 |

**Platform completeness: ~45%** — Authentication, professional dashboards, property browse/detail, financial flows (wallet/escrow/payouts), and admin metrics are implemented. Service requests, role-specific sub-pages, three complete role dashboards (property_manager, maintenance, cleaning_services), and the marketing homepage are entirely absent.
