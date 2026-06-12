import { ChangePasswordForm } from '@/components/shared/change-password-form'

export default function TrainerAccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Manage your personal account settings.</p>
      </div>
      <ChangePasswordForm />
    </div>
  )
}
