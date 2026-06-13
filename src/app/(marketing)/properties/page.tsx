import type { Metadata } from 'next'
import { PropertyGrid } from '@/components/properties/PropertyGrid'
import { PropertyFilters } from '@/components/properties/PropertyFilters'
import { PropertySearchBar } from '@/components/properties/PropertySearchBar'

export const metadata: Metadata = {
  title: 'Properties',
  description: 'Browse properties for sale, rent, and shortlet across Cameroon.',
}

export default function PropertiesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="bg-blue-700 py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-3xl font-bold text-white">Find Your Property</h1>
          <PropertySearchBar className="max-w-2xl" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <PropertyFilters />
        <PropertyGrid />
      </div>
    </main>
  )
}
