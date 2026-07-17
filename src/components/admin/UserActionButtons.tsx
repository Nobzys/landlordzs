'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminSuspendAccount, adminActivateAccount, adminAssignRole } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/types/auth'
import type { UserRole } from '@/types/auth'

const ALL_ROLES: UserRole[] = [
  'buyer', 'seller', 'agent', 'vendor',
  'contractor', 'engineer', 'architect', 'lawyer', 'admin', 'moderator',
]

const MODERATOR_ASSIGNABLE_ROLES: UserRole[] = [
  'buyer', 'seller', 'agent', 'vendor',
  'contractor', 'engineer', 'architect', 'lawyer', 'moderator',
]

interface Props {
  userId: string
  currentStatus: string
  currentRole: string
  callerRole: string
  isSelf: boolean
}

export default function UserActionButtons({
  userId,
  currentStatus,
  currentRole,
  callerRole,
  isSelf,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (isSelf) {
    return (
      <p className="text-sm text-muted-foreground italic">
        You cannot take actions on your own account.
      </p>
    )
  }

  if (callerRole === 'moderator' && currentRole === 'admin') {
    return (
      <p className="text-sm text-muted-foreground italic">
        Moderators cannot take actions on administrator accounts.
      </p>
    )
  }

  const assignableRoles: UserRole[] =
    callerRole === 'moderator' ? MODERATOR_ASSIGNABLE_ROLES : ALL_ROLES

  const isBlocked = ['suspended', 'banned', 'deactivated'].includes(currentStatus)

  async function handleAssignRole(formData: FormData) {
    const role = formData.get('role') as UserRole
    if (!role || role === currentRole) return
    setError(null)
    startTransition(async () => {
      const result = await adminAssignRole(userId, role)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  async function handleSuspend(formData: FormData) {
    const reason = (formData.get('reason') as string)?.trim() || 'Suspended by admin.'
    if (!window.confirm(
      `Suspend this account?\n\nReason: "${reason}"\n\nThe user will immediately lose access.`
    )) return
    setError(null)
    startTransition(async () => {
      const result = await adminSuspendAccount(userId, reason)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  function handleActivate() {
    if (!window.confirm('Activate this account? The user will immediately regain access.')) return
    setError(null)
    startTransition(async () => {
      const result = await adminActivateAccount(userId)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700
          dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Change Role */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Change Role
        </p>
        <form action={handleAssignRole} className="flex gap-2">
          <select
            name="role"
            defaultValue={currentRole}
            className="flex-1 rounded-md border px-3 py-2 text-sm bg-background
              focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm" disabled={isPending}>
            {isPending ? 'Saving…' : 'Assign'}
          </Button>
        </form>
      </div>

      {/* Suspend / Activate */}
      <div className="space-y-2 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Account Status
        </p>
        {isBlocked ? (
          <Button
            onClick={handleActivate}
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isPending}
          >
            {isPending ? 'Activating…' : 'Activate Account'}
          </Button>
        ) : (
          <form action={handleSuspend} className="space-y-2">
            <textarea
              name="reason"
              placeholder="Suspension reason (recorded in audit log)…"
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                resize-none"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full text-red-600 border-red-200 hover:bg-red-50
                dark:hover:bg-red-900/20"
              disabled={isPending}
            >
              {isPending ? 'Suspending…' : 'Suspend Account'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
