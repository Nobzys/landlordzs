import { Wallet, TrendingUp, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatXAF } from '@/lib/utils/format'
import { useWallet } from '@/hooks/payments/useWallet'

export function WalletCard() {
  const { data: wallet, isLoading } = useWallet()

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    )
  }

  const balance  = wallet?.balance ?? 0
  const locked   = wallet?.locked  ?? 0
  const available = balance - locked

  return (
    <Card className="bg-gradient-to-br from-blue-700 to-blue-900 text-white border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-blue-200 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          LANDLORDZS Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold">{formatXAF(available)}</p>
          <p className="text-sm text-blue-200 mt-0.5">Available balance</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-600">
          <div>
            <p className="text-xs text-blue-300 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Total balance
            </p>
            <p className="text-sm font-semibold mt-0.5">{formatXAF(balance)}</p>
          </div>
          {locked > 0 && (
            <div>
              <p className="text-xs text-blue-300 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                In escrow
              </p>
              <p className="text-sm font-semibold mt-0.5">{formatXAF(locked)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
