'use client'

import { notFound } from 'next/navigation'
import { Shield, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { EscrowTimeline } from '@/components/payments/EscrowTimeline'
import { MilestoneList } from '@/components/payments/MilestoneList'
import { useEscrow } from '@/hooks/payments/useEscrow'
import { useWallet } from '@/hooks/payments/useWallet'
import { useReleaseEscrow, useDisputeEscrow, useFundEscrow } from '@/hooks/payments/usePaymentMutations'
import { useAuthStore } from '@/stores/authStore'
import { formatXAF, formatDate, getInitial } from '@/lib/utils/format'
import { useState, use } from 'react'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  pending:   'Awaiting Payment',
  funded:    'Funds Secured',
  released:  'Completed',
  disputed:  'Under Dispute',
  refunded:  'Refunded',
  cancelled: 'Cancelled',
}

export default function EscrowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: escrow, isLoading } = useEscrow(id)
  const { data: wallet }  = useWallet()
  const user    = useAuthStore(s => s.user)
  const release = useReleaseEscrow()
  const dispute = useDisputeEscrow()
  const fund    = useFundEscrow()
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [fundOpen, setFundOpen] = useState(false)

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-48" />
      <div className="h-48 bg-muted rounded-xl" />
    </div>
  }

  if (!escrow) notFound()

  const isPayer  = user?.id === escrow.payer_id
  const isPayee  = user?.id === escrow.payee_id
  const canRelease = isPayer && escrow.status === 'funded'
  const canDispute = (isPayer || isPayee) && escrow.status === 'funded'
  const needsFunding = isPayer && escrow.status === 'pending'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold capitalize">
            {escrow.reference_type.replace('_', ' ')} Escrow
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{isPayer ? 'You are the payer' : 'You are the payee'}</p>
        </div>
        <Badge variant={escrow.status === 'funded' ? 'default' : 'secondary'}>
          {STATUS_LABEL[escrow.status] ?? escrow.status}
        </Badge>
      </div>

      {/* Amount card */}
      <div className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-white p-6">
        <p className="text-blue-200 text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Secured amount
        </p>
        <p className="text-4xl font-bold mt-1">{formatXAF(escrow.amount)}</p>
        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <p className="text-blue-300">Platform fee ({escrow.platform_fee_pct}%)</p>
            <p className="font-medium">{formatXAF(escrow.platform_fee)}</p>
          </div>
          <div>
            <p className="text-blue-300">Payee receives</p>
            <p className="font-medium">{formatXAF(escrow.amount - escrow.platform_fee)}</p>
          </div>
          {escrow.release_date && (
            <div>
              <p className="text-blue-300">Auto-release</p>
              <p className="font-medium">{formatDate(escrow.release_date)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4">
        <PartyCard label="Payer" person={escrow.payer} highlight={isPayer} />
        <PartyCard label="Payee" person={escrow.payee} highlight={isPayee} />
      </div>

      {/* Milestones */}
      {escrow.milestones && escrow.milestones.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Milestones</h2>
          <MilestoneList
            milestones={escrow.milestones}
            payerId={escrow.payer_id}
            payeeId={escrow.payee_id}
            currentUserId={user?.id ?? ''}
          />
        </div>
      )}

      {/* Timeline */}
      {escrow.events && escrow.events.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <h2 className="font-semibold">History</h2>
          <EscrowTimeline events={escrow.events} />
        </div>
      )}

      {/* Actions */}
      {(canRelease || canDispute || needsFunding) && (
        <div className="flex flex-wrap gap-3 pt-2">
          {needsFunding && (
            <Button onClick={() => setFundOpen(true)} className="gap-2">
              <Shield className="h-4 w-4" />
              Fund Escrow
            </Button>
          )}
          {canRelease && (
            <Button
              onClick={() => release.mutate(escrow.id)}
              disabled={release.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Release Funds
            </Button>
          )}
          {canDispute && (
            <Button
              variant="destructive"
              onClick={() => setDisputeOpen(true)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              File Dispute
            </Button>
          )}
        </div>
      )}

      {/* Fund escrow dialog */}
      <Dialog open={fundOpen} onOpenChange={setFundOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fund Escrow</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required</span>
                <span className="font-semibold">{formatXAF(escrow.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />Wallet balance
                </span>
                <span className={`font-semibold ${(wallet?.balance ?? 0) >= escrow.amount ? 'text-green-600' : 'text-red-600'}`}>
                  {formatXAF(wallet?.balance ?? 0)}
                </span>
              </div>
            </div>

            {(wallet?.balance ?? 0) >= escrow.amount ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {formatXAF(escrow.amount)} will be debited from your wallet and held securely until you release or a dispute is resolved.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFundOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => { fund.mutate(escrow.id); setFundOpen(false) }}
                    disabled={fund.isPending}
                    className="gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Confirm &amp; Fund
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <p className="text-sm text-destructive">
                  Insufficient balance. You need {formatXAF(escrow.amount - (wallet?.balance ?? 0))} more.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFundOpen(false)}>Close</Button>
                  <Button asChild>
                    <Link href="/account/wallet">Top Up Wallet</Link>
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>File a Dispute</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Our team will review your dispute within 48 hours. Please provide detailed information.
            </p>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                placeholder="Describe the issue in detail…"
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                dispute.mutate({ escrowId: escrow.id, data: { reason: disputeReason } })
                setDisputeOpen(false)
              }}
              disabled={disputeReason.length < 20 || dispute.isPending}
            >
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PartyCard({
  label, person, highlight
}: {
  label: string
  person: { id: string; full_name: string | null; display_name: string | null; avatar_url: string | null }
  highlight: boolean
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-blue-300 bg-blue-50/50' : ''}`}>
      <p className="text-xs text-muted-foreground mb-2">{label} {highlight && '(You)'}</p>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
          {getInitial(person.display_name, person.full_name)}
        </div>
        <p className="text-sm font-medium truncate">
          {person.display_name?.trim() || person.full_name?.trim() || 'Unknown'}
        </p>
      </div>
    </div>
  )
}
