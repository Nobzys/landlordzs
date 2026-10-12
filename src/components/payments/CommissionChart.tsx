'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useCommissions } from '@/hooks/payments/useCommissions'
import { Skeleton } from '@/components/ui/skeleton'

const ReportChart = dynamic(
  () => import('@/components/admin/ReportChart').then(m => ({ default: m.ReportChart })),
  { ssr: false },
)

export function CommissionChart() {
  const { data: records, isLoading } = useCommissions()

  const monthlyData = useMemo(() => {
    if (!records) return []
    const byMonth: Record<string, number> = {}
    records
      .filter(r => r.status !== 'cancelled')
      .forEach(r => {
        const month = r.created_at.slice(0, 7) // YYYY-MM
        byMonth[month] = (byMonth[month] ?? 0) + r.amount
      })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, value]) => ({ name: key.slice(5), value }))
  }, [records])

  if (isLoading) return <Skeleton className="h-[200px] rounded-xl" />

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3">Monthly Earnings (XAF)</h3>
      <ReportChart type="area" data={monthlyData} color="#4f46e5" height={180} />
    </div>
  )
}
