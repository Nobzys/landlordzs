import { redirect } from 'next/navigation'
import type { Profile } from '@/types/auth'
import { requiresActivationFee } from '@/lib/roles'

export function requireActiveProfile(profile: Profile): void {
  if (!requiresActivationFee(profile.role)) return

  if (profile.account_status === 'pending_verification') redirect('/account/pending')
  if (profile.account_status === 'suspended') redirect('/account/suspended')
  if (profile.account_status === 'banned') redirect('/account/banned')
}
