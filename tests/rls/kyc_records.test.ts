import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hasTestDb, adminClient, createTestUser, deleteTestUser, userClient } from './helpers'

describe.skipIf(!hasTestDb)('RLS — kyc_records table', () => {
  let userId1: string, token1: string
  let userId2: string, token2: string
  let adminId: string, adminToken: string
  let kycId: string

  const cleanupIds: string[] = []

  beforeAll(async () => {
    const u1    = await createTestUser('seller')
    const u2    = await createTestUser('seller')
    const admin = await createTestUser('admin')
    userId1    = u1.id;    token1    = u1.accessToken
    userId2    = u2.id;    token2    = u2.accessToken
    adminId    = admin.id; adminToken = admin.accessToken
    cleanupIds.push(userId1, userId2, adminId)

    // Insert a KYC record for user1 via admin
    const { data } = await (adminClient() as any)
      .from('kyc_records')
      .insert({ user_id: userId1, status: 'pending', submitted_at: new Date().toISOString() })
      .select('id')
      .single()
    kycId = data?.id
  })

  afterAll(async () => {
    if (kycId) await (adminClient() as any).from('kyc_records').delete().eq('id', kycId)
    for (const id of cleanupIds) await deleteTestUser(id)
  })

  it('owner can SELECT their own KYC record', async () => {
    const { data, error } = await (userClient(token1) as any)
      .from('kyc_records')
      .select('id')
      .eq('id', kycId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('other user cannot SELECT someone else\'s KYC record', async () => {
    const { data, error } = await (userClient(token2) as any)
      .from('kyc_records')
      .select('id')
      .eq('id', kycId)
    // RLS should return 0 rows (not an error — just empty)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('admin can SELECT all KYC records', async () => {
    const { data, error } = await (userClient(adminToken) as any)
      .from('kyc_records')
      .select('id')
      .eq('id', kycId)
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(1)
  })
})
