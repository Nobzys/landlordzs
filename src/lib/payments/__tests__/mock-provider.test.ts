import { describe, it, expect } from 'vitest'
import { MockPaymentProvider } from '../mock'

// ─── Mock provider unit tests ─────────────────────────────────────────────────
// These run entirely in-process with no external dependencies.
// They cover the behavioral contract that every real provider must also satisfy.

const BASE_REQ = {
  amount:      5000,
  currency:    'XAF',
  userId:      'user-123',
  description: 'Test plan',
}

describe('MockPaymentProvider', () => {
  const provider = new MockPaymentProvider()

  it('has name "mock"', () => {
    expect(provider.name).toBe('mock')
  })

  // ── charge ─────────────────────────────────────────────────────────────────

  describe('charge()', () => {
    it('returns success with a reference', async () => {
      const result = await provider.charge(BASE_REQ)
      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.reference).toMatch(/^mock_/)
    })

    it('two charges produce different references', async () => {
      const [a, b] = await Promise.all([
        provider.charge(BASE_REQ),
        provider.charge(BASE_REQ),
      ])
      expect(a.reference).not.toBe(b.reference)
    })
  })

  // ── createCheckoutSession ──────────────────────────────────────────────────

  describe('createCheckoutSession()', () => {
    it('returns a sessionId and a URL containing session_id', async () => {
      const result = await provider.createCheckoutSession({
        ...BASE_REQ,
        successUrl:  'http://localhost:3000/account/billing/stripe-return',
        cancelUrl:   'http://localhost:3000/account/billing',
        planId:      'plan-abc',
        billingType: 'monthly',
      })
      expect(result.sessionId).toMatch(/^mock_cs_/)
      expect(result.url).toContain('session_id=')
      expect(result.url).toContain('mock=1')
    })

    it('appends params correctly when successUrl already has query params', async () => {
      const result = await provider.createCheckoutSession({
        ...BASE_REQ,
        successUrl:  'http://localhost:3000/account/billing/stripe-return?foo=bar',
        cancelUrl:   'http://localhost:3000/account/billing',
        planId:      'plan-abc',
        billingType: 'one_time',
      })
      expect(result.url).toContain('&session_id=')
    })
  })

  // ── verifyPayment ──────────────────────────────────────────────────────────

  describe('verifyPayment()', () => {
    it('verifies the session and returns success', async () => {
      const session = await provider.createCheckoutSession({
        ...BASE_REQ,
        successUrl:  'http://localhost:3000/billing/stripe-return',
        cancelUrl:   'http://localhost:3000/billing',
        planId:      'plan-abc',
        billingType: 'annual',
      })
      const result = await provider.verifyPayment(session.sessionId)
      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.reference).toBe(session.sessionId)
    })
  })

  // ── refund ─────────────────────────────────────────────────────────────────

  describe('refund()', () => {
    it('returns a successful refund', async () => {
      const charge = await provider.charge(BASE_REQ)
      const refund = await provider.refund(charge.reference, BASE_REQ.amount)
      expect(refund.success).toBe(true)
      expect(refund.status).toBe('completed')
      expect(refund.reference).toMatch(/^mock_refund_/)
    })

    it('allows partial refund', async () => {
      const charge = await provider.charge(BASE_REQ)
      const refund = await provider.refund(charge.reference, 2500)
      expect(refund.success).toBe(true)
    })
  })

  // ── createCustomer ─────────────────────────────────────────────────────────

  describe('createCustomer()', () => {
    it('returns a customerId', async () => {
      const result = await provider.createCustomer('user-123', 'test@example.com', 'Test User')
      expect(result.customerId).toMatch(/^mock_cus_/)
    })

    it('two customers have different IDs', async () => {
      const [a, b] = await Promise.all([
        provider.createCustomer('u1', 'a@a.com'),
        provider.createCustomer('u2', 'b@b.com'),
      ])
      expect(a.customerId).not.toBe(b.customerId)
    })
  })

  // ── cancelSubscription ─────────────────────────────────────────────────────

  describe('cancelSubscription()', () => {
    it('resolves without error', async () => {
      await expect(provider.cancelSubscription('sub_mock_123')).resolves.toBeUndefined()
    })
  })

  // ── createWebhook ──────────────────────────────────────────────────────────

  describe('createWebhook()', () => {
    it('returns a webhookId', async () => {
      const result = await provider.createWebhook('https://example.com/webhook', [
        'checkout.session.completed',
        'charge.refunded',
      ])
      expect(result.webhookId).toMatch(/^mock_wh_/)
    })
  })
})
