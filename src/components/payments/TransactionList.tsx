'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransactionCard } from './TransactionCard'
import { useTransactions } from '@/hooks/payments/useTransactions'
import { useAuthStore } from '@/stores/authStore'

export function TransactionList() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useTransactions()

  const transactions = data?.pages.flatMap(p => p.items) ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Failed to load transactions
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No transactions yet
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {transactions.map(t => (
        <TransactionCard key={t.id} transaction={t} userId={user?.id ?? ''} />
      ))}

      {hasNextPage && (
        <div className="pt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
