'use client'

import {
  createContext, useContext, useState, useRef, useEffect,
  forwardRef, HTMLAttributes, ReactNode,
  KeyboardEvent,
} from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SelectContextValue {
  value: string
  onValueChange: (v: string) => void
  open: boolean
  setOpen: (o: boolean) => void
  placeholder?: string
  displayValue: string
  setDisplayValue: (v: string) => void
}

const SelectContext = createContext<SelectContextValue | null>(null)

function useSelect() {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error('Select compound components must be used inside <Select>')
  return ctx
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  disabled?: boolean
}

export function Select({ value, defaultValue, onValueChange, children, disabled }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const [open, setOpen] = useState(false)
  const [displayValue, setDisplayValue] = useState('')

  const controlled = value !== undefined
  const current = controlled ? value : internalValue

  const handleChange = (v: string) => {
    if (!controlled) setInternalValue(v)
    onValueChange?.(v)
    setOpen(false)
  }

  return (
    <SelectContext.Provider
      value={{ value: current, onValueChange: handleChange, open, setOpen, displayValue, setDisplayValue }}
    >
      <div className="relative" data-disabled={disabled || undefined}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export const SelectTrigger = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, value } = useSelect()
    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input ' +
          'bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground ' +
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ' +
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className={cn('h-4 w-4 opacity-50 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, displayValue } = useSelect()
  return (
    <span className={cn(!displayValue && !value && 'text-muted-foreground')}>
      {displayValue || value || placeholder || ''}
    </span>
  )
}

export const SelectContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect()
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (!open) return
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [open, setOpen])

    if (!open) return null

    return (
      <div
        ref={containerRef}
        className={cn(
          'absolute z-50 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover ' +
          'text-popover-foreground shadow-md animate-in fade-in-80 top-full mt-1',
          className
        )}
        {...props}
      >
        <div className="p-1 max-h-60 overflow-auto">{children}</div>
      </div>
    )
  }
)
SelectContent.displayName = 'SelectContent'

interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

export function SelectItem({ className, children, value, disabled, ...props }: SelectItemProps) {
  const { value: selected, onValueChange, setDisplayValue } = useSelect()
  const isSelected = selected === value

  const handleSelect = () => {
    if (disabled) return
    setDisplayValue(typeof children === 'string' ? children : '')
    onValueChange(value)
  }

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      onClick={handleSelect}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm ' +
        'outline-none hover:bg-accent hover:text-accent-foreground ' +
        'focus:bg-accent focus:text-accent-foreground',
        isSelected && 'bg-accent',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  )
}

export function SelectGroup({ children }: { children: ReactNode }) {
  return <div role="group">{children}</div>
}

export function SelectLabel({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}>{children}</div>
  )
}

export function SelectSeparator({ className }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} />
}
