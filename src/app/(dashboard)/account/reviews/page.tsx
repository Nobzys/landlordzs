import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { ReviewList, type ReviewListItem } from '@/components/reviews/ReviewList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { REVIEWABLE_ROLES, type Review } from '@/types/review'
import { ROLE_LABELS } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'My Reviews' }

interface ServiceRequestRow {
  id: string
  title: string
  updated_at: string
}

interface QuotationRow {
  request_id: string
  provider_id: string
}

interface ProviderRow {
  id: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  role: string
}

export default async function AccountReviewsPage() {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: requests } = await sb
    .from('service_requests')
    .select('id, title, updated_at')
    .eq('client_id', profile.id)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })

  const requestList: ServiceRequestRow[] = requests ?? []
  const requestIds = requestList.map((r) => r.id)

  const { data: quotations } = requestIds.length
    ? await sb
        .from('service_quotations')
        .select('request_id, provider_id')
        .in('request_id', requestIds)
        .eq('status', 'accepted')
    : { data: [] }

  const quotationList: QuotationRow[] = quotations ?? []
  const providerByRequest = new Map(quotationList.map((q) => [q.request_id, q.provider_id]))
  const providerIds = [...new Set(quotationList.map((q) => q.provider_id))]

  const { data: providers } = providerIds.length
    ? await sb
        .from('profiles')
        .select('id, full_name, display_name, avatar_url, role')
        .in('id', providerIds)
    : { data: [] }

  const providerList: ProviderRow[] = providers ?? []
  const providerById = new Map(providerList.map((p) => [p.id, p]))

  const { data: reviews } = providerIds.length
    ? await sb
        .from('reviews')
        .select('*')
        .eq('reviewer_id', profile.id)
        .in('target_id', providerIds)
    : { data: [] }

  const reviewList: Review[] = reviews ?? []
  const reviewByTarget = new Map(reviewList.map((r) => [r.target_id, r]))

  const pending: { requestId: string; requestTitle: string; provider: ProviderRow }[] = []
  const reviewed: ReviewListItem[] = []

  for (const request of requestList) {
    const providerId = providerByRequest.get(request.id)
    if (!providerId) continue
    const provider = providerById.get(providerId)
    if (!provider || !(REVIEWABLE_ROLES as readonly string[]).includes(provider.role)) continue

    const existing = reviewByTarget.get(providerId)
    if (existing) {
      reviewed.push({
        review: existing,
        personName: provider.display_name || provider.full_name || 'Professional',
        personAvatarUrl: provider.avatar_url,
        personRole: provider.role,
      })
    } else {
      pending.push({ requestId: request.id, requestTitle: request.title, provider })
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Rate the professionals you&apos;ve worked with on completed service requests.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pending Reviews</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed requests are awaiting a review.</p>
        ) : (
          <div className="space-y-4">
            {pending.map(({ requestId, requestTitle, provider }) => (
              <Card key={requestId}>
                <CardHeader>
                  <CardTitle className="text-base">{requestTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {provider.display_name || provider.full_name || 'Professional'} ·{' '}
                    {ROLE_LABELS[provider.role as keyof typeof ROLE_LABELS]}
                  </p>
                </CardHeader>
                <CardContent>
                  <ReviewForm
                    serviceRequestId={requestId}
                    professionalName={provider.display_name || provider.full_name || 'this professional'}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Reviews You&apos;ve Written</h2>
        <ReviewList items={reviewed} emptyText="You haven't submitted any reviews yet." />
      </div>
    </div>
  )
}
