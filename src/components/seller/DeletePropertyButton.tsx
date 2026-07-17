'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteProperty } from '@/lib/actions/properties'

export function DeletePropertyButton({ propertyId }: { propertyId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Delete this property? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteProperty(propertyId)
      if (result?.error) alert(`Delete failed: ${result.error}`)
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Delete"
      className="text-destructive hover:text-destructive"
      onClick={handleClick}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
