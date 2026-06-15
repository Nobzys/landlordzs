'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, LogOut,
  Heart, Search, Building2, Plus, TrendingUp, Store,
  Briefcase, Wrench, Ruler, Scale, LayoutDashboard,
  Users, Wallet, User, ShieldCheck, Flag, Settings, ClipboardList, FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { signOut } from '@/lib/actions/auth'
import { ROLE_LABELS } from '@/types/auth'
import { ROLE_NAV, type NavItem } from '@/lib/nav-config'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import type { Profile } from '@/types/auth'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart, Search, Building2, Plus, TrendingUp, Store,
  Briefcase, Wrench, Ruler, Scale, LayoutDashboard,
  Users, Wallet, User, ShieldCheck, Flag, Settings, ClipboardList, FolderOpen,
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname()
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
  const Icon = ICONS[item.icon]

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {item.label}
    </Link>
  )
}

function SidebarBody({ profile, onNavigate }: { profile: Profile; onNavigate?: () => void }) {
  const navItems = ROLE_NAV[profile.role] ?? []
  const displayName = profile.display_name ?? profile.full_name ?? profile.email

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-14 px-5 border-b shrink-0">
        <Link href="/" className="font-extrabold text-base tracking-tight text-primary">
          LANDLORDZS
        </Link>
      </div>

      <div className="px-5 py-3 border-b shrink-0">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="text-sm font-semibold truncate">{displayName}</p>
        <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
          {ROLE_LABELS[profile.role]}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={onNavigate} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t shrink-0">
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}

export function DashboardSidebar({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 h-screen border-r bg-card shrink-0 sticky top-0 overflow-y-auto">
        <SidebarBody profile={profile} />
      </aside>

      {/* Mobile: fixed top bar + Sheet drawer */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 border-b bg-card flex items-center px-3 gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-1">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarBody profile={profile} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/" className="font-extrabold text-sm tracking-tight text-primary">
          LANDLORDZS
        </Link>
      </div>
    </>
  )
}
