'use client'

import { type ReactNode } from 'react'
import { QueryProvider } from './QueryProvider'
import { AuthProvider } from './AuthProvider'
import { Toaster } from '@/components/ui/toaster'
import type { Profile } from '@/types/auth'

interface ProvidersProps {
  children:       ReactNode
  initialProfile?: Profile | null
}

// Single entry-point that wraps all client-side providers.
// Used in the root layout so all pages benefit.
export function Providers({ children, initialProfile }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider initialProfile={initialProfile}>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryProvider>
  )
}
