'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { completeWorkOrder } from '@/lib/actions/workOrders'
import { uploadMaintenancePhoto } from '@/lib/supabase/storage'

interface Props {
  workOrderId: string
  workerId:    string
}

export function WorkOrderCompleteForm({ workOrderId, workerId }: Props) {
  const [notes, setNotes]           = useState('')
  const [costStr, setCostStr]       = useState('')
  const [files, setFiles]           = useState<File[]>([])
  const [error, setError]           = useState<string | null>(null)
  const [done, setDone]             = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    setFiles(prev => {
      const combined = [...prev, ...picked]
      return combined.slice(0, 5)
    })
    e.target.value = ''
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cost = costStr.trim() ? parseInt(costStr, 10) : null
    if (costStr.trim() && (isNaN(cost!) || cost! < 0)) {
      setError('Parts cost must be a positive number.')
      return
    }

    startTransition(async () => {
      let photoPaths: string[] = []

      if (files.length > 0) {
        try {
          const uploads = await Promise.all(
            files.map(f => uploadMaintenancePhoto(workOrderId, workerId, f)),
          )
          photoPaths = uploads.map(u => u.path)
        } catch (err: any) {
          setError(err?.message ?? 'Photo upload failed. Please try again.')
          return
        }
      }

      const result = await completeWorkOrder(
        workOrderId,
        notes.trim() || null,
        photoPaths,
        cost,
      )

      if (result.error) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">Work order marked as completed</p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
            The Property Manager will review and close the work order.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Completion Notes <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Describe the work completed, any observations or recommendations…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                     placeholder:text-muted-foreground resize-none
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Parts Cost (XAF) <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={costStr}
          onChange={e => setCostStr(e.target.value)}
          placeholder="e.g. 25000"
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Completion Photos <span className="text-muted-foreground">(optional, up to 5)</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-input
                          bg-muted/40 px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
          <ImagePlus className="h-4 w-4" />
          Add Photos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleFilePick}
            disabled={isPending || files.length >= 5}
          />
        </label>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                <span className="truncate max-w-[240px] text-muted-foreground">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                  disabled={isPending}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {files.length > 0 ? 'Uploading & saving…' : 'Saving…'}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as Completed
          </>
        )}
      </Button>
    </form>
  )
}
