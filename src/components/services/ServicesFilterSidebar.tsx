'use client'

import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

interface ServicesFilterSidebarProps {
  children: React.ReactNode
  title?: string
  asideClassName?: string
}

export function ServicesFilterSidebar({ children, title = 'Filter Providers', asideClassName }: ServicesFilterSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* ── Mobile: Filters button + slide-in drawer ── */}
      <div className="lg:hidden w-full">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted/50 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Filters">
            {/* Backdrop */}
            <div
              className="flex-1 bg-black/50"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer panel */}
            <div className="w-80 max-w-[90vw] bg-background overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background z-10">
                <span className="font-semibold text-sm">{title}</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                {children}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop: persistent sidebar — always visible ── */}
      <aside className={`hidden lg:block w-64 shrink-0 sticky top-4 self-start overflow-y-auto ${asideClassName ?? 'max-h-[calc(100vh-5rem)]'}`}>
        {children}
      </aside>
    </>
  )
}
