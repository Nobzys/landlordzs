import type { ReactNode } from 'react'
import HomeNav from '@/components/marketing/home-nav'
import CategoryNav from '@/components/marketing/category-nav'
import HomeFooter from '@/components/marketing/home-footer'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <HomeNav />
      <CategoryNav />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-lg">
          {children}
        </div>
      </div>
      <HomeFooter />
    </div>
  )
}
