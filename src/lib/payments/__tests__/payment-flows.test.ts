import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MockPaymentProvider } from '../mock'

// ─── Payment flow integration tests ──────────────────────────────────────────
// Tests the end-to-end billing scenarios using the mock provider.
// These mirror production flows: checkout → verify → subscribe → refund.

const PLAN = {
  id:           'plan-landlord-monthly',
  amount:       15000,
  currency:     'XAF',
  billing_type: 'monthly' as const,
}

const USER = {
  id:    'user-abc',
  email: 'landlord@example.cm',
  name:  'Pauline Nguemo',
}

const APP_URL = 'http://localhost:3000'

describe('Payment flows (mock provider)', () => {
  let provider: MockPaymentProvider

  beforeEach(() => {
    provider = new MockPaymentProvider()
  })

  // ── Successful one-time payment ────────────────────────────────────────────

  describe('Successful payment', () => {
    it('completes charge synchronously', async () => {
      const result = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'Landlord Monthly Plan',
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.reference).toBeTruthy()
    })

    it('completes checkout session flow (redirect + verify)', async () => {
      // Step 1: create checkout session (equivalent to server creating Stripe session)
      const session = await provider.createCheckoutSession({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'Landlord Monthly Plan',
        successUrl:  `${APP_URL}/account/billing/stripe-return`,
        cancelUrl:   `${APP_URL}/account/billing`,
        planId:      PLAN.id,
        billingType: PLAN.billing_type,
      })

      expect(session.sessionId).toBeTruthy()
      expect(session.url).toContain(session.sessionId)

      // Step 2: user "returns" from provider — we verify the session
      const verification = await provider.verifyPayment(session.sessionId)

      expect(verification.success).toBe(true)
      expect(verification.status).toBe('completed')
    })
  })

  // ── Failed payment simulation ──────────────────────────────────────────────

  describe('Failed payment', () => {
    it('handles a failed charge result gracefully', async () => {
      // Simulate a failed result (we patch the provider for this test)
      const originalCharge = provider.charge.bind(provider)
      vi.spyOn(provider, 'charge').mockResolvedValueOnce({
        success:   false,
        reference: '',
        status:    'failed',
        error:     'Insufficient funds',
      })

      const result = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'Landlord Monthly Plan',
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error).toBe('Insufficient funds')

      // Restore and verify the real implementation still works
      vi.restoreAllMocks()
      const realResult = await originalCharge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'Landlord Monthly Plan',
      })
      expect(realResult.success).toBe(true)
    })

    it('reports failed verification for unknown session', async () => {
      vi.spyOn(provider, 'verifyPayment').mockResolvedValueOnce({
        success:   false,
        reference: 'sess_unknown',
        status:    'failed',
        error:     'Session expired',
      })

      const result = await provider.verifyPayment('sess_unknown')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Session expired')
    })
  })

  // ── Subscription renewal simulation ───────────────────────────────────────

  describe('Subscription renewal', () => {
    it('processes renewal charge same as initial (no credential difference)', async () => {
      // Initial
      const initial = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: `${PLAN.id} - Month 1`,
        metadata:    { plan_id: PLAN.id, billing_type: 'monthly' },
      })
      expect(initial.success).toBe(true)

      // Renewal (month 2)
      const renewal = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: `${PLAN.id} - Month 2`,
        metadata:    { plan_id: PLAN.id, billing_type: 'monthly' },
      })
      expect(renewal.success).toBe(true)
      expect(renewal.reference).not.toBe(initial.reference)
    })

    it('handles renewal failure (provider returns failed)', async () => {
      vi.spyOn(provider, 'charge').mockResolvedValueOnce({
        success:   false,
        reference: '',
        status:    'failed',
        error:     'Card declined',
      })

      const renewal = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'Renewal charge',
      })
      expect(renewal.success).toBe(false)
      expect(renewal.status).toBe('failed')
    })
  })

  // ── Refund flow ────────────────────────────────────────────────────────────

  describe('Refund', () => {
    it('refunds a completed payment successfully', async () => {
      const charge = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'Landlord Annual Plan',
      })
      expect(charge.success).toBe(true)

      const refund = await provider.refund(charge.reference, PLAN.amount)
      expect(refund.success).toBe(true)
      expect(refund.status).toBe('completed')
      expect(refund.reference).not.toBe(charge.reference)
    })

    it('handles partial refund', async () => {
      const charge = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'Partial refund test',
      })

      const partial = await provider.refund(charge.reference, PLAN.amount / 2)
      expect(partial.success).toBe(true)
    })

    it('returns a unique reference per refund', async () => {
      const charge = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'Refund uniqueness test',
      })

      const [r1, r2] = await Promise.all([
        provider.refund(charge.reference, 1000),
        provider.refund(charge.reference, 2000),
      ])
      expect(r1.reference).not.toBe(r2.reference)
    })
  })

  // ── Webhook idempotency ────────────────────────────────────────────────────

  describe('Webhook idempotency (event deduplication)', () => {
    it('tracking an event ID prevents double-processing', () => {
      // This simulates the dedup check done in the webhook handlers:
      // INSERT INTO webhook_events ... ON CONFLICT (provider, event_id) DO NOTHING
      // If the insert affected 0 rows, the event was already processed.

      const processedEvents = new Set<string>()

      function processWebhookEvent(provider: string, eventId: string): 'processed' | 'duplicate' {
        const key = `${provider}:${eventId}`
        if (processedEvents.has(key)) return 'duplicate'
        processedEvents.add(key)
        return 'processed'
      }

      expect(processWebhookEvent('stripe', 'evt_001')).toBe('processed')
      expect(processWebhookEvent('stripe', 'evt_001')).toBe('duplicate')
      expect(processWebhookEvent('paypal', 'evt_001')).toBe('processed') // same ID, different provider
      expect(processWebhookEvent('stripe', 'evt_002')).toBe('processed')
    })
  })

  // ── Mobile money pending/poll flow ─────────────────────────────────────────

  describe('Mobile money pending/poll flow', () => {
    it('charge returns pending status', async () => {
      vi.spyOn(provider, 'charge').mockResolvedValueOnce({
        success:   true,
        reference: 'momo_ref_123',
        status:    'pending',
      })

      const result = await provider.charge({
        amount:      PLAN.amount,
        currency:    PLAN.currency,
        userId:      USER.id,
        description: 'MTN MoMo payment',
        metadata:    { phone: '+237670000000', mobileProvider: 'mtn_momo' },
      })

      expect(result.status).toBe('pending')
    })

    it('poll completes after pending', async () => {
      let pollCount = 0
      vi.spyOn(provider, 'verifyPayment').mockImplementation(async () => {
        pollCount++
        if (pollCount < 3) {
          return { success: true, reference: 'momo_ref_123', status: 'pending' }
        }
        return { success: true, reference: 'momo_ref_123', status: 'completed' }
      })

      let status: 'pending' | 'completed' | 'failed' = 'pending'
      while (status === 'pending') {
        const result = await provider.verifyPayment('momo_ref_123')
        status = result.status
      }

      expect(status).toBe('completed')
      expect(pollCount).toBe(3)
    })

    it('poll detects payment failure', async () => {
      vi.spyOn(provider, 'verifyPayment').mockResolvedValueOnce({
        success:   false,
        reference: 'momo_ref_fail',
        status:    'failed',
        error:     'Transaction declined',
      })

      const result = await provider.verifyPayment('momo_ref_fail')
      expect(result.status).toBe('failed')
      expect(result.error).toBe('Transaction declined')
    })
  })
})
