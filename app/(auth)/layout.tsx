import { Dumbbell } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Gerak' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
      <div className="mb-8 flex items-center gap-2">
        <Dumbbell className="h-7 w-7 text-indigo-600" />
        <span className="text-2xl font-bold text-slate-800">Gerak</span>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
