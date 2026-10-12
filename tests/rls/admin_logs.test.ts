import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hasTestDb, adminClient, createTestUser, deleteTestUser, userClient } from './helpers'

describe.skipIf(!hasTestDb)('RLS — admin_logs table', () => {
  let adminId: string, adminToken: string
  let buyerId: string, buyerToken: string
  let logId: string

  const cleanupIds: string[] = []

  beforeAll(async () => {
    const admin = await createTestUser('admin')
    const buyer = await createTestUser('buyer')
    adminId    = admin.id; adminToken = admin.accessToken
    buyerId    = buyer.id; buyerToken = buyer.accessToken
    cleanupIds.push(adminId, buyerId)

    const { data } = await (adminClient() as any)
      .from('admin_logs')
      .insert({
        actor_id: adminId,
        action:   'test.rls_check',
        metadata: { test: true },
      })
      .select('id')
      .single()
    logId = data?.id
  })

  afterAll(async () => {
    if (logId) await (adminClient() as any).from('admin_logs').delete().eq('id', logId)
    for (const id of cleanupIds) await deleteTestUser(id)
  })

  it('admin user can SELECT admin_logs', async () => {
    const { data, error } = await (userClient(adminToken) as any)
      .from('admin_logs')
      .select('id')
      .eq('id', logId)
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(1)
  })

  it('non-admin user cannot SELECT admin_logs', async () => {
    const { data, error } = await (userClient(buyerToken) as any)
      .from('admin_logs')
      .select('id')
      .eq('id', logId)
    // RLS should return 0 rows for non-admins
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('non-admin cannot INSERT admin_logs', async () => {
    const { error } = await (userClient(buyerToken) as any)
      .from('admin_logs')
      .insert({ actor_id: buyerId, action: 'unauthorized.attempt' })
    expect(error).not.toBeNull()
  })
})
