// ─── PayPal payment provider ──────────────────────────────────────────────────
// Uses PayPal REST API v2 (no SDK — native fetch keeps the bundle lean).
// One-time payments: Orders API v2 (CAPTURE intent).
// Subscriptions: Billing API v1 (requires pre-created plan in PayPal dashboard
//   or created programmatically via createPayPalPlan()).
//
// Required env vars:
//   PAYPAL_CLIENT_ID       — from PayPal Developer Dashboard → My Apps
//   PAYPAL_CLIENT_SECRET   — from PayPal Developer Dashboard → My Apps
//   PAYPAL_WEBHOOK_ID      — from PayPal Developer Dashboard → Webhooks
//   PAYPAL_BASE_URL        — https://api-m.sandbox.paypal.com (sandbox)
//                            https://api-m.paypal.com (production)

import type {
  BillingPaymentProvider,
  PaymentRequest,
  PaymentResult,
  RefundResult,
  CheckoutSessionResult,
  CustomerResult,
  WebhookResult,
} from './provider'

function getConfig() {
  const clientId     = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  const baseUrl      = process.env.PAYPAL_BASE_URL ?? 'https://api-m.sandbox.paypal.com'
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required')
  }
  return { clientId, clientSecret, baseUrl }
}

// ─── Token cache (per-process, request-safe) ─────────────────────────────────

interface TokenCache {
  access_token: string
  expires_at:   number
}

let _tokenCache: TokenCache | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (_tokenCache && _tokenCache.expires_at > now + 30_000) {
    return _tokenCache.access_token
  }

  const { clientId, clientSecret, baseUrl } = getConfig()
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PayPal token request failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  _tokenCache = {
    access_token: data.access_token,
    expires_at:   now + (data.expires_in ?? 3600) * 1000,
  }
  return _tokenCache.access_token
}

async function paypalFetch<T>(
  path:    string,
  options: RequestInit = {},
): Promise<T> {
  const { baseUrl } = getConfig()
  const token = await getAccessToken()
  const res   = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer':       'return=representation',
      ...options.headers,
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`PayPal API ${path} failed ${res.status}: ${JSON.stringify(body)}`)
  }
  return body as T
}

// ─── Provider class ───────────────────────────────────────────────────────────

export class PayPalPaymentProvider implements BillingPaymentProvider {
  readonly name = 'paypal'

  // ── Create an order (one-time) or subscription (recurring) ───────────────
  async createCheckoutSession(req: PaymentRequest & {
    successUrl:   string
    cancelUrl:    string
    planId:       string
    billingType:  'one_time' | 'monthly' | 'annual'
    customerId?:  string
  }): Promise<CheckoutSessionResult> {
    if (req.billingType !== 'one_time') {
      return this.createSubscriptionSession(req)
    }
    return this.createOrderSession(req)
  }

  private async createOrderSession(req: PaymentRequest & {
    successUrl:  string
    cancelUrl:   string
    planId:      string
    billingType: 'one_time' | 'monthly' | 'annual'
  }): Promise<CheckoutSessionResult> {
    const order = await paypalFetch<{ id: string; links: { rel: string; href: string }[] }>(
      '/v2/checkout/orders',
      {
        method: 'POST',
        body:   JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: req.currency,
                value:         (req.amount / 100).toFixed(2),
              },
              description:    req.description,
              custom_id:      `${req.userId}:${req.planId}`,
            },
          ],
          application_context: {
            brand_name:          'LANDLORDZS',
            landing_page:        'BILLING',
            user_action:         'PAY_NOW',
            return_url:          req.successUrl,
            cancel_url:          req.cancelUrl,
            shipping_preference: 'NO_SHIPPING',
          },
        }),
      },
    )

    const approvalLink = order.links.find((l) => l.rel === 'payer-action' || l.rel === 'approve')
    if (!approvalLink) throw new Error('PayPal did not return an approval link')

    return { sessionId: order.id, url: approvalLink.href }
  }

  private async createSubscriptionSession(req: PaymentRequest & {
    successUrl:  string
    cancelUrl:   string
    planId:      string
    billingType: 'one_time' | 'monthly' | 'annual'
  }): Promise<CheckoutSessionResult> {
    // PayPal subscriptions require a PayPal Plan ID.
    // The plan_id in metadata should be the PayPal plan ID, not the Landlordzs plan ID.
    // If not provided, we fall back to a one-time order.
    const paypalPlanId = (req.metadata?.paypal_plan_id as string | undefined)
    if (!paypalPlanId) {
      return this.createOrderSession({ ...req, billingType: 'one_time' })
    }

    const subscription = await paypalFetch<{ id: string; links: { rel: string; href: string }[] }>(
      '/v1/billing/subscriptions',
      {
        method: 'POST',
        body:   JSON.stringify({
          plan_id:             paypalPlanId,
          custom_id:           `${req.userId}:${req.planId}`,
          application_context: {
            brand_name:   'LANDLORDZS',
            return_url:   req.successUrl,
            cancel_url:   req.cancelUrl,
            user_action:  'SUBSCRIBE_NOW',
            payment_method: {
              payer_selected:    'PAYPAL',
              payee_preferred:   'IMMEDIATE_PAYMENT_REQUIRED',
            },
          },
        }),
      },
    )

    const approvalLink = subscription.links.find(
      (l) => l.rel === 'approve' || l.rel === 'payer-action',
    )
    if (!approvalLink) throw new Error('PayPal did not return a subscription approval link')

    return { sessionId: subscription.id, url: approvalLink.href }
  }

  // ── Capture a PayPal order after user returns ────────────────────────────
  async verifyPayment(orderId: string): Promise<PaymentResult> {
    try {
      const capture = await paypalFetch<{
        id:     string
        status: string
        purchase_units: { payments: { captures: { id: string; status: string }[] } }[]
      }>(`/v2/checkout/orders/${orderId}/capture`, { method: 'POST', body: '{}' })

      const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? capture.id
      const success   = capture.status === 'COMPLETED'

      return {
        success,
        reference: capture.id,
        status:    success ? 'completed' : 'pending',
        paymentId: captureId,
      }
    } catch (err: unknown) {
      // If already captured (INSTRUMENT_DECLINED / ORDER_ALREADY_CAPTURED), treat as success
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('ORDER_ALREADY_CAPTURED')) {
        return { success: true, reference: orderId, status: 'completed', paymentId: orderId }
      }
      return { success: false, reference: orderId, status: 'failed', error: msg }
    }
  }

  // ── Not used directly (always go through createCheckoutSession) ──────────
  async charge(_req: PaymentRequest): Promise<PaymentResult> {
    return {
      success: false,
      reference: '',
      status:  'failed',
      error:   'Use createCheckoutSession() for PayPal payments.',
    }
  }

  // ── Refund a capture ─────────────────────────────────────────────────────
  async refund(captureId: string, amount: number): Promise<RefundResult> {
    try {
      const refund = await paypalFetch<{ id: string; status: string }>(
        `/v2/payments/captures/${captureId}/refund`,
        {
          method: 'POST',
          body:   JSON.stringify({
            amount: {
              value:         (amount / 100).toFixed(2),
              currency_code: 'XAF',
            },
          }),
        },
      )
      return {
        success:   refund.status === 'COMPLETED',
        reference: refund.id,
        status:    refund.status === 'COMPLETED' ? 'completed' : 'pending',
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PayPal refund failed'
      return { success: false, reference: '', status: 'failed', error: msg }
    }
  }

  // ── PayPal doesn't have a traditional "customer" concept for REST API ────
  async createCustomer(_userId: string, _email: string, _name?: string): Promise<CustomerResult> {
    // PayPal identifies payers by their PayPal account; no explicit customer creation.
    return { customerId: `paypal_payer_${_userId}` }
  }

  // ── Cancel a PayPal subscription ─────────────────────────────────────────
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body:   JSON.stringify({ reason: 'User requested cancellation' }),
    })
  }

  // ── Register a webhook ───────────────────────────────────────────────────
  async createWebhook(url: string, events: string[]): Promise<WebhookResult> {
    const webhook = await paypalFetch<{ id: string }>('/v1/notifications/webhooks', {
      method: 'POST',
      body:   JSON.stringify({
        url,
        event_types: events.map((name) => ({ name })),
      }),
    })
    return { webhookId: webhook.id }
  }
}

// ─── Webhook signature verification ──────────────────────────────────────────
// PayPal uses asymmetric signatures; we verify using the cert from their CDN.
// For simplicity and security, check the PAYPAL_WEBHOOK_ID against the event.

export async function verifyPayPalWebhook(
  headers:   Record<string, string>,
  rawBody:   string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) {
    console.warn('[PayPal] PAYPAL_WEBHOOK_ID not set — skipping signature verification')
    return true // Allow in dev; block in prod via env validation
  }

  try {
    const result = await paypalFetch<{ verification_status: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body:   JSON.stringify({
          auth_algo:         headers['paypal-auth-algo'],
          cert_url:          headers['paypal-cert-url'],
          transmission_id:   headers['paypal-transmission-id'],
          transmission_sig:  headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id:        webhookId,
          webhook_event:     JSON.parse(rawBody),
        }),
      },
    )
    return result.verification_status === 'SUCCESS'
  } catch {
    return false
  }
}
