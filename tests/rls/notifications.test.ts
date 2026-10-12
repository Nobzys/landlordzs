import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hasTestDb, adminClient, createTestUser, deleteTestUser, userClient } from './helpers'

describe.skipIf(!hasTestDb)('RLS — notifications table', () => {
  let userId1: string, token1: string
  let userId2: string, token2: string
  let notifId: string

  const cleanupIds: string[] = []

  beforeAll(async () => {
    const u1 = await createTestUser('buyer')
    const u2 = await createTestUser('buyer')
    userId1 = u1.id; token1 = u1.accessToken
    userId2 = u2.id; token2 = u2.accessToken
    cleanupIds.push(userId1, userId2)

    const { data } = await (adminClient() as any)
      .from('notifications')
      .insert({
        user_id: userId1,
        type:    'system',
        title:   'Test notification',
        body:    'RLS test notification for user 1',
      })
      .select('id')
      .single()
    notifId = data?.id
  })

  afterAll(async () => {
    if (notifId) await (adminClient() as any).from('notifications').delete().eq('id', notifId)
    for (const id of cleanupIds) await deleteTestUser(id)
  })

  it('user can SELECT their own notifications', async () => {
    const { data, error } = await (userClient(token1) as any)
      .from('notifications')
      .select('id')
      .eq('id', notifId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('other user cannot SELECT someone else\'s notifications', async () => {
    const { data, error } = await (userClient(token2) as any)
      .from('notifications')
      .select('id')
      .eq('id', notifId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('user can mark their own notification as read', async () => {
    const { error } = await (userClient(token1) as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId)
    expect(error).toBeNull()
  })

  it('user cannot delete another user\'s notification', async () => {
    const { error } = await (userClient(token2) as any)
      .from('notifications')
      .delete()
      .eq('id', notifId)
    // Either error or 0 rows deleted
    if (!error) {
      const { data } = await (adminClient() as any).from('notifications').select('id').eq('id', notifId)
      expect(data?.length).toBeGreaterThanOrEqual(1) // Still exists
    } else {
      expect(error).toBeDefined()
    }
  })
})
