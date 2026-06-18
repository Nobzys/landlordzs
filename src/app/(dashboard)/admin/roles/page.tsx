import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { adminAssignRole } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

export const metadata: Metadata = { title: 'Roles — Admin' }

const ALL_ROLES: UserRole[] = [
  'buyer', 'seller', 'agent', 'vendor',
  'contractor', 'engineer', 'architect', 'lawyer', 'admin',
]

export default async function AdminRolesPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roleRows } = await (supabase as any)
    .from('profiles')
    .select('role') as { data: { role: UserRole }[] | null }

  const roleCounts = (roleRows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.role] = (acc[row.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Roles</h1>
            <p className="text-sm text-muted-foreground">Role definitions and per-role user counts</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border divide-y">
        {ALL_ROLES.map((role) => (
          <div key={role} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold">{roleCounts[role] ?? 0}</p>
              <p className="text-xs text-muted-foreground">users</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Reassign a user's role</h2>
        <p className="text-xs text-muted-foreground">
          For bulk lookups and per-user actions (suspend/activate), use{' '}
          <Link href="/admin/users" className="underline">User Management</Link>.
          This is a quick role change by user ID.
        </p>
        <form
          action={async (fd: FormData) => {
            'use server'
            const userId = fd.get('userId') as string
            const role = fd.get('role') as string
            if (!userId || !role) return
            await adminAssignRole(userId, role as UserRole)
          }}
          className="flex items-center gap-2 flex-wrap"
        >
          <input
            name="userId"
            placeholder="User ID"
            required
            className="rounded-md border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring flex-1 min-w-[200px]"
          />
          <select
            name="role"
            required
            className="rounded-md border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">Assign</Button>
        </form>
      </div>
    </div>
  )
}
