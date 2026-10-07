'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPropertyReview } from '@/lib/actions/reviews'
import { StarRating } from './StarRating'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PropertyReviewFormProps {
  propertyId: string
}

export function PropertyReviewForm({ propertyId }: PropertyReviewFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rating < 1) {
      setError('Please select a star rating.')
      return
    }

    startTransition(async () => {
      const result = await createPropertyReview(propertyId, { rating, title, body })
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
        <Label>Your rating</Label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      <div className="space-y-1.5">
        <Label>
          Title{' '}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          disabled={pending}
          placeholder="Summarize your experience"
        />
      </div>

      <div className="space-y-1.5">
        <Label>
          Review{' '}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          disabled={pending}
          placeholder="Share details about this property…"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit Review'}
      </Button>
    </form>
  )
}
