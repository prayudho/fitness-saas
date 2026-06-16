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
