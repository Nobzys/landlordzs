'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { topUpWallet, requestPayout } from '@/lib/actions/payments'
import { releaseEscrow, disputeEscrow, completeMilestone, approveMilestone, fundEscrow } from '@/lib/actions/escrow'
import type { RequestPayoutInput } from '@/types/payment'
import type { DisputeEscrowInput, CompleteMilestoneInput } from '@/lib/validations/payment'

export function useFundEscrow() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (escrowId: string) => fundEscrow(escrowId),
    onSuccess: (result, escrowId) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.escrow.detail(escrowId) })
      qc.invalidateQueries({ queryKey: queryKeys.escrow.list() })
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance() })
      toast.success('Escrow funded. Funds are now secured.')
    },
    onError: () => toast.error('Failed to fund escrow'),
  })
}

export function useTopUpWallet() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ amount, provider, phone }: { amount: number; provider: 'mtn_momo' | 'orange_money'; phone: string }) =>
      topUpWallet(amount, provider, phone),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance() })
      qc.invalidateQueries({ queryKey: queryKeys.transactions.list() })
    },
    onError: () => toast.error('Top-up initiation failed'),
  })
}

export function useRequestPayout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: RequestPayoutInput) => requestPayout(data),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance() })
      qc.invalidateQueries({ queryKey: queryKeys.payouts.list() })
      toast.success('Payout request submitted. Processing within 1-2 business days.')
    },
    onError: () => toast.error('Payout request failed'),
  })
}

export function useReleaseEscrow() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (escrowId: string) => releaseEscrow(escrowId),
    onSuccess: (result, escrowId) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.escrow.detail(escrowId) })
      qc.invalidateQueries({ queryKey: queryKeys.escrow.list() })
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance() })
      toast.success('Escrow released. Funds transferred to payee.')
    },
    onError: () => toast.error('Failed to release escrow'),
  })
}

export function useDisputeEscrow() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ escrowId, data }: { escrowId: string; data: DisputeEscrowInput }) =>
      disputeEscrow(escrowId, data),
    onSuccess: (result, { escrowId }) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.escrow.detail(escrowId) })
      toast.success('Dispute filed. Our team will review within 48 hours.')
    },
    onError: () => toast.error('Failed to file dispute'),
  })
}

export function useCompleteMilestone() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CompleteMilestoneInput) => completeMilestone(data),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.escrow.all })
      toast.success('Milestone marked as complete. Awaiting payer approval.')
    },
    onError: () => toast.error('Failed to update milestone'),
  })
}

export function useApproveMilestone() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (milestoneId: string) => approveMilestone(milestoneId),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.escrow.all })
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance() })
      toast.success('Milestone approved. Payment released to contractor.')
    },
    onError: () => toast.error('Failed to approve milestone'),
  })
}
