import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PropertyAmenityRow } from '@/types/database'

interface PropertyAmenitiesProps {
  amenities: PropertyAmenityRow[]
}

export function PropertyAmenities({ amenities }: PropertyAmenitiesProps) {
  if (amenities.length === 0) return null

  const grouped = amenities.reduce<Record<string, PropertyAmenityRow[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">Amenities & Features</h2>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            {category}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map(item => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-2 text-sm rounded-md px-3 py-2',
                  item.has_feature ? 'bg-emerald-50 text-emerald-800' : 'bg-muted text-muted-foreground'
                )}
              >
                {item.has_feature
                  ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  : <X className="h-3.5 w-3.5 shrink-0" />
                }
                {item.name}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
