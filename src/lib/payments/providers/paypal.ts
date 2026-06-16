import type {
  PaymentProvider,
  CreatePaymentInput,
  PaymentResult,
  RefundResult,
  SubscriptionResult,
  PaymentStatusResult,
} from '../types'

// ─── PayPal provider ──────────────────────────────────────────────────────────
// Uses PayPal Orders v2 REST API (no SDK — native fetch).
// One-time: Orders API with CAPTURE intent.
// Recurring: Billing Subscriptions API if paypal_plan_id is in metadata,
//            otherwise falls back to one-time order.
//
// Required env vars:
//   PAYPAL_CLIENT_ID
//   PAYPAL_CLIENT_SECRET
//   PAYPAL_WEBHOOK_ID      (for webhook signature verification)
//   PAYPAL_BASE_URL        default: https://api-m.sandbox.paypal.com

interface TokenCache {
  token:      string
  expiresAt:  number
}

let _tokenCache: TokenCache | null = null

function getBaseUrl(): string {
  return process.env.PAYPAL_BASE_URL ?? 'https://api-m.sandbox.paypal.com'
}

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (_tokenCache && _tokenCache.expiresAt > now + 30_000) {
    return _tokenCache.token
  }

  const clientId     = process.env.PAYPAL_CLIENT_ID     ?? ''
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? ''
  if (!clientId || !clientSecret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not configured.')

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res   = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error(`PayPal token failed ${res.status}: ${await res.text()}`)
  const data   = await res.json()
  _tokenCache  = { token: data.access_token, expiresAt: now + data.expires_in * 1000 }
  return _tokenCache.token
}

async function paypalFetch<T = unknown>(
  method: string,
  path:   string,
  body?:  unknown,
): Promise<T> {
  const token = await getAccessToken()
  const res   = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer':       'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(`PayPal ${method} ${path} ${res.status}: ${text}`)
  return json as T
}

export class PayPalProvider implements PaymentProvider {
  readonly name = 'paypal' as const

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const order = await paypalFetch<{ id: string; links: { rel: string; href: string }[] }>(
      'POST',
      '/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount:     { currency_code: input.currency, value: (input.amount / 100).toFixed(2) },
          description: input.description,
          custom_id:  `${input.userId}:${input.metadata?.planId ?? ''}`,
        }],
        application_context: {
          return_url: input.successUrl ?? `${appUrl}/account/billing/paypal-return`,
          cancel_url: input.cancelUrl  ?? `${appUrl}/account/billing`,
        },
      },
    )

    const approvalUrl = order.links.find(l => l.rel === 'approve')?.href
    return {
      success:     true,
      status:      'pending',
      reference:   order.id,
      redirectUrl: approvalUrl,
    }
  }

  async verifyPayment(reference: string, _meta?: Record<string, unknown>): Promise<PaymentResult> {
    try {
      const order = await paypalFetch<{ id: string; status: string; purchase_units: Array<{ payments: { captures: Array<{ id: string }> } }> }>(
        'POST',
        `/v2/checkout/orders/${reference}/capture`,
      )
      const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id
      const completed = order.status === 'COMPLETED'
      return {
        success:   completed,
        status:    completed ? 'completed' : 'pending',
        reference,
        paymentId: captureId,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('ORDER_ALREADY_CAPTURED')) {
        return { success: true, status: 'completed', reference }
      }
      return { success: false, status: 'failed', reference, error: msg }
    }
  }

  async refundPayment(reference: string, amount?: number): Promise<RefundResult> {
    try {
      const body  = amount ? { amount: { value: (amount / 100).toFixed(2), currency_code: 'XAF' } } : {}
      const refund = await paypalFetch<{ id: string; status: string }>(
        'POST',
        `/v2/payments/captures/${reference}/refund`,
        body,
      )
      return {
        success:   refund.status === 'COMPLETED',
        reference: refund.id,
        status:    refund.status === 'COMPLETED' ? 'completed' : 'failed',
      }
    } catch (err) {
      return { success: false, reference: '', status: 'failed', error: err instanceof Error ? err.message : 'Refund failed' }
    }
  }

  async createSubscription(input: CreatePaymentInput): Promise<SubscriptionResult> {
    const planId = input.metadata?.paypal_plan_id as string | undefined

    if (!planId) {
      // No PayPal plan pre-created — fall back to one-time order
      const result = await this.createPayment(input)
      return { success: result.success, status: result.status, reference: result.reference, redirectUrl: result.redirectUrl }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const sub    = await paypalFetch<{ id: string; links: { rel: string; href: string }[] }>(
      'POST',
      '/v1/billing/subscriptions',
      {
        plan_id:     planId,
        application_context: {
          return_url: input.successUrl ?? `${appUrl}/account/billing/paypal-return`,
          cancel_url: input.cancelUrl  ?? `${appUrl}/account/billing`,
        },
      },
    )

    const approvalUrl = sub.links.find(l => l.rel === 'approve')?.href
    return {
      success:        true,
      status:         'pending',
      reference:      sub.id,
      subscriptionId: sub.id,
      redirectUrl:    approvalUrl,
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await paypalFetch('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      reason: 'Cancelled by user',
    })
  }

  async getPaymentStatus(reference: string): Promise<PaymentStatusResult> {
    try {
      const order = await paypalFetch<{ status: string }>(
        'GET',
        `/v2/checkout/orders/${reference}`,
      )
      const done   = order.status === 'COMPLETED'
      const failed = order.status === 'VOIDED'
      return { status: done ? 'completed' : failed ? 'failed' : 'pending', reference }
    } catch {
      return { status: 'pending', reference }
    }
  }
}
