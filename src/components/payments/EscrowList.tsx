'use client'

import { Shield } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EscrowCard } from './EscrowCard'
import { useEscrows } from '@/hooks/payments/useEscrow'

export function EscrowList() {
  const { data: escrows, isLoading } = useEscrows()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    )
  }

  if (!escrows || escrows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="font-medium mb-1">No escrow agreements</p>
        <p className="text-sm">
          Escrow payments are created when you engage a contractor or make a property transaction.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {escrows.map(e => <EscrowCard key={e.id} escrow={e} />)}
    </div>
  )
}
