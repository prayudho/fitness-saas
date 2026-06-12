import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">FitnessPlace</h1>
          <p className="text-xl text-muted-foreground">
            The all-in-one SaaS platform for fitness businesses
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center text-sm text-muted-foreground">
          {['Member Management', 'Class Booking', 'PT Sessions', 'QR Check-in', 'Multi-brand'].map((f) => (
            <span key={f} className="rounded-full border px-3 py-1 bg-muted">{f}</span>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </main>
  )
}
