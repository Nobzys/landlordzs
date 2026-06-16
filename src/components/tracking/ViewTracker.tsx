'use client'

import { useEffect } from 'react'
import { trackView } from '@/lib/actions/recently-viewed'

interface Props {
  entityType: 'property' | 'professional'
  entityId: string
}

export function ViewTracker({ entityType, entityId }: Props) {
  useEffect(() => {
    // Fire once on mount; ignore result
    void trackView(entityType, entityId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
