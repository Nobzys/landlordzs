import { describe, it, expect } from 'vitest'
import { getPaymentProvider } from '../provider'
import { MockPaymentProvider } from '../mock'

// ─── Provider factory tests ───────────────────────────────────────────────────
// Verifies that getPaymentProvider() returns the correct class for each name,
// and that the fallback (no name) returns the mock provider.

describe('getPaymentProvider()', () => {
  it('defaults to MockPaymentProvider when no name given', async () => {
    const provider = await getPaymentProvider()
    expect(provider).toBeInstanceOf(MockPaymentProvider)
    expect(provider.name).toBe('mock')
  })

  it('returns MockPaymentProvider for "mock"', async () => {
    const provider = await getPaymentProvider('mock')
    expect(provider.name).toBe('mock')
  })

  it('returns a provider with name "stripe" for "stripe"', async () => {
    const provider = await getPaymentProvider('stripe')
    expect(provider.name).toBe('stripe')
    expect(typeof provider.charge).toBe('function')
    expect(typeof provider.createCheckoutSession).toBe('function')
  })

  it('returns a provider with name "paypal" for "paypal"', async () => {
    const provider = await getPaymentProvider('paypal')
    expect(provider.name).toBe('paypal')
    expect(typeof provider.charge).toBe('function')
  })

  it('returns a provider with name "mobile_money" for "mobile_money"', async () => {
    const provider = await getPaymentProvider('mobile_money')
    expect(provider.name).toBe('mobile_money')
    expect(typeof provider.charge).toBe('function')
    expect(typeof provider.verifyPayment).toBe('function')
  })

  it('all providers implement the required charge() method', async () => {
    const names = ['mock', 'stripe', 'paypal', 'mobile_money'] as const
    for (const name of names) {
      const provider = await getPaymentProvider(name)
      expect(typeof provider.charge).toBe('function')
      expect(typeof provider.refund).toBe('function')
    }
  })
})
