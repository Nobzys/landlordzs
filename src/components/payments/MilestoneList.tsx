'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ChevronDown, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatXAF, formatDate } from '@/lib/utils/format'
import { useCompleteMilestone, useApproveMilestone } from '@/hooks/payments/usePaymentMutations'
import { cn } from '@/lib/utils/cn'
import type { EscrowMilestoneRow } from '@/types/payment'

interface MilestoneListProps {
  milestones: EscrowMilestoneRow[]
  payerId: string
  payeeId: string
  currentUserId: string
}

const STATUS_CONFIG = {
  pending:     { icon: Clock,          color: 'text-muted-foreground', label: 'Pending' },
  in_progress: { icon: Clock,          color: 'text-blue-600',         label: 'In Progress' },
  completed:   { icon: CheckCircle2,   color: 'text-amber-600',        label: 'Awaiting Approval' },
  approved:    { icon: CheckCircle2,   color: 'text-emerald-600',      label: 'Approved' },
  disputed:    { icon: AlertTriangle,  color: 'text-destructive',      label: 'Disputed' },
}

export function MilestoneList({ milestones, payerId, payeeId, currentUserId }: MilestoneListProps) {
  const [completeTarget, setCompleteTarget] = useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const completeMilestone = useCompleteMilestone()
  const approveMilestone  = useApproveMilestone()

  const isPayee = currentUserId === payeeId
  const isPayer = currentUserId === payerId

  const handleComplete = async () => {
    if (!completeTarget) return
    await completeMilestone.mutateAsync({ milestone_id: completeTarget, notes: completionNotes })
    setCompleteTarget(null)
    setCompletionNotes('')
  }

  return (
    <>
      <div className="space-y-3">
        {milestones.map((m, i) => {
          const config = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.pending
          const Icon   = config.icon

          return (
            <div key={m.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                    {m.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">Due: {formatDate(m.due_date)}</p>
                    )}
                    {m.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{m.notes}"</p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatXAF(m.amount)}</p>
                  {m.percentage && <p className="text-xs text-muted-foreground">{m.percentage}%</p>}
                  <div className={cn('flex items-center gap-1 justify-end mt-1 text-xs', config.color)}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                {isPayee && (m.status === 'pending' || m.status === 'in_progress') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCompleteTarget(m.id)}
                    className="text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Mark Complete
                  </Button>
                )}
                {isPayer && m.status === 'completed' && (
                  <Button
                    size="sm"
                    onClick={() => approveMilestone.mutate(m.id)}
                    disabled={approveMilestone.isPending}
                    className="text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Approve &amp; Release
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={!!completeTarget} onOpenChange={() => setCompleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Milestone Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Completion Notes (optional)</Label>
              <Textarea
                placeholder="Describe what was delivered…"
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={completeMilestone.isPending}>
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
