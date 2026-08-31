'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFavoriteIds, useToggleFavorite } from '@/hooks/properties/useFavorites'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils/cn'

// ── Guest wishlist (localStorage — no auth required) ─────────────────────────
// Signed-out visitors can save/unsave properties locally.
// Authenticated users use the existing DB-backed favorites instead.

const GUEST_KEY = 'lzs_guest_wishlist'

function readGuestIds(): Set<string> {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

function writeGuestIds(ids: Set<string>): void {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify([...ids]))
  } catch { /* private browsing or quota exceeded — silent no-op */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FavoriteButtonProps {
  propertyId: string
  className?: string
  size?: 'sm' | 'default'
}

export function FavoriteButton({ propertyId, className, size = 'default' }: FavoriteButtonProps) {
  const [mounted,  setMounted]  = useState(false)
  const [guestIds, setGuestIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Read guest wishlist from localStorage on first client render.
    setGuestIds(readGuestIds())
    setMounted(true)
  }, [])

  // All hooks called unconditionally — React rules of hooks.
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  const { data: favoriteIds } = useFavoriteIds()
  const { mutate, isPending } = useToggleFavorite(propertyId)

  const buttonCls = cn(
    'rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm',
    size === 'sm' && 'h-8 w-8',
    className,
  )
  const heartCls = cn(
    'transition-colors',
    size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
  )

  // ── Pre-hydration: deterministic disabled placeholder ───────────────────────
  // Server and first client render are identical — prevents hydration mismatch.
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={buttonCls}
        disabled
        aria-label="Save to favorites"
      >
        <Heart className={cn(heartCls, 'text-gray-600')} />
      </Button>
    )
  }

  // ── Authenticated: DB-backed favorites (existing behavior, unchanged) ────────
  if (isAuthenticated) {
    const isFavorited = favoriteIds?.has(propertyId) ?? false

    return (
      <Button
        variant="ghost"
        size="icon"
        className={buttonCls}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          mutate()
        }}
        disabled={isPending}
        aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
      >
        <Heart
          className={cn(
            heartCls,
            isFavorited ? 'fill-rose-500 text-rose-500' : 'text-gray-600',
          )}
        />
      </Button>
    )
  }

  // ── Guest: localStorage-backed wishlist — no login redirect ──────────────────
  const isGuestSaved = guestIds.has(propertyId)

  const handleGuestToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = new Set(guestIds)
    if (next.has(propertyId)) {
      next.delete(propertyId)
    } else {
      next.add(propertyId)
    }
    writeGuestIds(next)
    setGuestIds(next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={buttonCls}
      onClick={handleGuestToggle}
      aria-label={isGuestSaved ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <Heart
        className={cn(
          heartCls,
          isGuestSaved ? 'fill-rose-500 text-rose-500' : 'text-gray-600',
        )}
      />
    </Button>
  )
}
