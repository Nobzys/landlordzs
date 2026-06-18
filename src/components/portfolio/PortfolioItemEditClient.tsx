'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { PortfolioItemForm, type PortfolioItemFormValues } from './PortfolioItemForm'

interface PortfolioItemEditClientProps {
  initial: PortfolioItemFormValues
}

export function PortfolioItemEditClient({ initial }: PortfolioItemEditClientProps) {
  const [savedAt, setSavedAt] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      <PortfolioItemForm initial={initial} onSaved={() => setSavedAt(Date.now())} />
      {savedAt && (
        <p key={savedAt} className="text-sm text-emerald-600 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          Saved.
        </p>
      )}
    </div>
  )
}
