'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { setProfileVisibility } from '@/lib/actions/profile'

interface ProfileVisibilityToggleProps {
  initialIsPublic: boolean
  publicProfilePath: string | null
}

export function ProfileVisibilityToggle({ initialIsPublic, publicProfilePath }: ProfileVisibilityToggleProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-between rounded-xl border p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">Public profile</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isPublic
            ? 'Anyone can view your profile page.'
            : 'Your profile is hidden from public view.'}
          {isPublic && publicProfilePath && (
            <>
              {' '}
              <a href={publicProfilePath} className="underline" target="_blank" rel="noopener noreferrer">
                View public profile
              </a>
            </>
          )}
        </p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <Switch
        checked={isPublic}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.checked
          setError(null)
          startTransition(async () => {
            const res = await setProfileVisibility(next)
            if (res?.error) { setError(res.error); return }
            setIsPublic(next)
          })
        }}
      />
    </div>
  )
}
