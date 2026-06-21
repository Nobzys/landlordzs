import type { DbPropertyStatus } from '@/types/database'

export type PropertyStatus = DbPropertyStatus

export const PROPERTY_STATUSES: readonly PropertyStatus[] = [
  'draft',
  'pending_review',
  'active',
  'under_offer',
  'sold',
  'rented',
  'off_market',
  'expired',
  'rejected',
  'suspended',
  'archived',
] as const

// Single source of truth for property lifecycle transitions. Mirrored in
// SQL by is_valid_property_status_transition() so the database enforces the
// exact same rules even if a caller bypasses this module.
//
// 'suspended' is an admin enforcement action (distinct from the seller's
// 'off_market'); only an active listing can be suspended, and it can only
// be restored to 'active'. canTransition() alone does not gate *who* may
// perform it — callers (e.g. suspendProperty/restoreSuspendedProperty)
// additionally require the caller to be an admin.
export const PROPERTY_TRANSITIONS: Readonly<Record<PropertyStatus, readonly PropertyStatus[]>> = {
  draft:          ['pending_review', 'archived'],
  pending_review: ['active', 'rejected'],
  active:         ['under_offer', 'sold', 'rented', 'off_market', 'expired', 'suspended'],
  under_offer:    ['active', 'sold'],
  sold:           ['archived'],
  rented:         ['archived'],
  off_market:     ['active', 'archived'],
  expired:        ['active', 'archived'],
  rejected:       ['draft', 'archived'],
  suspended:      ['active'],
  archived:       [],
}

export function getAllowedTransitions(status: PropertyStatus): readonly PropertyStatus[] {
  return PROPERTY_TRANSITIONS[status] ?? []
}

export function canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  if (from === to) return false
  return getAllowedTransitions(from).includes(to)
}
