export default function AccountLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-7 w-32 rounded bg-muted" />
      <div className="rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-10 w-full rounded-md bg-muted" />
          </div>
        ))}
        <div className="h-10 w-28 rounded-md bg-muted" />
      </div>
    </div>
  )
}
