'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createReview } from '@/lib/actions/reviews'
import { StarRating } from './StarRating'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ReviewFormProps {
  serviceRequestId: string
  professionalName: string
}

const SUB_RATINGS = [
  { key: 'communication', label: 'Communication' },
  { key: 'value', label: 'Value for Money' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'cleanliness', label: 'Cleanliness' },
] as const

export function ReviewForm({ serviceRequestId, professionalName }: ReviewFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [subRatings, setSubRatings] = useState<Record<string, number>>({})

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rating < 1) {
      setError('Please select a star rating.')
      return
    }

    startTransition(async () => {
      const result = await createReview({
        service_request_id: serviceRequestId,
        rating,
        title,
        body,
        ...subRatings,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Your rating for {professionalName}</Label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SUB_RATINGS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <StarRating
              value={subRatings[key] ?? 0}
              onChange={(v) => setSubRatings((prev) => ({ ...prev, [key]: v }))}
              size="sm"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          disabled={pending}
          placeholder="Summarize your experience"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Review <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          disabled={pending}
          placeholder="Share details about your experience with this professional"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit Review'}
      </Button>
    </form>
  )
}
