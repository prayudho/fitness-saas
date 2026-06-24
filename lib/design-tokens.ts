// Per-role design tokens. sidebarBgHex values use 10% alpha (hex suffix 1a).
// activeShadow uses inset box-shadow to show a left-edge accent without layout shift.
export const ROLE_VARIANTS = {
  superadmin: {
    label: 'Super Admin',
    badgeClass: 'bg-indigo-100 text-indigo-700',
    activeClass: 'bg-indigo-500/10 text-indigo-600',
    activeShadow: 'inset 3px 0 0 #4f46e5',
    sidebarBgHex: '#0f172a1a',
    sidebarDark: false,
  },
  admin: {
    label: 'Admin',
    badgeClass: 'bg-indigo-100 text-indigo-700',
    activeClass: 'bg-indigo-500/10 text-indigo-600',
    activeShadow: 'inset 3px 0 0 #4f46e5',
    sidebarBgHex: '#4f46e51a',
    sidebarDark: false,
  },
  branch_manager: {
    label: 'Branch Manager',
    badgeClass: 'bg-violet-100 text-violet-700',
    activeClass: 'bg-violet-500/10 text-violet-600',
    activeShadow: 'inset 3px 0 0 #7c3aed',
    sidebarBgHex: '#7c3aed1a',
    sidebarDark: false,
  },
  trainer: {
    label: 'Trainer',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    activeClass: 'bg-emerald-500/10 text-emerald-600',
    activeShadow: 'inset 3px 0 0 #059669',
    sidebarBgHex: '#0596691a',
    sidebarDark: false,
  },
  staff: {
    label: 'Staff',
    badgeClass: 'bg-amber-100 text-amber-700',
    activeClass: 'bg-amber-500/10 text-amber-400',
    activeShadow: 'inset 3px 0 0 #f59e0b',
    sidebarBgHex: '#f59e0b1a',
    sidebarDark: true,
  },
  member: {
    label: 'Member',
    badgeClass: 'bg-sky-100 text-sky-700',
    activeClass: 'bg-sky-500/10 text-sky-600',
    activeShadow: 'inset 3px 0 0 #0ea5e9',
    sidebarBgHex: '#0ea5e91a',
    sidebarDark: false,
  },
} as const

export type RoleVariantKey = keyof typeof ROLE_VARIANTS
