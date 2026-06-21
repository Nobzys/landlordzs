'use client'

import { useState } from 'react'
import { FileText, Download, Eye } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DocumentLink {
  label: string
  url: string | null
}

function isPdf(url: string) {
  return url.split('?')[0].toLowerCase().endsWith('.pdf')
}

function DocumentPreview({ label, url }: { label: string; url: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            {label}
          </Button>
        </DialogTrigger>
        <a href={url} download target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      </div>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border overflow-hidden bg-muted/30 max-h-[70vh] flex items-center justify-center">
          {isPdf(url) ? (
            <iframe src={url} title={label} className="w-full h-[65vh]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="max-h-[65vh] w-auto object-contain" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DocumentViewerModal({ documents }: { documents: DocumentLink[] }) {
  const available = documents.filter((d): d is { label: string; url: string } => !!d.url)

  if (available.length === 0) {
    return (
      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" /> No documents uploaded
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {available.map((d) => (
        <DocumentPreview key={d.label} label={d.label} url={d.url} />
      ))}
    </div>
  )
}
