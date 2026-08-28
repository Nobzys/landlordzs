'use client'

import { useState, useTransition } from 'react'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitQuotation } from '@/lib/actions/services'

interface QuotationFormProps {
  requestId: string
  onSuccess?: () => void
}

function StatusAlert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  return (
    <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
      type === 'success'
        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
        : 'bg-destructive/10 text-destructive'
    }`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function QuotationForm({ requestId, onSuccess }: QuotationFormProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      setResult(null)
      const res = await submitQuotation(fd)
      if (res.error) {
        setResult({ error: res.error })
        return
      }
      setResult({ success: true })
      onSuccess?.()
    })
  }

  if (result?.success) {
    return (
      <div className="rounded-xl border bg-green-500/5 p-5">
        <StatusAlert type="success" message="Quotation submitted successfully! The client will be notified." />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="request_id" value={requestId} />

      {result?.error && <StatusAlert type="error" message={result.error} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Your Quote (XAF) <span className="text-destructive">*</span></Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="1000"
            placeholder="e.g. 250000"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timeline_days">Estimated Duration (days)</Label>
          <Input
            id="timeline_days"
            name="timeline_days"
            type="number"
            min="1"
            max="365"
            placeholder="e.g. 14"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="proposal">Your Proposal <span className="text-destructive">*</span></Label>
        <Textarea
          id="proposal"
          name="proposal"
          placeholder="Describe your approach, methodology, relevant experience, and why you are the right professional for this job…"
          rows={5}
          required
          disabled={isPending}
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Quotation
      </Button>
    </form>
  )
}
