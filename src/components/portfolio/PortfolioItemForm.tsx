'use client'

import { useState, useTransition } from 'react'
import { AlertCircle } from 'lucide-react'
import { createPortfolioItem, updatePortfolioItem } from '@/lib/actions/portfolio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

export interface PortfolioItemFormValues {
  id?: string
  title: string
  description: string | null
  project_type: string | null
  city: string | null
  completed_at: string | null
}

interface PortfolioItemFormProps {
  initial?: PortfolioItemFormValues | null
  onSaved: (id: string) => void
  onCancel?: () => void
}

export function PortfolioItemForm({ initial, onSaved, onCancel }: PortfolioItemFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [projectType, setProjectType] = useState(initial?.project_type ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [completedAt, setCompletedAt] = useState(initial?.completed_at ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!title.trim()) { setError('A title is required.'); return }
    setError(null)

    startTransition(async () => {
      const input = {
        title,
        description: description || null,
        projectType: projectType || null,
        city: city || null,
        completedAt: completedAt || null,
      }

      const result = initial?.id
        ? await updatePortfolioItem(initial.id, input)
        : await createPortfolioItem(input)

      if (result?.error) { setError(result.error); return }

      const id = initial?.id ?? (result as { data?: { id: string } }).data?.id
      if (id) onSaved(id)
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="portfolio-title">Project title *</Label>
        <Input id="portfolio-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} placeholder="e.g. 4-bedroom duplex in Bonapriso" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portfolio-description">Description</Label>
        <Textarea id="portfolio-description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} disabled={isPending} rows={4} placeholder="What did this project involve?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="portfolio-type">Project type</Label>
          <Input id="portfolio-type" value={projectType ?? ''} onChange={(e) => setProjectType(e.target.value)} disabled={isPending} placeholder="e.g. Renovation" />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Select value={city ?? ''} onValueChange={setCity} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Select a city" />
            </SelectTrigger>
            <SelectContent>
              {CAMEROON_CITIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portfolio-completed">Completed on</Label>
        <Input id="portfolio-completed" type="date" value={completedAt ?? ''} onChange={(e) => setCompletedAt(e.target.value)} disabled={isPending} />
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Saving…' : initial?.id ? 'Save changes' : 'Add project'}
        </Button>
      </div>
    </div>
  )
}
