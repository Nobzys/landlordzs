'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, LogOut, ChevronLeft, ChevronRight,
  Heart, Search, Building2, Plus, TrendingUp, Store,
  Briefcase, Wrench, Ruler, Scale, LayoutDashboard,
  Users, Wallet, User, ShieldCheck, Flag, Settings,
  Package, ClipboardList, BarChart3, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { signOut } from '@/lib/actions/auth'
import { ROLE_LABELS } from '@/types/auth'
import { ROLE_NAV, type NavItem } from '@/lib/nav-config'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { Avatar } from '@/components/ui/avatar'
import { VerifiedBadge } from '@/components/trust/VerifiedBadge'
import type { Profile } from '@/types/auth'
import type { ProfileCompletenessResult } from '@/lib/utils/profileCompleteness'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart, Search, Building2, Plus, TrendingUp, Store,
  Briefcase, Wrench, Ruler, Scale, LayoutDashboard,
  Users, Wallet, User, ShieldCheck, Flag, Settings,
  Package, ClipboardList, BarChart3, MessageSquare,
}

function NavLink({ item, collapsed, onClick }: { item: NavItem; collapsed?: boolean; onClick?: () => void }) {
  const pathname = usePathname()
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
  const Icon = ICONS[item.icon]

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {!collapsed && item.label}
    </Link>
  )
}

interface SidebarBodyProps {
  profile: Profile
  completeness: ProfileCompletenessResult
  collapsed?: boolean
  onNavigate?: () => void
  onToggleCollapse?: () => void
}

function SidebarBody({ profile, completeness, collapsed, onNavigate, onToggleCollapse }: SidebarBodyProps) {
  const navItems = ROLE_NAV[profile.role] ?? []
  const displayName = profile.display_name ?? profile.full_name ?? profile.email

  return (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center h-14 px-5 border-b shrink-0', collapsed && 'px-3 justify-center')}>
        {collapsed ? (
          <span className="font-extrabold text-base text-primary">L</span>
        ) : (
          <Link href="/" className="font-extrabold text-base tracking-tight text-primary">
            LANDLORDZS
          </Link>
        )}
      </div>

      <div className={cn('px-5 py-3 border-b shrink-0', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-2', collapsed && 'flex-col gap-1')}>
          <div className="relative shrink-0">
            <Avatar src={profile.avatar_url} name={displayName} size="md" />
            {profile.is_verified && (
              <ShieldCheck className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-background text-emerald-600" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <span className="inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                {ROLE_LABELS[profile.role]}
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2 mt-2">
            <VerifiedBadge verified={profile.is_verified} className="text-[11px] py-0" />
          </div>
        )}
        {!collapsed && completeness.score < 100 && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Profile completeness</span>
              <span className="font-medium text-primary">{completeness.score}%</span>
            </div>
            <Progress value={completeness.score} className="h-1.5" />
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onClick={onNavigate} />
        ))}
      </nav>

      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex lg:hidden items-center justify-center gap-2 px-3 py-2 mx-3 mb-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors border"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          {!collapsed && 'Collapse'}
        </button>
      )}

      <div className={cn('px-3 py-4 border-t shrink-0', collapsed && 'px-2')}>
        <form action={signOut}>
          <button
            type="submit"
            title={collapsed ? 'Sign Out' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
        </form>
      </div>
    </div>
  )
}

interface DashboardSidebarProps {
  profile: Profile
  completeness: ProfileCompletenessResult
}

export function DashboardSidebar({ profile, completeness }: DashboardSidebarProps) {
  const [open, setOpen] = useState(false)
  const [tabletExpanded, setTabletExpanded] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Desktop (lg+) is always fully expanded; only the md..lg "tablet rail" responds
  // to the collapse toggle. Tracked via matchMedia since Tailwind breakpoints alone
  // can't be combined with JS toggle state in a single className.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const collapsed = !isDesktop && !tabletExpanded

  return (
    <>
      {/* Desktop / tablet sidebar: icon-only rail at md (tablet), full width at lg (desktop) */}
      <aside
        className={cn(
          'hidden md:flex md:flex-col h-screen border-r bg-card shrink-0 sticky top-0 overflow-y-auto transition-all duration-200',
          tabletExpanded ? 'md:w-60' : 'md:w-16 lg:w-60'
        )}
      >
        <SidebarBody
          profile={profile}
          completeness={completeness}
          collapsed={collapsed}
          onToggleCollapse={() => setTabletExpanded((v) => !v)}
        />
      </aside>

      {/* Mobile: fixed top bar + Sheet drawer */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 border-b bg-card flex items-center px-3 gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-1">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SidebarBody profile={profile} completeness={completeness} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/" className="font-extrabold text-sm tracking-tight text-primary">
          LANDLORDZS
        </Link>
      </div>
    </>
  )
}
