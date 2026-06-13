import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Create Account — LANDLORDZS',
  description: 'Create your free LANDLORDZS account and join Cameroon\'s real estate marketplace',
}

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Join LANDLORDZS — free forever for buyers
        </p>
      </div>
      <RegisterForm />
    </div>
  )
}
