'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChartDataPoint } from '@/components/admin/ReportChart'

const ReportChart = dynamic(
  () => import('@/components/admin/ReportChart').then(m => m.ReportChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] rounded-xl" /> }
)

interface AnalyticsChartProps {
  type: 'line' | 'bar' | 'area' | 'pie'
  data: ChartDataPoint[]
  color?: string
  height?: number
}

export function AnalyticsChart(props: AnalyticsChartProps) {
  return <ReportChart {...props} />
}
