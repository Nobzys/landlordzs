'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhoneVerificationForm } from './PhoneVerificationForm'

interface PhoneVerificationSectionProps {
  phone: string | null
  phoneVerified: boolean
}

export function PhoneVerificationSection({ phone, phoneVerified }: PhoneVerificationSectionProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (phoneVerified) {
    return (
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Phone</p>
            <p className="text-sm text-muted-foreground mt-0.5">{phone ?? 'Not set'}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Verified
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Phone Verification</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phone ? `${phone} — not verified` : 'Verify your phone number to secure your account'}
          </p>
        </div>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Verify
          </Button>
        )}
      </div>

      {open && (
        <PhoneVerificationForm
          onVerified={() => {
            setOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
