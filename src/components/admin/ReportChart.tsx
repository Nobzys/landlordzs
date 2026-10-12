'use client'

import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts'

export interface ChartDataPoint {
  name: string
  value: number
}

interface ReportChartProps {
  type: 'line' | 'bar' | 'area' | 'pie'
  data: ChartDataPoint[]
  color?: string
  height?: number
}

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function ReportChart({ type, data, color = '#4f46e5', height = 220 }: ReportChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data available
      </div>
    )
  }

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={height / 2 - 20}
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const commonProps = {
    data,
    margin: { top: 5, right: 10, left: 0, bottom: 5 },
  }

  const axisStyle = { fontSize: 11 }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis allowDecimals={false} tick={axisStyle} width={35} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={axisStyle} />
          <YAxis allowDecimals={false} tick={axisStyle} width={50} />
          <Tooltip formatter={(v: number) => `XAF ${v.toLocaleString()}`} />
          <Area type="monotone" dataKey="value" stroke={color} fill={`${color}33`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={axisStyle} />
        <YAxis allowDecimals={false} tick={axisStyle} width={35} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
