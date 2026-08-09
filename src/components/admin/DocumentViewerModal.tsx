'use client'

import { useState } from 'react'
import { FileText, X, Download } from 'lucide-react'

export interface VerificationDoc {
  label: string
  url: string | null
}

function getDocType(url: string): 'image' | 'pdf' | 'other' {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext ?? '')) return 'image'
  if (ext === 'pdf') return 'pdf'
  return 'other'
}

export default function DocumentViewerModal({ docs }: { docs: VerificationDoc[] }) {
  const [active, setActive] = useState<(VerificationDoc & { url: string }) | null>(null)

  const available = docs.filter((d): d is VerificationDoc & { url: string } => Boolean(d.url))

  if (available.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents uploaded.</p>
  }

  const docType = active ? getDocType(active.url) : 'other'

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {available.map((doc) => (
          <button
            key={doc.label}
            type="button"
            onClick={() => setActive(doc)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium
              hover:bg-accent transition-colors"
          >
            <FileText className="h-3 w-3" />
            {doc.label}
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-background rounded-xl overflow-hidden
              flex flex-col shadow-2xl"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <span className="text-sm font-medium truncate pr-4">{active.label}</span>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={active.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground
                    hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-md p-1 hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div
              className="overflow-auto flex-1 flex items-center justify-center
                bg-muted/30 p-4"
            >
              {docType === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.url}
                  alt={active.label}
                  className="max-w-full max-h-full object-contain rounded"
                />
              ) : docType === 'pdf' ? (
                <iframe
                  src={active.url}
                  title={active.label}
                  className="w-full rounded border-0"
                  style={{ height: '70vh' }}
                />
              ) : (
                <div className="text-center space-y-3 py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    Preview not available for this file type.
                  </p>
                  <a
                    href={active.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
