'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { X, GitCompare } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'compare_ids'
const MAX_COMPARE = 3

export type CompareItem = {
  id: string
  title: string
}

export function useCompare() {
  const [items, setItems] = useState<CompareItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // ignore parse errors
    }
  }, [])

  const addItem = useCallback((item: CompareItem) => {
    setItems((prev) => {
      if (prev.find((i) => i.id === item.id) || prev.length >= MAX_COMPARE) return prev
      const next = [...prev, item]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setItems([])
  }, [])

  const isInCompare = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items],
  )

  return {
    items,
    addItem,
    removeItem,
    clearAll,
    isInCompare,
    isFull: items.length >= MAX_COMPARE,
  }
}

export function CompareBar() {
  const { items, removeItem, clearAll } = useCompare()

  if (items.length === 0) return null

  const compareHref = `/buyer/compare?ids=${items.map((i) => i.id).join(',')}`

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <GitCompare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Compare</span>
          <span className="text-xs text-muted-foreground">
            ({items.length}/{MAX_COMPARE})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs bg-muted/50"
            >
              <span className="max-w-[120px] truncate">{item.title}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${item.title} from comparison`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
            Clear all
          </Button>
          <Button asChild size="sm" disabled={items.length < 2}>
            <Link href={compareHref}>Compare now</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
