'use client'

import { useState, useTransition } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { toggleSaveProfessional } from '@/lib/actions/saved-professionals'
import { Button } from '@/components/ui/button'

interface Props {
  professionalId: string
  initialSaved?: boolean
}

export function SaveProfessionalButton({ professionalId, initialSaved = false }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await toggleSaveProfessional(professionalId)
      if (result.data) setSaved(result.data.saved)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={handleClick}
      className="gap-1.5"
      title={saved ? 'Remove from saved' : 'Save professional'}
    >
      {saved
        ? <BookmarkCheck className="h-4 w-4 text-primary" />
        : <Bookmark className="h-4 w-4" />
      }
      {saved ? 'Saved' : 'Save'}
    </Button>
  )
}
