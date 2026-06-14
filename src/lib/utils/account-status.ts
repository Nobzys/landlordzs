import { redirect } from 'next/navigation'
import type { Profile } from '@/types/auth'
import { APPROVAL_REQUIRED_ROLES } from '@/lib/utils/constants'

export function requireActiveProfile(profile: Profile): void {
  if (!(APPROVAL_REQUIRED_ROLES as readonly string[]).includes(profile.role)) return

  if (profile.account_status === 'pending_verification') redirect('/account/pending')
  if (profile.account_status === 'suspended') redirect('/account/suspended')
  if (profile.account_status === 'banned') redirect('/account/banned')
}
