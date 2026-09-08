'use client'

import { useState, useTransition } from 'react'
import { updateNotificationPreferences } from '@/lib/actions/notifications'
import type { NotificationPrefs } from '@/lib/actions/notifications'

type EditablePrefs = Omit<NotificationPrefs, 'quiet_hours_start' | 'quiet_hours_end'>

type ToggleRow = {
  key:         keyof EditablePrefs
  label:       string
  description: string
}

const ROWS: ToggleRow[] = [
  { key: 'email_enabled', label: 'Email',       description: 'Receive notifications by email' },
  { key: 'push_enabled',  label: 'Push',        description: 'Receive push notifications on mobile' },
  { key: 'sms_enabled',   label: 'SMS',         description: 'Receive text message notifications' },
]

type Props = { initialPrefs: EditablePrefs }

export function PreferencesForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<EditablePrefs>(initialPrefs)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleToggle(key: keyof EditablePrefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    const prev = prefs
    setPrefs(next)
    setStatus('idle')
    startTransition(async () => {
      const result = await updateNotificationPreferences(next)
      if ('error' in result) {
        setPrefs(prev)
        setErrorMsg(result.error ?? 'Failed to save')
        setStatus('error')
      } else {
        setStatus('saved')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card divide-y">
        {ROWS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <button
              role="switch"
              aria-checked={prefs[key]}
              disabled={isPending}
              onClick={() => handleToggle(key)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                prefs[key] ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  prefs[key] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {status === 'saved' && (
        <p className="text-sm text-green-600 dark:text-green-400">Preferences saved.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
    </div>
  )
}
