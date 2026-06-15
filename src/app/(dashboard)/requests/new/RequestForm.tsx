'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createServiceRequest } from '@/lib/actions/service-requests'
import { REQUEST_TYPES_BY_ROLE } from '@/types/service-request'

interface ProviderInfo {
  id:           string
  name:         string
  role:         string
  avatar_url:   string | null
}

interface RequestFormProps {
  provider: ProviderInfo
}

export function RequestForm({ provider }: RequestFormProps) {
  const router     = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)

  const requestTypes = REQUEST_TYPES_BY_ROLE[provider.role] ?? []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const budgetMinRaw = fd.get('budget_min') as string
    const budgetMaxRaw = fd.get('budget_max') as string

    startTransition(async () => {
      const result = await createServiceRequest({
        provider_id:    provider.id,
        request_type:   fd.get('request_type') as string,
        title:          fd.get('title') as string,
        description:    fd.get('description') as string,
        budget_min:     budgetMinRaw ? parseInt(budgetMinRaw, 10) : null,
        budget_max:     budgetMaxRaw ? parseInt(budgetMaxRaw, 10) : null,
        preferred_date: (fd.get('preferred_date') as string) || null,
        contact_phone:  (fd.get('contact_phone') as string) || null,
        property_id:    null,
      })

      if (result.error) {
        setError(result.error)
        return
      }
      router.push(`/requests/${result.data!.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Request type */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="request_type">
          Request type <span className="text-destructive">*</span>
        </label>
        <select
          id="request_type"
          name="request_type"
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a request type</option>
          {requestTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="title">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={120}
          placeholder="Brief summary of what you need"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="description">
          Description <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          placeholder="Describe your requirements in detail — location, timeline, any specific needs…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Budget */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="budget_min">
            Min budget (XAF)
          </label>
          <input
            id="budget_min"
            name="budget_min"
            type="number"
            min={0}
            placeholder="e.g. 50000"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="budget_max">
            Max budget (XAF)
          </label>
          <input
            id="budget_max"
            name="budget_max"
            type="number"
            min={0}
            placeholder="e.g. 200000"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Preferred date */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="preferred_date">
          Preferred date
        </label>
        <input
          id="preferred_date"
          name="preferred_date"
          type="date"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Contact phone */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="contact_phone">
          Contact phone (optional)
        </label>
        <input
          id="contact_phone"
          name="contact_phone"
          type="tel"
          placeholder="+237 6XX XXX XXX"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? 'Sending…' : 'Send Request'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
