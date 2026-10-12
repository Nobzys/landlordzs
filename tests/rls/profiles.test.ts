import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hasTestDb, adminClient, createTestUser, deleteTestUser } from './helpers'

describe.skipIf(!hasTestDb)('RLS — profiles table', () => {
  let buyerId:  string, buyerToken:  string
  let sellerId: string, sellerToken: string
  let adminId:  string, adminToken:  string

  const cleanupIds: string[] = []

  beforeAll(async () => {
    const buyer  = await createTestUser('buyer')
    const seller = await createTestUser('seller')
    const admin  = await createTestUser('admin')
    buyerId   = buyer.id;  buyerToken  = buyer.accessToken
    sellerId  = seller.id; sellerToken = seller.accessToken
    adminId   = admin.id;  adminToken  = admin.accessToken
    cleanupIds.push(buyerId, sellerId, adminId)
  })

  afterAll(async () => {
    for (const id of cleanupIds) await deleteTestUser(id)
  })

  it('user can SELECT their own profile row', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const { TEST_URL, TEST_ANON_KEY } = await import('./helpers')
    const client = createClient(TEST_URL!, TEST_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${buyerToken}` } },
    })
    const { data } = await (client as any).from('profiles').select('id').eq('id', buyerId)
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(buyerId)
  })

  it('user cannot UPDATE another user\'s profile row', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const { TEST_URL, TEST_ANON_KEY } = await import('./helpers')
    const client = createClient(TEST_URL!, TEST_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${buyerToken}` } },
    })
    const { error } = await (client as any)
      .from('profiles')
      .update({ display_name: 'hacked' })
      .eq('id', sellerId)
    // RLS prevents this: either an error is thrown or 0 rows affected (no error, no rows)
    if (!error) {
      const { data } = await adminClient().from('profiles').select('display_name').eq('id', sellerId).single()
      expect((data as any).display_name).not.toBe('hacked')
    } else {
      expect(error).toBeDefined()
    }
  })

  it('admin can SELECT any profile', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const { TEST_URL, TEST_ANON_KEY } = await import('./helpers')
    const client = createClient(TEST_URL!, TEST_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${adminToken}` } },
    })
    const { data, error } = await (client as any)
      .from('profiles')
      .select('id')
      .in('id', [buyerId, sellerId])
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(2)
  })
})
