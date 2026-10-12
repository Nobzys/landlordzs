import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hasTestDb, adminClient, createTestUser, deleteTestUser, userClient } from './helpers'

describe.skipIf(!hasTestDb)('RLS — wallets table', () => {
  let userId1: string, token1: string
  let userId2: string, token2: string

  const cleanupIds: string[] = []

  beforeAll(async () => {
    const u1 = await createTestUser('buyer')
    const u2 = await createTestUser('buyer')
    userId1 = u1.id; token1 = u1.accessToken
    userId2 = u2.id; token2 = u2.accessToken
    cleanupIds.push(userId1, userId2)

    // Ensure wallets exist (created by trigger, but force-create if not)
    for (const uid of [userId1, userId2]) {
      await (adminClient() as any)
        .from('wallets')
        .upsert({ user_id: uid, balance: 0, locked: 0, currency: 'XAF' }, { onConflict: 'user_id' })
    }
  })

  afterAll(async () => {
    for (const id of cleanupIds) await deleteTestUser(id)
  })

  it('user can SELECT their own wallet', async () => {
    const { data, error } = await (userClient(token1) as any)
      .from('wallets')
      .select('user_id, balance')
      .eq('user_id', userId1)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].user_id).toBe(userId1)
  })

  it('user cannot SELECT another user\'s wallet', async () => {
    const { data, error } = await (userClient(token1) as any)
      .from('wallets')
      .select('user_id, balance')
      .eq('user_id', userId2)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('user cannot UPDATE another user\'s wallet balance', async () => {
    const { error } = await (userClient(token1) as any)
      .from('wallets')
      .update({ balance: 999999 })
      .eq('user_id', userId2)
    // Either an error or 0 rows affected (balance unchanged)
    if (!error) {
      const { data } = await adminClient().from('wallets').select('balance').eq('user_id', userId2).single()
      expect((data as any)?.balance).not.toBe(999999)
    } else {
      expect(error).toBeDefined()
    }
  })
})
