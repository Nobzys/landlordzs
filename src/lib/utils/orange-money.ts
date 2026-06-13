// Orange Money Cameroon Merchant API client
// Docs: https://developer.orange.com/apis/om-webpay-cm
// Flow: server initiates → user confirms on phone (USSD push) or web redirect

const BASE_URL      = process.env.ORANGE_MONEY_BASE_URL ?? 'https://api.orange.com'
const CLIENT_ID     = process.env.ORANGE_MONEY_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.ORANGE_MONEY_CLIENT_SECRET ?? ''
const MERCHANT_KEY  = process.env.ORANGE_MONEY_MERCHANT_KEY ?? ''
const RETURN_URL    = process.env.ORANGE_MONEY_RETURN_URL ?? ''
const CANCEL_URL    = process.env.ORANGE_MONEY_CANCEL_URL ?? ''
const NOTIF_URL     = process.env.ORANGE_MONEY_NOTIF_URL ?? ''

interface OrangeToken {
  access_token: string
  expires_at:   number
}

let tokenCache: OrangeToken | null = null

async function getToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expires_at > now + 30_000) {
    return tokenCache.access_token
  }

  const res = await fetch(`${BASE_URL}/oauth/v3/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Orange token fetch failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  tokenCache = {
    access_token: data.access_token,
    expires_at:   now + (data.expires_in ?? 3600) * 1000,
  }
  return tokenCache.access_token
}

export interface OrangePaymentRequest {
  orderId:       string
  amount:        number
  currency?:     string
  description?:  string
  returnUrl?:    string
  cancelUrl?:    string
  notifUrl?:     string
  lang?:         'fr' | 'en'
}

export interface OrangePaymentResponse {
  status:     string
  message:    string
  data?: {
    payment_url:  string
    pay_token:    string
    notif_token:  string
    order_id:     string
  }
}

export type OrangePaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'INITIATED' | 'CANCELLED'

export interface OrangeStatusResult {
  status:      OrangePaymentStatus
  txnid?:      string
  amount?:     number
  subscriberMsisdn?: string
}

export async function orangeInitiatePayment(req: OrangePaymentRequest): Promise<OrangePaymentResponse> {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/orange-money-webpay/cm/v1/webpayment`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_key: MERCHANT_KEY,
      currency:     req.currency ?? 'XAF',
      order_id:     req.orderId,
      amount:       req.amount,
      return_url:   req.returnUrl ?? RETURN_URL,
      cancel_url:   req.cancelUrl ?? CANCEL_URL,
      notif_url:    req.notifUrl  ?? NOTIF_URL,
      lang:         req.lang ?? 'fr',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Orange payment initiation failed ${res.status}: ${body}`)
  }

  return res.json()
}

export async function orangeGetPaymentStatus(orderId: string, payToken: string): Promise<OrangeStatusResult> {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/orange-money-webpay/cm/v1/orderstatus`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_key: MERCHANT_KEY,
      order_id:     orderId,
      pay_token:    payToken,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Orange status check failed ${res.status}: ${body}`)
  }

  return res.json()
}
