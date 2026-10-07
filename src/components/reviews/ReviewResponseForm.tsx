'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createReviewResponse } from '@/lib/actions/reviews'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ReviewResponseFormProps {
  reviewId: string
}

export function ReviewResponseForm({ reviewId }: ReviewResponseFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await createReviewResponse(reviewId, body)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Your response</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          disabled={pending}
          placeholder="Write your professional response to this review…"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Submitting…' : 'Post Response'}
      </Button>
    </form>
  )
}
