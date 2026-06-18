'use client'

import { useState, useTransition } from 'react'
import { Flag, X } from 'lucide-react'
import { reportProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'

interface ReportProfileButtonProps {
  targetId: string
}

const REASONS = [
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'misleading', label: 'Misleading information' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
] as const

export function ReportProfileButton({ targetId }: ReportProfileButtonProps) {
  const [open, setOpen] = useState(false)
  const [reportType, setReportType] = useState<(typeof REASONS)[number]['value']>('other')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (submitted) {
    return <p className="text-sm text-muted-foreground">Thanks — this profile has been reported to our team.</p>
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5" />
        Report this profile
      </Button>
    )
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Report this profile</p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <select
        value={reportType}
        onChange={(e) => setReportType(e.target.value as typeof reportType)}
        disabled={isPending}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Briefly describe the issue (optional)"
        rows={3}
        disabled={isPending}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-none"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const res = await reportProfile(targetId, reportType, reason.trim() || REASONS.find((r) => r.value === reportType)!.label)
            if (res?.error) { setError(res.error); return }
            setSubmitted(true)
          })
        }}
      >
        {isPending ? 'Submitting…' : 'Submit Report'}
      </Button>
    </div>
  )
}
