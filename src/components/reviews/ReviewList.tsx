import { ReviewCard } from './ReviewCard'
import type { Review } from '@/types/review'

export interface ReviewListItem {
  review: Review
  personName: string
  personAvatarUrl?: string | null
  personRole?: string | null
}

interface ReviewListProps {
  items: ReviewListItem[]
  emptyText?: string
}

export function ReviewList({ items, emptyText = 'No reviews yet.' }: ReviewListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className="space-y-3">
      {items.map(({ review, personName, personAvatarUrl, personRole }) => (
        <ReviewCard
          key={review.id}
          review={review}
          personName={personName}
          personAvatarUrl={personAvatarUrl}
          personRole={personRole}
        />
      ))}
    </div>
  )
}
