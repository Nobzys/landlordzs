'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { setContactVisibility } from '@/lib/actions/profile'

interface ContactVisibilityToggleProps {
  initialEmailVisibility: boolean
  initialPhoneVisibility: boolean
}

// Sibling to the existing ProfileVisibilityToggle (which controls is_public)
// — separate component since these two new fields are independent toggles,
// not a replacement for the existing one.
export function ContactVisibilityToggle({
  initialEmailVisibility,
  initialPhoneVisibility,
}: ContactVisibilityToggleProps) {
  const [emailVisibility, setEmailVisibility] = useState(initialEmailVisibility)
  const [phoneVisibility, setPhoneVisibility] = useState(initialPhoneVisibility)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Show email on public profile</p>
          <p className="text-xs text-muted-foreground mt-0.5">Off by default. Your email is never shown unless you turn this on.</p>
        </div>
        <Switch
          checked={emailVisibility}
          disabled={isPending}
          onChange={(e) => {
            const next = e.target.checked
            setError(null)
            startTransition(async () => {
              const res = await setContactVisibility({ emailVisibility: next, phoneVisibility })
              if (res?.error) { setError(res.error); return }
              setEmailVisibility(next)
            })
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Show phone on public profile</p>
          <p className="text-xs text-muted-foreground mt-0.5">Off by default. Controls visibility on your public profile page only.</p>
        </div>
        <Switch
          checked={phoneVisibility}
          disabled={isPending}
          onChange={(e) => {
            const next = e.target.checked
            setError(null)
            startTransition(async () => {
              const res = await setContactVisibility({ emailVisibility, phoneVisibility: next })
              if (res?.error) { setError(res.error); return }
              setPhoneVisibility(next)
            })
          }}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
