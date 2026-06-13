'use client'

import { createContext, forwardRef, useContext } from 'react'
import type { HTMLAttributes, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

// ── Context ───────────────────────────────────────────────────────────────────

interface RadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
}

const RadioGroupContext = createContext<RadioGroupContextValue>({})

// ── RadioGroup ────────────────────────────────────────────────────────────────

interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string
  onValueChange?: (value: string) => void
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, ...props }, ref) => (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div
        ref={ref}
        role="radiogroup"
        className={cn('grid gap-2', className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
)
RadioGroup.displayName = 'RadioGroup'

// ── RadioGroupItem ────────────────────────────────────────────────────────────

export interface RadioGroupItemProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> {
  value: string
}

export const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, ...props }, ref) => {
    const { value: groupValue, onValueChange } = useContext(RadioGroupContext)
    return (
      <input
        ref={ref}
        type="radio"
        value={value}
        checked={groupValue !== undefined ? groupValue === value : undefined}
        onChange={() => onValueChange?.(value)}
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-primary text-primary ' +
          'ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
          'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-primary cursor-pointer',
          className
        )}
        {...props}
      />
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'
