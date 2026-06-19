interface Metric {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sublabel?: string
}

interface MetricsGridProps {
  metrics: Metric[]
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2.5 text-muted-foreground mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <m.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium">{m.label}</span>
          </div>
          <p className="text-3xl font-bold leading-tight tracking-tight">{m.value}</p>
          {m.sublabel && <p className="text-xs text-muted-foreground mt-1">{m.sublabel}</p>}
        </div>
      ))}
    </div>
  )
}
