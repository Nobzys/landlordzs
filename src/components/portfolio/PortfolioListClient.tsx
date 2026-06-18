'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Star } from 'lucide-react'
import { deletePortfolioItem } from '@/lib/actions/portfolio'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PortfolioItemForm } from './PortfolioItemForm'
import { formatDate } from '@/lib/utils/format'

interface PortfolioItemRow {
  id: string
  title: string
  description: string | null
  project_type: string | null
  city: string | null
  completed_at: string | null
  is_featured: boolean
  portfolio_images: { id: string; url: string; caption: string | null; is_cover: boolean }[]
}

interface PortfolioListClientProps {
  items: PortfolioItemRow[]
}

export function PortfolioListClient({ items: initialItems }: PortfolioListClientProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [createOpen, setCreateOpen] = useState(false)
  const [, startTransition] = useTransition()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a portfolio project</DialogTitle>
            </DialogHeader>
            <PortfolioItemForm
              onCancel={() => setCreateOpen(false)}
              onSaved={(id) => {
                setCreateOpen(false)
                router.push(`/account/portfolio/${id}`)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          You haven&apos;t added any projects yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const cover = item.portfolio_images.find((img) => img.is_cover) ?? item.portfolio_images[0]
            return (
              <Card key={item.id} className="overflow-hidden">
                <Link href={`/account/portfolio/${item.id}`}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover.url} alt={item.title} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No photos yet
                    </div>
                  )}
                </Link>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/account/portfolio/${item.id}`} className="font-medium text-sm hover:underline truncate">
                      {item.title}
                    </Link>
                    {item.is_featured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                  </div>
                  {item.completed_at && (
                    <p className="text-xs text-muted-foreground">Completed {formatDate(item.completed_at)}</p>
                  )}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline flex items-center gap-1"
                      onClick={() => startTransition(async () => {
                        const res = await deletePortfolioItem(item.id)
                        if (!res?.error) setItems((prev) => prev.filter((i) => i.id !== item.id))
                      })}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
