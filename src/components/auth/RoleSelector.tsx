'use client'

import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, REGISTERABLE_ROLES } from '@/lib/utils/constants'
import type { RegisterableRole } from '@/types/auth'
import {
  Home, Building2, Users, ShoppingBag,
  HardHat, Wrench, Ruler, Scale,
} from 'lucide-react'

const ROLE_ICONS: Record<RegisterableRole, React.ReactNode> = {
  buyer:      <Home      size={24} />,
  seller:     <Building2 size={24} />,
  agent:      <Users     size={24} />,
  vendor:     <ShoppingBag size={24} />,
  contractor: <HardHat   size={24} />,
  engineer:   <Wrench    size={24} />,
  architect:  <Ruler     size={24} />,
  lawyer:     <Scale     size={24} />,
}

interface RoleSelectorProps {
  value:    RegisterableRole | null
  onChange: (role: RegisterableRole) => void
  error?:   string
}

export function RoleSelector({ value, onChange, error }: RoleSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {REGISTERABLE_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all',
              'hover:border-primary hover:bg-primary/5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              value === role
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground'
            )}
          >
            <span className={cn(value === role && 'text-primary')}>
              {ROLE_ICONS[role]}
            </span>
            <span className="text-xs font-medium leading-tight">
              {ROLE_LABELS[role]}
            </span>
          </button>
        ))}
      </div>

      {/* Description of the selected role */}
      {value && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {ROLE_DESCRIPTIONS[value]}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
