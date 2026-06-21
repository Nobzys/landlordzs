import { describe, it, expect } from 'vitest'
import { canTransition, getAllowedTransitions, PROPERTY_STATUSES, PROPERTY_TRANSITIONS } from './property-status'

describe('canTransition — valid transitions', () => {
  const validCases: [string, string][] = [
    ['draft', 'pending_review'],
    ['draft', 'archived'],
    ['pending_review', 'active'],
    ['pending_review', 'rejected'],
    ['active', 'under_offer'],
    ['active', 'sold'],
    ['active', 'rented'],
    ['active', 'off_market'],
    ['active', 'expired'],
    ['under_offer', 'active'],
    ['under_offer', 'sold'],
    ['sold', 'archived'],
    ['rented', 'archived'],
    ['off_market', 'active'],
    ['off_market', 'archived'],
    ['expired', 'active'],
    ['expired', 'archived'],
    ['rejected', 'draft'],
    ['rejected', 'archived'],
    ['active', 'suspended'],
    ['suspended', 'active'],
  ]

  for (const [from, to] of validCases) {
    it(`allows ${from} -> ${to}`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(canTransition(from as any, to as any)).toBe(true)
    })
  }
})

describe('canTransition — invalid transitions', () => {
  const invalidCases: [string, string][] = [
    ['draft', 'active'],          // must go through pending_review
    ['draft', 'sold'],
    ['pending_review', 'sold'],
    ['pending_review', 'archived'], // not in the allowed list
    ['active', 'draft'],
    ['active', 'archived'],         // must move off active first
    ['under_offer', 'rented'],
    ['under_offer', 'archived'],
    ['sold', 'active'],
    ['sold', 'rented'],
    ['rented', 'sold'],
    ['rented', 'active'],
    ['off_market', 'sold'],
    ['expired', 'sold'],
    ['rejected', 'active'],         // must restore to draft first
    ['rejected', 'pending_review'],
    ['archived', 'draft'],          // terminal state
    ['archived', 'active'],
    ['draft', 'suspended'],         // only an active listing can be suspended
    ['pending_review', 'suspended'],
    ['suspended', 'off_market'],    // suspended can only be restored to active
    ['suspended', 'draft'],
  ]

  for (const [from, to] of invalidCases) {
    it(`rejects ${from} -> ${to}`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(canTransition(from as any, to as any)).toBe(false)
    })
  }

  it('rejects a no-op transition to the same status', () => {
    expect(canTransition('active', 'active')).toBe(false)
  })
})

describe('getAllowedTransitions', () => {
  it('returns the exact allowed set for each status', () => {
    for (const status of PROPERTY_STATUSES) {
      expect(getAllowedTransitions(status)).toEqual(PROPERTY_TRANSITIONS[status])
    }
  })

  it('returns an empty array for the terminal "archived" status', () => {
    expect(getAllowedTransitions('archived')).toEqual([])
  })
})
