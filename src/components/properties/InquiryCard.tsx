import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare, CheckCircle, Clock } from 'lucide-react'
import { formatRelative } from '@/lib/utils/format'

type PropertyRef = {
  id: string
  title: string
  slug: string
  city: string
  property_images: { url: string; order_index: number }[]
}

type InquiryCardProps = {
  id: string
  message: string
  inquiry_type: string
  is_read: boolean
  replied_at: string | null
  created_at: string
  property: PropertyRef | null
}

export function InquiryCard({
  message,
  inquiry_type,
  replied_at,
  created_at,
  property,
}: InquiryCardProps) {
  const img = property?.property_images
    ?.slice()
    .sort((a, b) => a.order_index - b.order_index)[0]
  const replied = !!replied_at

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-muted">
          {img ? (
            <Image
              src={img.url}
              alt={property?.title ?? ''}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
              <MessageSquare className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          {property ? (
            <Link
              href={`/properties/${property.slug}`}
              className="text-sm font-medium hover:underline line-clamp-1 block"
            >
              {property.title}
            </Link>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">Property no longer available</p>
          )}
          <p className="text-xs text-muted-foreground capitalize">
            {property?.city}
            {property?.city && ' · '}
            {inquiry_type} inquiry
          </p>
          <div className="flex items-center gap-1.5">
            {replied ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-green-600 dark:text-green-400">
                  Replied {formatRelative(replied_at!)}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-amber-600 dark:text-amber-400">Awaiting reply</span>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground shrink-0">{formatRelative(created_at)}</p>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 border-t pt-3">{message}</p>
    </div>
  )
}
