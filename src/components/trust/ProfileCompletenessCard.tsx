import { CheckCircle2, Circle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { ProfileCompletenessResult } from '@/lib/utils/profileCompleteness'

interface ProfileCompletenessCardProps {
  result: ProfileCompletenessResult
}

export function ProfileCompletenessCard({ result }: ProfileCompletenessCardProps) {
  if (result.score === 100) return null

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Profile completeness</p>
        <span className="text-sm font-semibold text-primary">{result.score}%</span>
      </div>
      <Progress value={result.score} />
      <ul className="space-y-1.5">
        {result.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-xs">
            {item.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={item.done ? 'text-muted-foreground line-through' : ''}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
