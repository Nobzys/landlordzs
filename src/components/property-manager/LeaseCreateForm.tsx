'use client'

import { useState, useTransition } from 'react'
import { Search, UserCheck, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  findTenantByEmail,
  createLeaseAgreement,
  type TenantResult,
  type ManagedProperty,
} from '@/lib/actions/leases'

interface Props {
  properties: ManagedProperty[]
}

export function LeaseCreateForm({ properties }: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties.length === 1 ? properties[0].id : '',
  )
  const [email, setEmail]                   = useState('')
  const [tenant, setTenant]                 = useState<TenantResult | null>(null)
  const [lookupError, setLookupError]       = useState<string | null>(null)
  const [monthlyRent, setMonthlyRent]       = useState('')
  const [depositAmount, setDepositAmount]   = useState('')
  const [startDate, setStartDate]           = useState('')
  const [endDate, setEndDate]               = useState('')
  const [terms, setTerms]                   = useState('')
  const [submitError, setSubmitError]       = useState<string | null>(null)
  const [created, setCreated]               = useState(false)
  const [isPending, startTransition]        = useTransition()

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPropertyId) return
    setTenant(null)
    setLookupError(null)
    startTransition(async () => {
      const result = await findTenantByEmail(email)
      if (result.error) {
        setLookupError(result.error)
      } else {
        setTenant(result.data ?? null)
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant || !selectedPropertyId) return
    const rent = parseInt(monthlyRent, 10)
    const deposit = parseInt(depositAmount || '0', 10)
    if (isNaN(rent) || rent <= 0) {
      setSubmitError('Monthly rent must be a positive number.')
      return
    }
    if (isNaN(deposit) || deposit < 0) {
      setSubmitError('Deposit must be 0 or greater.')
      return
    }
    setSubmitError(null)
    startTransition(async () => {
      const result = await createLeaseAgreement({
        propertyId:    selectedPropertyId,
        tenantId:      tenant.id,
        monthlyRent:   rent,
        depositAmount: deposit,
        startDate,
        endDate:       endDate || null,
        terms:         terms   || null,
      })
      if (result.error) {
        setSubmitError(result.error)
      } else {
        setCreated(true)
      }
    })
  }

  if (created) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">Lease draft created</p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
            The draft lease has been saved. Activate it when both parties are ready.
          </p>
          <button
            className="mt-2 text-sm underline text-green-700 dark:text-green-400"
            onClick={() => {
              setCreated(false)
              setTenant(null)
              setEmail('')
              setMonthlyRent('')
              setDepositAmount('')
              setStartDate('')
              setEndDate('')
              setTerms('')
            }}
          >
            Create another lease
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Property selector (only shown when PM manages multiple properties) */}
      {properties.length > 1 && (
        <div>
          <label className="block text-sm font-medium mb-1">Property</label>
          <select
            value={selectedPropertyId}
            onChange={e => { setSelectedPropertyId(e.target.value); setTenant(null); setLookupError(null) }}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a property…</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.city}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 1: Tenant lookup */}
      {selectedPropertyId && !tenant && (
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={e => { setEmail(e.target.value); setLookupError(null) }}
            placeholder="Tenant's email address"
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                       ring-offset-background placeholder:text-muted-foreground
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" variant="outline" size="default" disabled={isPending || !email.trim()}>
            <Search className="h-4 w-4 mr-2" />
            Find Tenant
          </Button>
        </form>
      )}

      {lookupError && (
        <p className="text-sm text-destructive">{lookupError}</p>
      )}

      {/* Step 2: Lease details (shown after tenant found) */}
      {tenant && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant confirmation */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3">
            <UserCheck className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {tenant.display_name ?? tenant.full_name ?? 'Tenant found'}
              </p>
              <p className="text-xs text-muted-foreground">{tenant.email}</p>
            </div>
            <button
              type="button"
              onClick={() => { setTenant(null); setEmail(''); setLookupError(null) }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
            >
              Change
            </button>
          </div>

          {/* Lease details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Monthly Rent (XAF)</label>
              <input
                type="number"
                required
                min="1"
                value={monthlyRent}
                onChange={e => setMonthlyRent(e.target.value)}
                placeholder="e.g. 150000"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Deposit (XAF)</label>
              <input
                type="number"
                min="0"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="e.g. 300000"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Date <span className="text-muted-foreground">(optional)</span></label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={e => setEndDate(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Lease Terms <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              rows={3}
              placeholder="Add any special conditions or clauses…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                         placeholder:text-muted-foreground resize-none
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !startDate || !monthlyRent}>
              <FileText className="h-4 w-4 mr-2" />
              Save Draft Lease
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setTenant(null); setEmail('') }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
