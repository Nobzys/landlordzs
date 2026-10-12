'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const RANGES = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
]

interface RangePickerProps {
  current: number
}

export function RangePicker({ current }: RangePickerProps) {
  const router = useRouter()
  const params = useSearchParams()

  function select(range: number) {
    const next = new URLSearchParams(params.toString())
    next.set('range', String(range))
    router.push(`/admin/analytics?${next.toString()}`)
  }

  return (
    <div className="flex gap-1 rounded-lg border p-1">
      {RANGES.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => select(value)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            current === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
