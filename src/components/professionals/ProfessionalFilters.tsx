'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'
import { PUBLIC_PROFESSIONAL_ROLES } from '@/lib/roles'
import { Button } from '@/components/ui/button'

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'premium',     label: 'Premium first' },
  { value: 'newest',      label: 'Newest' },
  { value: 'experience',  label: 'Most experienced' },
] as const

const EXP_OPTIONS = [
  { value: '', label: 'Any experience' },
  { value: '1', label: '1+ years' },
  { value: '3', label: '3+ years' },
  { value: '5', label: '5+ years' },
  { value: '10', label: '10+ years' },
]

export function ProfessionalFilters() {
  const router    = useRouter()
  const pathname  = usePathname()
  const sp        = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, sp])

  const reset = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  const hasFilters = sp.has('city') || sp.has('verified') || sp.has('premium') || sp.has('min_exp') || sp.has('q')

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or company…"
        defaultValue={sp.get('q') ?? ''}
        onChange={(e) => update('q', e.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
      />

      {/* City */}
      <select
        value={sp.get('city') ?? ''}
        onChange={(e) => update('city', e.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">All cities</option>
        {CAMEROON_CITIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      {/* Verification */}
      <select
        value={sp.get('verified') ?? ''}
        onChange={(e) => update('verified', e.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Any verification</option>
        <option value="true">Verified only</option>
      </select>

      {/* Subscription */}
      <select
        value={sp.get('premium') ?? ''}
        onChange={(e) => update('premium', e.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Any plan</option>
        <option value="true">Premium only</option>
      </select>

      {/* Experience */}
      <select
        value={sp.get('min_exp') ?? ''}
        onChange={(e) => update('min_exp', e.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {EXP_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sp.get('sort') ?? 'recommended'}
        onChange={(e) => update('sort', e.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
