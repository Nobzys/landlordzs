'use client'

import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

interface ShareButtonProps {
  title: string
  url?: string
  className?: string
}

export function ShareButton({ title, url, className }: ShareButtonProps) {
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl })
      } catch {}
      return
    }

    await navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm',
        className
      )}
      onClick={handleShare}
      aria-label="Share property"
    >
      <Share2 className="h-4 w-4 text-gray-600" />
    </Button>
  )
}
