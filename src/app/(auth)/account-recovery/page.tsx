import type { Metadata } from 'next'
import { AccountRecoveryForm } from '@/components/auth/AccountRecoveryForm'

export const metadata: Metadata = {
  title: 'Account Recovery — LANDLORDZS',
}

export default function AccountRecoveryPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Need help accessing your account?</h1>
        <p className="text-sm text-muted-foreground">
          Submit your details and our support team will help you regain access
        </p>
      </div>
      <AccountRecoveryForm />
    </div>
  )
}
