'use client'

import { useState, useTransition } from 'react'
import { Search, UserCheck, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  findMaintenanceWorkerByEmail,
  createWorkOrder,
  type MaintenanceWorkerResult,
} from '@/lib/actions/workOrders'
import type { ManagedProperty } from '@/lib/actions/leases'

interface Props {
  properties: ManagedProperty[]
}

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const

export function WorkOrderDispatchForm({ properties }: Props) {
  const [propertyId, setPropertyId]   = useState(properties.length === 1 ? properties[0].id : '')
  const [email, setEmail]             = useState('')
  const [worker, setWorker]           = useState<MaintenanceWorkerResult | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority]       = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [category, setCategory]       = useState('')
  const [dueDate, setDueDate]         = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [dispatched, setDispatched]   = useState(false)
  const [isPending, startTransition]  = useTransition()

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!propertyId) return
    setWorker(null)
    setLookupError(null)
    startTransition(async () => {
      const result = await findMaintenanceWorkerByEmail(email)
      if (result.error) {
        setLookupError(result.error)
      } else {
        setWorker(result.data ?? null)
      }
    })
  }

  function handleDispatch(e: React.FormEvent) {
    e.preventDefault()
    if (!worker || !propertyId) return
    if (title.trim().length < 5) {
      setSubmitError('Title must be at least 5 characters.')
      return
    }
    if (description.trim().length < 10) {
      setSubmitError('Description must be at least 10 characters.')
      return
    }
    setSubmitError(null)
    startTransition(async () => {
      const result = await createWorkOrder({
        propertyId,
        workerId:    worker.id,
        title:       title.trim(),
        description: description.trim(),
        priority,
        category:    category.trim() || null,
        dueDate:     dueDate || null,
      })
      if (result.error) {
        setSubmitError(result.error)
      } else {
        setDispatched(true)
      }
    })
  }

  if (dispatched) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">Work order dispatched</p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
            The maintenance worker has been notified and will respond shortly.
          </p>
          <button
            className="mt-2 text-sm underline text-green-700 dark:text-green-400"
            onClick={() => {
              setDispatched(false)
              setWorker(null)
              setEmail('')
              setTitle('')
              setDescription('')
              setPriority('normal')
              setCategory('')
              setDueDate('')
            }}
          >
            Dispatch another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Property selector */}
      {properties.length > 1 && (
        <div>
          <label className="block text-sm font-medium mb-1">Property</label>
          <select
            value={propertyId}
            onChange={e => { setPropertyId(e.target.value); setWorker(null); setLookupError(null) }}
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

      {/* Step 1: Worker lookup */}
      {propertyId && !worker && (
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={e => { setEmail(e.target.value); setLookupError(null) }}
            placeholder="Maintenance worker's email address"
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                       ring-offset-background placeholder:text-muted-foreground
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" variant="outline" disabled={isPending || !email.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Find Worker</span>
          </Button>
        </form>
      )}

      {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}

      {/* Step 2: Work order form */}
      {worker && (
        <form onSubmit={handleDispatch} className="space-y-4">
          {/* Worker confirmation */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3">
            <UserCheck className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {worker.display_name ?? worker.full_name ?? 'Maintenance Worker'}
              </p>
              <p className="text-xs text-muted-foreground">{worker.email}</p>
            </div>
            <button
              type="button"
              onClick={() => { setWorker(null); setEmail(''); setLookupError(null) }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
            >
              Change
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Title</label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={150}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Fix leaking pipe in unit 3B bathroom"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the issue and any specific instructions for the worker…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                         placeholder:text-muted-foreground resize-none
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as typeof priority)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PRIORITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Due Date <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Category <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              maxLength={100}
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Plumbing, Electrical, HVAC…"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !title.trim() || !description.trim()}>
              {isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Dispatching…</>
                : 'Dispatch Work Order'
              }
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setWorker(null); setEmail('') }}
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
