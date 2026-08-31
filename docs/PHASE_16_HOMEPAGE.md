# Phase 16 — Homepage Independent Worksheet

**Status:** Planning  
**Last updated:** 2026-08-29  
**Phase number:** 16 (inserted between Phase 15 Marketplace and Phase 17 Messaging)  
**Workstream:** Independent — does not overlap with any completed phase  

---

## 1. Objective

Build the LANDLORDZS public marketing homepage at `/` as a fully responsive Next.js App Router page. Unauthenticated visitors land here. Authenticated users are redirected to their role-specific dashboard (existing behaviour in `src/app/page.tsx` — must not be changed).

---

## 2. Design Reference

| Asset | Location | Purpose |
|-------|----------|---------|
| Static mockup | `index.html` (project root) | Authoritative visual reference — **do not delete or modify** |
| Design system | `assets/css/main.css` | Brand tokens, layout patterns, responsive breakpoints |
| Nav/footer builder | `assets/js/nav.js` | Category structure, mega-menu content (reference only) |

**Dial for Trade** (dialfortrade.com) — visual inspiration for homepage layout philosophy only. No code, assets, or branding may be copied.

**Unsplash images** in `index.html` are prototype placeholders — **must not appear in production**. Featured properties pull real images from Supabase Storage.

---

## 3. Brand Colour Decision

| Scope | Colour | Note |
|-------|--------|------|
| Phase 16 homepage only | `#B71C1C` (Deep Red) | Original LANDLORDZS brand colour |
| All existing authenticated pages | `#3b82f6` (Blue) | Unchanged — no migration in this phase |
| Full brand migration | TBD | Separate explicitly approved future task |

Logo lockup: `LANDLORD` in `#222222` · `ZS` in `#B71C1C`

---

## 4. Routing Constraints

`src/app/page.tsx` (18 lines) contains the authenticated-user redirect. It **must not be modified** in Phase 16. The homepage lives at `src/app/(marketing)/page.tsx`.

```
/ (root)
  └── src/app/page.tsx          ← redirect only; DO NOT TOUCH
        ↓ (unauthenticated)
  src/app/(marketing)/page.tsx  ← new homepage (Phase 16)
```

---

## 5. Layout Architecture Decision Gate (Task 16.0)

A shared `src/app/(marketing)/layout.tsx` would inject nav/footer into ALL marketing pages (materials, jobs, rentals, tenders), silently altering completed work.

**Recommended approach: Option B — self-contained homepage only.**

- `src/app/(marketing)/page.tsx` contains its own inline nav and footer.
- No `src/app/(marketing)/layout.tsx` is created in Phase 16.
- Existing marketing pages are not affected.

This decision must be confirmed before implementation begins.

---

## 6. Files to Create

| File | Description |
|------|-------------|
| `src/app/(marketing)/page.tsx` | Homepage server component |
| `src/components/marketing/home-nav.tsx` | Self-contained nav (not shared layout) |
| `src/components/marketing/home-footer.tsx` | Self-contained footer |
| `src/components/marketing/hero.tsx` | Hero section + city search |
| `src/components/marketing/trust-bar.tsx` | Stats / social proof strip |
| `src/components/marketing/category-cards.tsx` | Browse by Type — 6 cards |
| `src/components/marketing/featured-properties.tsx` | Real DB property cards |
| `src/components/marketing/marketplace-sections.tsx` | Secondary vertical links |
| `src/components/marketing/dual-cta.tsx` | Buyer / Seller registration CTA |

---

## 7. Files Explicitly Protected (must not be modified)

| File | Reason |
|------|--------|
| `index.html` | Design reference — authoritative static mockup |
| `assets/css/main.css` | Part of design reference |
| `assets/js/nav.js` | Part of design reference |
| `src/app/page.tsx` | Auth redirect — must stay intact |
| All Phase 1–15 files | Completed/protected phases |
| All Supabase migration files | No DB changes in this phase |
| All RLS policy files | No RLS changes in this phase |

---

## 8. Section Inventory (Homepage Sections)

| # | Section | Source in index.html | Production approach |
|---|---------|---------------------|-------------------|
| 1 | Nav / header | `<div id="lz-header">` (injected by nav.js) | `home-nav.tsx` — inline, red brand |
| 2 | Hero | `.hero` + `.search-card` | Gradient + city select only (no 7-tab card) |
| 3 | Trust bar | `.trust-bar` | Real Supabase counts or launch targets |
| 4 | Browse by Type | `.browse-section` (6 cards) | CSS icon cards, no images |
| 5 | Featured Properties | `.properties-section` (4 cards) | Real DB query, Supabase Storage images |
| 6 | Building Materials | `.materials-section` | Link → `/materials` |
| 7 | Hire Professionals | `.services-section` | Link → `/professionals` |
| 8 | Home Services | `.cleaning-section` | Link → `/services` |
| 9 | Rentals | `.rentals-section` | Link → `/rentals` |
| 10 | Jobs & Tenders | `.jobs-section` | Link → `/tenders` |
| 11 | Trusted Stats | `.stats-section` | Real Supabase counts |
| 12 | Testimonials | `.testimonials-section` | Static copy (no real reviews yet) |
| 13 | App Download | `.app-section` | **REPLACED** with Dual Registration CTA |
| 14 | Partners | `.partners-section` | Text-only or generic placeholder |
| 15 | Footer | `<div id="lz-footer">` (injected by nav.js) | `home-footer.tsx` — inline |

---

## 9. Hero Search — Simplified Spec

The `index.html` hero has a 7-tab search card with 4 filter selects. No search infrastructure exists in the Next.js app. Phase 16 uses:

- One `<select>` populated from `CAMEROON_CITIES` (`src/lib/utils/constants.ts`)
- One "Search Properties" `<button>` → navigates to `/properties?city=<value>`
- No autocomplete, no tab switching, no additional filters

Full search (keyword, price range, bedrooms) is deferred to a later phase when search infrastructure exists.

---

## 10. Featured Properties — Data Query

```typescript
// Supabase query for homepage featured properties
const { data: properties } = await supabase
  .from('properties')
  .select('id, title, price, city, listing_type, bedrooms, bathrooms, images')
  .eq('status', 'active')
  .in('listing_type', ['for_sale', 'for_rent'])
  .order('created_at', { ascending: false })
  .limit(4)
```

- Image: `images[0]` from Supabase Storage public URL
- Fallback: branded placeholder if `images` is empty or null
- Price: formatted with `formatXAF()` from `src/lib/utils/format.ts`
- Price colour: `#B71C1C`

---

## 11. Category Cards — Browse by Type

| Card | Label | Link |
|------|-------|------|
| 1 | Properties for Sale | `/properties?type=for_sale` |
| 2 | Properties for Rent | `/properties?type=for_rent` |
| 3 | Commercial Space | `/properties?type=commercial` |
| 4 | Land & Plots | `/properties?type=land` |
| 5 | Building Materials | `/materials` |
| 6 | Professional Services | `/professionals` |

No images. Cards use Deep Red accent colour with CSS icon or emoji.

---

## 12. Dual Registration CTA (Replaces App Download)

The `index.html` App Store / Google Play section has no equivalent — no mobile app exists. Phase 16 replaces it with:

```
┌─────────────────────────────────────────────────┐
│         Join LANDLORDZS Today                   │
│                                                 │
│  [I'm a Buyer / Tenant]  [I'm a Seller / Pro]  │
│  → /register?role=buyer  → /register?role=seller│
└─────────────────────────────────────────────────┘
```

No App Store link. No Google Play link. No QR code.

---

## 13. Nav Structure (home-nav.tsx)

Derived from `assets/js/nav.js` category list. Simplified for Phase 16:

- Logo lockup (`LANDLORD` + `ZS`)
- Primary links: Properties · Materials · Professionals · Services · Rentals · Tenders
- Auth links: Login · Register (hidden when authenticated — but homepage only renders for unauthenticated users per routing)
- Mobile hamburger menu
- No mega-dropdown required in Phase 16 (deferred complexity)

---

## 14. CSS / Styling Approach

- Tailwind CSS (project-standard) with inline style overrides for brand red
- No global Tailwind config changes — brand red applied via `style={{ color: '#B71C1C' }}` or `className="text-[#B71C1C]"` inline
- No new CSS files imported into Next.js
- `assets/css/main.css` is **not** imported — it is the reference, not the source
- Responsive breakpoints: 375px (mobile), 768px (tablet), 1280px (desktop)

---

## 15. Testimonials Section

No real review data exists from the public (Phase 19 Reviews not implemented). Phase 16 uses **static copy** — 2–3 placeholder testimonials with generic names and quotes. Clearly marked in code with a comment indicating they should be replaced with real data when Phase 19 ships.

---

## 16. Trust Bar — Stat Sources

| Stat | Source |
|------|--------|
| Properties Listed | `SELECT COUNT(*) FROM properties WHERE status = 'active'` |
| Cities Covered | `SELECT COUNT(DISTINCT city) FROM properties WHERE status = 'active'` |
| Verified Agents | `SELECT COUNT(*) FROM profiles WHERE role = 'agent' AND account_status = 'active'` |
| Happy Tenants | Static launch target (e.g. "500+") until booking data is sufficient |

Stats are fetched server-side at render time. No client-side polling.

---

## 17. What Phase 16 Must NOT Do

- Modify `src/app/page.tsx`
- Delete or modify `index.html`, `assets/css/main.css`, or `assets/js/nav.js`
- Create `src/app/(marketing)/layout.tsx` (or if it must exist, ensure it adds no nav/footer)
- Use Unsplash URLs in any component
- Copy Dial for Trade assets, code, or branding
- Create Supabase migrations
- Modify RLS policies
- Touch any Phase 1–15 file
- Add App Store / Google Play links
- Implement full-text property search

---

## 18. Acceptance Checklist

- [ ] Unauthenticated user visits `/` and sees the LANDLORDZS homepage
- [ ] Authenticated user visits `/` and is redirected to their dashboard (unchanged behaviour)
- [ ] Hero gradient matches `index.html` spec
- [ ] Logo lockup: `LANDLORD` in `#222222`, `ZS` in `#B71C1C`
- [ ] City select populates from `CAMEROON_CITIES`; search navigates to `/properties?city=...`
- [ ] 6 Browse-by-Type cards render with correct labels and links
- [ ] Trust bar shows at least 2 real Supabase-sourced stats
- [ ] 4 Featured Property cards render with real DB data and Supabase Storage images (no Unsplash)
- [ ] Empty state for Featured Properties renders gracefully
- [ ] Dual registration CTA present; buttons link to `/register?role=buyer` and `/register?role=seller`
- [ ] No App Store / Google Play links anywhere on the page
- [ ] All marketplace section links resolve (no 404s)
- [ ] Existing marketing pages (materials, jobs, rentals, tenders) are visually unchanged
- [ ] `src/app/page.tsx` is byte-for-byte identical to its pre-Phase-16 state
- [ ] `index.html` is byte-for-byte identical to its pre-Phase-16 state
- [ ] No Supabase migrations were created or run
- [ ] No RLS policies were modified
- [ ] Renders correctly at 375px, 768px, 1280px viewport widths

---

*This worksheet is the authoritative Phase 16 specification. Implementation must not begin until this document is reviewed and approved.*
