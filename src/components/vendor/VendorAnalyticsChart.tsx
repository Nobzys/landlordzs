'use client'

import dynamic from 'next/dynamic'
import type { ChartDataPoint } from '@/components/admin/ReportChart'

const ReportChart = dynamic(
  () => import('@/components/admin/ReportChart').then(m => ({ default: m.ReportChart })),
  { ssr: false },
)

interface VendorAnalyticsChartProps {
  revenueData: ChartDataPoint[]
  orderData: ChartDataPoint[]
}

export function VendorAnalyticsChart({ revenueData, orderData }: VendorAnalyticsChartProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3">Monthly Revenue (XAF)</h3>
        <ReportChart type="area" data={revenueData} color="#10b981" height={180} />
      </div>
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3">Orders per Month</h3>
        <ReportChart type="bar" data={orderData} color="#4f46e5" height={180} />
      </div>
    </div>
  )
}
