import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hasTestDb, adminClient, createTestUser, deleteTestUser, userClient } from './helpers'

describe.skipIf(!hasTestDb)('RLS — escrow_accounts table', () => {
  let payerId: string, payerToken: string
  let payeeId: string, payeeToken: string
  let thirdId: string, thirdToken: string
  let escrowId: string

  const cleanupIds: string[] = []

  beforeAll(async () => {
    const payer = await createTestUser('buyer')
    const payee = await createTestUser('seller')
    const third = await createTestUser('buyer')
    payerId    = payer.id; payerToken = payer.accessToken
    payeeId    = payee.id; payeeToken = payee.accessToken
    thirdId    = third.id; thirdToken = third.accessToken
    cleanupIds.push(payerId, payeeId, thirdId)

    const { data } = await (adminClient() as any)
      .from('escrow_accounts')
      .insert({
        payer_id:         payerId,
        payee_id:         payeeId,
        reference_type:   'service_request',
        reference_id:     crypto.randomUUID(),
        amount:           50000,
        currency:         'XAF',
        platform_fee:     1250,
        platform_fee_pct: 2.5,
        status:           'pending',
      })
      .select('id')
      .single()
    escrowId = data?.id
  })

  afterAll(async () => {
    if (escrowId) await (adminClient() as any).from('escrow_accounts').delete().eq('id', escrowId)
    for (const id of cleanupIds) await deleteTestUser(id)
  })

  it('payer can SELECT their own escrow', async () => {
    const { data, error } = await (userClient(payerToken) as any)
      .from('escrow_accounts')
      .select('id')
      .eq('id', escrowId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('payee can SELECT their own escrow', async () => {
    const { data, error } = await (userClient(payeeToken) as any)
      .from('escrow_accounts')
      .select('id')
      .eq('id', escrowId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('third-party user cannot SELECT an escrow they are not party to', async () => {
    const { data, error } = await (userClient(thirdToken) as any)
      .from('escrow_accounts')
      .select('id')
      .eq('id', escrowId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})
