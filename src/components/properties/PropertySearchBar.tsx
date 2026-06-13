'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { PropertyPriceTag } from './PropertyPriceTag'
import { usePropertySearch } from '@/hooks/properties/usePropertySearch'
import { useFilterStore } from '@/stores/filterStore'
import { cn } from '@/lib/utils/cn'

export function PropertySearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const containerRef      = useRef<HTMLDivElement>(null)

  const setFilter = useFilterStore(s => s.setFilter)
  const { data: results, isFetching } = usePropertySearch(query)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setFilter('search', query)
      setOpen(false)
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search properties, neighborhoods…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setFilter('search', undefined); setOpen(false) }}
            className="absolute right-3 text-muted-foreground hover:text-foreground"
          >
            {isFetching
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <X className="h-4 w-4" />
            }
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
          {isFetching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isFetching && (!results || results.length === 0) && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No properties found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!isFetching && results && results.length > 0 && (
            <ul>
              {results.map(p => (
                <li key={p.id}>
                  <Link
                    href={`/properties/${p.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.city}</p>
                    </div>
                    <PropertyPriceTag
                      price={p.price}
                      listingType={p.listing_type}
                      className="text-sm shrink-0"
                      short
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
