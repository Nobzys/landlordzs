import { createAdminClient } from '@/lib/supabase/admin'

export type KycStatusCounts = {
  pending: number
  approved: number
  rejected: number
  needs_more_info: number
}

// Single source of truth for "how many KYC verification requests are in each
// status" — used by both the admin dashboard's pending-verifications badge
// and the /admin/verifications list page's tab counts, so the two can never
// drift apart the way the dashboard's property-verification tile and the
// user-identity verification page did (different tables entirely).
export async function getKycStatusCounts(): Promise<KycStatusCounts> {
  const adminClient = createAdminClient()
  const statuses = ['pending', 'approved', 'rejected', 'needs_more_info'] as const

  const results = await Promise.all(
    statuses.map((status) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adminClient as any)
        .from('kyc_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
    )
  )

  return {
    pending:         results[0].count ?? 0,
    approved:        results[1].count ?? 0,
    rejected:        results[2].count ?? 0,
    needs_more_info: results[3].count ?? 0,
  }
}
