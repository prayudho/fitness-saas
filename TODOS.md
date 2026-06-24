# TODOS — FitnessPlace SaaS

Design debt and deferred work. Created by /plan-design-review · 2026-06-16.

---

## Design System

### Create DESIGN.md via /design-consultation

**What:** Run `/design-consultation` to document the implicit design system as a written spec.

**Why:** The codebase has strong consistent patterns (shadcn/ui, Tailwind spacing, AdminSidebar structure, DataTable conventions, EmptyState warmth patterns) but no DESIGN.md. Every new sprint and every `/plan-design-review` starts cold, re-discovering the same conventions. A DESIGN.md gives new engineers and future review passes a calibration source.

**Pros:** Future design reviews rate 3-4 points higher on Pass 5 (Design System Alignment). On-boarding new engineers is faster. `/plan-design-review` can flag actual deviations rather than guessing at conventions.

**Cons:** Takes one `/design-consultation` session (~30 min). The result needs to be maintained as patterns evolve.

**Context:** After the multi-branch sprint ships (Phases 1-5), the portal will have 5 role-based layouts. That is a good moment to crystallize the design system before the next major feature.

**Depends on:** Nothing — can be run any time. Best done after multi-branch feature ships so the design system captures the branch-manager portal patterns too.

---

## Sidebar Architecture

### Refactor 6 standalone portal sidebars into shared base + wrapper pattern

**What:** Extract the shared logic from all 6 sidebar components (`admin-sidebar.tsx`, `branch-manager-sidebar.tsx`, `member-sidebar.tsx`, `staff-sidebar.tsx`, `trainer-sidebar.tsx`, `superadmin-sidebar.tsx`) into a real shared base component in `components/shared/sidebar.tsx`, with each portal sidebar as a thin wrapper.

**Why:** All 6 sidebars share 80–90% of their code (collapse state, localStorage, user footer, mobile Sheet, nav item rendering). Each is 150–270 lines of duplicated patterns. The `roleVariant` prop system (added in the Role Identity PR) is applied independently in each — a unified base would apply it once.

**Pros:** Massive DRY reduction. New nav items or behaviors (e.g., keyboard navigation, animation) ship once. Future design changes are single-edit.

**Cons:** Non-trivial refactor — requires mapping differences between all 6 sidebar implementations (staff has local-state mobile, member gets bottom-nav, admin has collapse toggle with localStorage). Medium regression risk.

**Context:** The Role Identity System PR (2026-06-24) explicitly deferred this — `components/shared/sidebar.tsx` was deleted as dead code (it had zero imports) and role tokens were applied to each standalone sidebar independently. The next opportunity to unify is after the Role Identity PR ships and the patterns stabilize.

**Depends on:** Role Identity System PR shipped (so we know the full sidebar API surface).

---

## Mobile Navigation

### Add mobile nav for trainer, branch-manager, and superadmin portals

**What:** The member portal gets a bottom-nav (Role Identity PR). Admin gets a Sheet drawer (existing). Staff has its own custom mobile drawer (existing). Trainer, branch-manager, and superadmin portals currently have **no mobile navigation** — they render a desktop sidebar only and have no mobile fallback.

**Why:** A branch manager checking commissions on a phone sees nothing in the sidebar area. A trainer reviewing their schedule on mobile is stuck. Superadmin is less urgent (platform ops, desktop-only likely fine).

**Pros:** Fills a real usability gap for trainer and branch-manager roles who are likely on mobile/tablet.

**Cons:** 3 separate implementations. Branch manager likely warrants a bottom-nav like member (similar consumer-adjacent role). Trainer might prefer a hamburger+Sheet (smaller nav surface). Superadmin is debatable.

**Context:** After the Role Identity System PR ships, the sidebar prop surface is finalized. Audit trainer and branch-manager sidebars for any leftover mobile FAB code (may have been copied from staff).

**Depends on:** Role Identity System PR shipped (sidebar prop surface finalized).

---

## Role Badge — Portal Switcher

### Add portal-switcher dropdown to the RoleBadge in TopBar

**What:** The RoleBadge added in the Role Identity PR shows the current role ("Staff", "Trainer", etc.). For users with multiple roles (e.g., a trainer who is also a branch manager), there is no affordance to switch portals without logging out. A portal-switcher dropdown on the badge would let multi-role users jump directly to their other portal.

**Why:** The plan's stated justification for the badge was "helps multi-role users orient themselves" — but without a switcher, the badge only states the obvious (they already know they're in the trainer portal). The switcher is what makes the badge meaningful for multi-role users.

**Pros:** Removes log-out-and-log-back-in friction for multi-role users. Small gyms often have staff/trainer overlap.

**Cons:** Requires detecting which roles a user has (profile.roles array or checking accessible routes). Non-trivial: the profile currently stores one role, not multiple.

**Context:** Deferred from Role Identity System PR (2026-06-24) per autoplan CEO review.

**Depends on:** Role Identity System PR shipped. Multi-role profile schema (currently single-role).

---

## Member Mobile Navigation — Overflow Items

### Make PT booking, Training History, Profile, and Account accessible on mobile

**What:** The member portal's MobileBottomNav (added in the Role Identity PR) shows 4 items: Dashboard, My Card, Classes, Billing. The member sidebar has 8 items — Personal Trainer, Training History, Profile, and My Account are desktop-only after the PR ships.

**Why:** Members on mobile cannot book a PT session or update their profile. PT booking in particular is a common action for mobile users (booking sessions between workouts, on the go).

**Pros:** Fills a real usability gap — a member on their phone can book a trainer session.

**Cons:** Requires a 5th "More" tab or overflow sheet; adds implementation complexity to MobileBottomNav.

**Context:** Deferred from Role Identity System PR (2026-06-24). The 4-item bottom-nav was shipped as a pragmatic MVP. The most urgent overflow item is `/member/pt-booking`.

**Depends on:** Role Identity System PR shipped (MobileBottomNav component exists).

---

## Auth — Password Reset Subdomain Bug

### Fix password reset redirect to send members back to their gym's subdomain

**What:** `lib/actions/auth.ts` constructs `redirectTo` using `NEXT_PUBLIC_APP_URL` (after the Role Identity PR renames from `NEXT_PUBLIC_SITE_URL`). This points to the apex domain `https://gerak.online/reset-password`. Members who request a reset while on `gymname.gerak.online` will receive a reset link that sends them to the apex domain with no brand context — the `__fp_brand_id` cookie won't be set, causing a blank/wrong-brand reset page.

**Why:** Password reset is a trust-critical flow. A member landing on an unbranded page after clicking a reset link creates confusion and erodes trust.

**Pros (fixing):** Correct brand context on reset landing page. Members see their gym's branding throughout the reset flow.

**Cons (fixing):** Requires passing the current brand subdomain URL as a parameter to `requestPasswordReset()` from the auth page (which has access to current hostname via `headers()`).

**Context:** Pre-existing bug, not introduced by the Role Identity PR. Caught during autoplan eng review (2026-06-24). The Role Identity PR still renames the env var (removes localhost fallback) but does not fix the subdomain routing.

**Depends on:** Nothing — standalone fix. Medium priority.

---

## Code Quality — NavLinks Inner Component Remount

### Lift NavLinks out of render body in staff-sidebar and trainer-sidebar

**What:** `staff-sidebar.tsx` and `trainer-sidebar.tsx` define `const NavLinks = () => (...)` as a component inside the parent component's render function body. React sees a new component type on every render and fully remounts the nav (unmount + mount) instead of reconciling. This causes unnecessary DOM churn and kills focus state inside the nav on re-renders.

**Why:** Low-cost fix that improves perceived responsiveness and avoids subtle focus bugs.

**Context:** Deferred from Role Identity System PR (2026-06-24). `branch-manager-sidebar.tsx` already does this correctly (NavLinks at module scope). Not urgent, but worth a follow-up cleanup PR.

**Depends on:** Role Identity System PR shipped (sidebar prop surface finalized).

---
