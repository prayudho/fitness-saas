import { create } from 'zustand'

interface MobileNavStore {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

export const useMobileNav = create<MobileNavStore>((set) => ({
  isOpen: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),
}))
