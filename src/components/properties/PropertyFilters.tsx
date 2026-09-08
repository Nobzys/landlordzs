'use client'

import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { useFilterStore } from '@/stores/filterStore'
import { cn } from '@/lib/utils/cn'

const PROPERTY_TYPES = [
  { value: 'apartment',        label: 'Apartment' },
  { value: 'villa',            label: 'Villa' },
  { value: 'house',            label: 'House' },
  { value: 'studio',           label: 'Studio' },
  { value: 'duplex',           label: 'Duplex' },
  { value: 'penthouse',        label: 'Penthouse' },
  { value: 'commercial_space', label: 'Commercial' },
  { value: 'office',           label: 'Office' },
  { value: 'land',             label: 'Land' },
  { value: 'shop',             label: 'Shop' },
  { value: 'warehouse',        label: 'Warehouse' },
  { value: 'farm',             label: 'Farm' },
  { value: 'hotel',            label: 'Hotel' },
]

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest first' },
  { value: 'oldest',      label: 'Oldest first' },
  { value: 'price_asc',   label: 'Price: Low to High' },
  { value: 'price_desc',  label: 'Price: High to Low' },
  { value: 'most_viewed', label: 'Most Viewed' },
]

const FEATURES = [
  { key: 'is_furnished',  label: 'Furnished' },
  { key: 'is_negotiable', label: 'Price Negotiable' },
  { key: 'has_security',  label: '24h Security' },
  { key: 'has_generator', label: 'Generator' },
  { key: 'is_verified',   label: 'Verified Properties' },
]

export function PropertyFilters({
  className,
  variant = 'topbar',
}: {
  className?: string
  variant?: 'topbar' | 'sidebar'
}) {
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilterStore()
  const active = hasActiveFilters()

  // ── Sidebar variant ────────────────────────────────────────────────────────
  if (variant === 'sidebar') {
    return (
      <div className={cn('space-y-5 p-4 rounded-xl border bg-card', className)}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Search Filters</span>
          {active && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#B71C1C] hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Listing type */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Listing Type
          </p>
          <div className="flex flex-col gap-1.5">
            {(['sale', 'rent', 'short_term'] as const).map(t => (
              <Button
                key={t}
                variant={filters.listing_type === t ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  setFilter('listing_type', filters.listing_type === t ? undefined : t)
                }
              >
                {t === 'sale' ? 'For Sale' : t === 'rent' ? 'For Rent' : 'Shortlet'}
              </Button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Location
          </p>
          <Select
            value={filters.city ?? ''}
            onValueChange={v => setFilter('city', (v as any) || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All cities</SelectItem>
              {CAMEROON_CITIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sort By
          </p>
          <Select
            value={filters.sort_by ?? ''}
            onValueChange={v => setFilter('sort_by', (v as any) || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Newest first" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t" />

        {/* Property type */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Property Type
          </p>
          <Select
            value={filters.property_type ?? ''}
            onValueChange={v => setFilter('property_type', (v as any) || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any type</SelectItem>
              {PROPERTY_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price range */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Price Range (XAF)
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.min_price ?? ''}
              onChange={e =>
                setFilter('min_price', e.target.value ? Number(e.target.value) : undefined)
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.max_price ?? ''}
              onChange={e =>
                setFilter('max_price', e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>
        </div>

        {/* Bedrooms */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bedrooms (min)
          </p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Button
                key={n}
                variant={filters.bedrooms === n ? 'default' : 'outline'}
                size="sm"
                className="flex-1 px-0"
                onClick={() =>
                  setFilter('bedrooms', filters.bedrooms === n ? undefined : n)
                }
              >
                {n}+
              </Button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Features
          </p>
          {FEATURES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`sb-${key}`}
                checked={!!filters[key as keyof typeof filters]}
                onCheckedChange={v => setFilter(key as keyof typeof filters, v ? true : undefined)}
              />
              <Label htmlFor={`sb-${key}`} className="cursor-pointer font-normal text-sm">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Topbar variant (original behaviour — unchanged) ────────────────────────
  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      {/* Listing type pills */}
      <div className="flex gap-2">
        {(['sale', 'rent', 'short_term'] as const).map(t => (
          <Button
            key={t}
            variant={filters.listing_type === t ? 'default' : 'outline'}
            size="sm"
            className="capitalize"
            onClick={() => setFilter('listing_type', filters.listing_type === t ? undefined : t)}
          >
            {t === 'sale' ? 'For Sale' : t === 'rent' ? 'For Rent' : 'Shortlet'}
          </Button>
        ))}
      </div>

      {/* City select */}
      <Select
        value={filters.city ?? ''}
        onValueChange={v => setFilter('city', (v as any) || undefined)}
      >
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="City" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All cities</SelectItem>
          {CAMEROON_CITIES.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={filters.sort_by ?? ''}
        onValueChange={v => setFilter('sort_by', (v as any) || undefined)}
      >
        <SelectTrigger className="w-44 h-9">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* More filters sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            More filters
            {active && <span className="h-1.5 w-1.5 rounded-full bg-[#B71C1C]" />}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-[360px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select
                value={filters.property_type ?? ''}
                onValueChange={v => setFilter('property_type', (v as any) || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any type</SelectItem>
                  {PROPERTY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Price Range (XAF)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.min_price ?? ''}
                  onChange={e =>
                    setFilter('min_price', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.max_price ?? ''}
                  onChange={e =>
                    setFilter('max_price', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bedrooms (min)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <Button
                    key={n}
                    variant={filters.bedrooms === n ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      setFilter('bedrooms', filters.bedrooms === n ? undefined : n)
                    }
                  >
                    {n}+
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Features</Label>
              {FEATURES.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={!!filters[key as keyof typeof filters]}
                    onCheckedChange={v =>
                      setFilter(key as keyof typeof filters, v ? true : undefined)
                    }
                  />
                  <Label htmlFor={key} className="cursor-pointer font-normal">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" className="w-full" onClick={resetFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear all filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {active && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
