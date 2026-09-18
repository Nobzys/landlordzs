'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setAvailabilityStatus } from '@/lib/actions/profile'

type AvailabilityStatus = 'now' | 'week' | 'month' | 'unavailable'

const OPTIONS: {
  value: AvailabilityStatus
  label: string
  sub:   string
}[] = [
  {
    value: 'now',
    label: 'Available Now',
    sub:   "I'm currently available to assist clients.",
  },
  {
    value: 'week',
    label: 'Available This Week',
    sub:   "I'm accepting clients during this week.",
  },
  {
    value: 'month',
    label: 'Available This Month',
    sub:   "I'm accepting clients during this month.",
  },
  {
    value: 'unavailable',
    label: 'Not Available',
    sub:   "Don't show me in availability-filtered results.",
  },
]

interface Props {
  currentStatus: string | null
}

export function AvailabilityControl({ currentStatus }: Props) {
  const safeStatus: AvailabilityStatus =
    OPTIONS.some(o => o.value === currentStatus)
      ? (currentStatus as AvailabilityStatus)
      : 'unavailable'

  const [selected, setSelected] = useState<AvailabilityStatus>(safeStatus)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const res = await setAvailabilityStatus(selected)
      if (res.error) {
        setFeedback({ type: 'error', message: 'Unable to update availability. Please try again.' })
      } else {
        setFeedback({ type: 'success', message: 'Availability updated successfully.' })
      }
    })
  }

  const currentOption = OPTIONS.find(o => o.value === selected)

  return (
    <div className="space-y-4">
      {/* Current status indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Current status:</span>
        <span className={`font-semibold ${
          selected === 'unavailable' ? 'text-muted-foreground' : 'text-emerald-600'
        }`}>
          {currentOption?.label ?? 'Unknown'}
        </span>
      </div>

      {/* Radio options */}
      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <label
            key={opt.value}
            className={[
              'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
              selected === opt.value
                ? 'border-[#B71C1C] bg-[#fce4e4]/40'
                : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50',
            ].join(' ')}
          >
            <input
              type="radio"
              name="availability_status"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => {
                setSelected(opt.value)
                setFeedback(null)
              }}
              className="mt-0.5 shrink-0 accent-[#B71C1C]"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Feedback message */}
      {feedback && (
        <div className={[
          'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200',
        ].join(' ')}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Save button */}
      <Button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="bg-[#B71C1C] hover:bg-[#9b1515] active:bg-[#7f1111] text-white w-full sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          'Save Availability'
        )}
      </Button>
    </div>
  )
}
