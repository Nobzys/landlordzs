import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { PropertyFilters } from '@/types/property'

interface FilterState {
  filters: PropertyFilters
}

interface FilterActions {
  setFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void
  setFilters: (filters: Partial<PropertyFilters>) => void
  resetFilters: () => void
  hasActiveFilters: () => boolean
}

const defaultFilters: PropertyFilters = {}

export const useFilterStore = create<FilterState & FilterActions>()(
  devtools(
    (set, get) => ({
      filters: defaultFilters,

      setFilter: (key, value) =>
        set(state => ({
          filters: value === undefined || value === ''
            ? (() => { const f = { ...state.filters }; delete f[key]; return f })()
            : { ...state.filters, [key]: value },
        })),

      setFilters: (filters) =>
        set(state => ({ filters: { ...state.filters, ...filters } })),

      resetFilters: () => set({ filters: defaultFilters }),

      hasActiveFilters: () => {
        const { filters } = get()
        return Object.keys(filters).some(k => {
          const v = filters[k as keyof PropertyFilters]
          return v !== undefined && v !== '' && v !== false
        })
      },
    }),
    { name: 'FilterStore' }
  )
)
