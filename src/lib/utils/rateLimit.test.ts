import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from './rateLimit'

function makeAdminMock(count: number, insertError: { message: string } | null = null) {
  const chain: any = {}
  chain.select  = vi.fn(() => chain)
  chain.eq      = vi.fn(() => chain)
  chain.gte     = vi.fn(() => Promise.resolve({ count }))
  chain.insert  = vi.fn(() => Promise.resolve({ error: insertError }))
  chain.from    = vi.fn((table: string) => {
    if (table === 'password_reset_attempts') return chain
    throw new Error(`Unexpected table: ${table}`)
  })
  return chain
}

describe('checkRateLimit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns limited: false and records the attempt when under the limit', async () => {
    const mock = makeAdminMock(2)
    vi.mocked(createAdminClient).mockReturnValue(mock as any)

    const result = await checkRateLimit({ action: 'signup', identifier: '1.2.3.4', limit: 5, windowMs: 3600000 })

    expect(result.limited).toBe(false)
    expect(result.error).toBeUndefined()
    expect(mock.insert).toHaveBeenCalledWith({
      email: 'rl:signup:1.2.3.4',
      ip:    'rl:signup',
    })
  })

  it('returns limited: true when count equals the limit', async () => {
    const mock = makeAdminMock(5)
    vi.mocked(createAdminClient).mockReturnValue(mock as any)

    const result = await checkRateLimit({ action: 'signup', identifier: '1.2.3.4', limit: 5, windowMs: 3600000 })

    expect(result.limited).toBe(true)
    expect(result.error).toMatch(/too many attempts/i)
    expect(mock.insert).not.toHaveBeenCalled()
  })

  it('returns limited: true when count equals the limit', async () => {
    const mock = makeAdminMock(100)
    vi.mocked(createAdminClient).mockReturnValue(mock as any)

    const result = await checkRateLimit({ action: 'message', identifier: 'user-uuid', limit: 100, windowMs: 3600000 })

    expect(result.limited).toBe(true)
    expect(mock.insert).not.toHaveBeenCalled()
  })

  it('namespaces keys so different actions do not collide', async () => {
    const mock = makeAdminMock(0)
    vi.mocked(createAdminClient).mockReturnValue(mock as any)

    await checkRateLimit({ action: 'review', identifier: 'user-1', limit: 5, windowMs: 86400000 })

    expect(mock.insert).toHaveBeenCalledWith({
      email: 'rl:review:user-1',
      ip:    'rl:review',
    })
  })

  it('uses count: 0 gracefully when Supabase returns null count', async () => {
    const mock = makeAdminMock(0)
    // Override gte to return null count
    mock.gte = vi.fn(() => Promise.resolve({ count: null }))
    vi.mocked(createAdminClient).mockReturnValue(mock as any)

    const result = await checkRateLimit({ action: 'recover', identifier: '5.6.7.8', limit: 3, windowMs: 86400000 })

    expect(result.limited).toBe(false)
    expect(mock.insert).toHaveBeenCalled()
  })
})
