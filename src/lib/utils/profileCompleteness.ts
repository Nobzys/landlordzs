import type { RoleCapabilities } from '@/lib/config/roleCapabilities'

export interface CompletenessItem {
  id: string
  label: string
  done: boolean
}

export interface ProfileCompletenessResult {
  score: number
  items: CompletenessItem[]
}

interface ProfileCompletenessInput {
  avatarUrl: string | null
  bio: string | null
  city: string | null
  isVerified: boolean
  capabilities: RoleCapabilities
  hasPortfolioItems: boolean
}

export function getProfileCompleteness(input: ProfileCompletenessInput): ProfileCompletenessResult {
  const items: CompletenessItem[] = [
    { id: 'avatar', label: 'Add a profile photo', done: Boolean(input.avatarUrl) },
    { id: 'bio', label: 'Write a short bio', done: Boolean(input.bio && input.bio.trim().length >= 20) },
    { id: 'city', label: 'Set your city', done: Boolean(input.city) },
  ]

  if (input.capabilities.canBeVerified) {
    items.push({ id: 'verified', label: 'Get verified', done: input.isVerified })
  }

  if (input.capabilities.hasPortfolio) {
    items.push({ id: 'portfolio', label: 'Add a portfolio project', done: input.hasPortfolioItems })
  }

  const doneCount = items.filter((i) => i.done).length
  const score = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 100

  return { score, items }
}
