'use client'

import {
  createContext, useContext, useState, useEffect,
  ReactNode, HTMLAttributes, forwardRef, cloneElement,
  isValidElement, ReactElement,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SheetContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = createContext<SheetContextValue | null>(null)

function useSheet() {
  const ctx = useContext(SheetContext)
  if (!ctx) throw new Error('Sheet compound components must be used inside <Sheet>')
  return ctx
}

interface SheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function Sheet({ open, defaultOpen = false, onOpenChange, children }: SheetProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const controlled = open !== undefined
  const isOpen = controlled ? open : internalOpen

  const handleChange = (val: boolean) => {
    if (!controlled) setInternalOpen(val)
    onOpenChange?.(val)
  }

  return (
    <SheetContext.Provider value={{ open: isOpen, onOpenChange: handleChange }}>
      {children}
    </SheetContext.Provider>
  )
}

export function SheetTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { onOpenChange } = useSheet()
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ onClick?: () => void }>
    return cloneElement(child, { onClick: () => onOpenChange(true) })
  }
  return <button type="button" onClick={() => onOpenChange(true)}>{children}</button>
}

interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right' | 'top' | 'bottom'
}

const sideClasses = {
  right:  'inset-y-0 right-0 h-full w-3/4 sm:max-w-sm border-l',
  left:   'inset-y-0 left-0 h-full w-3/4 sm:max-w-sm border-r',
  top:    'inset-x-0 top-0 w-full border-b',
  bottom: 'inset-x-0 bottom-0 w-full border-t',
}

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, side = 'right', ...props }, ref) => {
    const { open, onOpenChange } = useSheet()

    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false)
      }
      if (open) document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }, [open, onOpenChange])

    useEffect(() => {
      document.body.style.overflow = open ? 'hidden' : ''
      return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null

    return (
      <div className="fixed inset-0 z-50">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            'fixed z-50 bg-background p-6 shadow-lg overflow-y-auto',
            sideClasses[side],
            className
          )}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }
)
SheetContent.displayName = 'SheetContent'

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
  )
}

export function SheetTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-semibold text-foreground', className)} {...props} />
  )
}

export function SheetDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  )
}
