import { UserCircle } from 'lucide-react'
import { StarRating } from './StarRating'
import { formatDate } from '@/lib/utils/format'
import type { Review } from '@/types/review'

interface ReviewCardProps {
  review: Review
  personName: string
  personAvatarUrl?: string | null
  personRole?: string | null
}

const SUB_RATINGS: { key: keyof Review; label: string }[] = [
  { key: 'communication', label: 'Communication' },
  { key: 'value', label: 'Value' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'cleanliness', label: 'Cleanliness' },
]

export function ReviewCard({ review, personName, personAvatarUrl, personRole }: ReviewCardProps) {
  const subRatings = SUB_RATINGS.filter(({ key }) => typeof review[key] === 'number')

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {personAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={personAvatarUrl} alt={personName} className="h-9 w-9 rounded-full object-cover shrink-0" />
          ) : (
            <UserCircle className="h-9 w-9 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{personName}</p>
            {personRole && <p className="text-xs text-muted-foreground capitalize">{personRole}</p>}
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatDate(review.created_at)}</span>
      </div>

      <StarRating value={review.rating} readOnly size="sm" />

      {review.title && <p className="text-sm font-semibold">{review.title}</p>}
      {review.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{review.body}</p>}

      {subRatings.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-1 border-t text-xs text-muted-foreground">
          {subRatings.map(({ key, label }) => (
            <span key={key}>
              {label}: {review[key] as number}/5
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
