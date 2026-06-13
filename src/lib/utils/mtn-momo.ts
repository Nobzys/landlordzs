// MTN Mobile Money Collections API client
// Docs: https://momodeveloper.mtn.com/api-documentation/collection/

const BASE_URL    = process.env.MTN_MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com'
const SUB_KEY     = process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? ''
const API_USER    = process.env.MTN_MOMO_API_USER ?? ''
const API_KEY     = process.env.MTN_MOMO_API_KEY ?? ''
const TARGET_ENV  = process.env.MTN_MOMO_TARGET_ENV ?? 'sandbox'
const CALLBACK_URL= process.env.MTN_MOMO_CALLBACK_URL ?? ''

interface MtnToken {
  access_token: string
  expires_at:   number
}

// Module-level token cache — warm if the serverless function is reused
let tokenCache: MtnToken | null = null

async function getToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expires_at > now + 30_000) {
    return tokenCache.access_token
  }

  const creds = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64')
  const res   = await fetch(`${BASE_URL}/collection/token/`, {
    method:  'POST',
    headers: {
      Authorization:              `Basic ${creds}`,
      'Ocp-Apim-Subscription-Key': SUB_KEY,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MTN token fetch failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  tokenCache = {
    access_token: data.access_token,
    expires_at:   now + (data.expires_in ?? 3600) * 1000,
  }
  return tokenCache.access_token
}

export interface MtnPaymentRequest {
  referenceId: string   // UUID — our transaction ID
  phone:       string   // +237xxxxxxxxx
  amount:      number   // XAF integer
  externalId:  string   // our internal reference (same as referenceId)
  payerMessage?: string
  payeeNote?:    string
  callbackUrl?:  string
}

export type MtnPaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED'

export interface MtnPaymentStatusResult {
  status:               MtnPaymentStatus
  financialTransactionId?: string
  reason?:              { code: string; message: string }
}

export async function mtnRequestToPay(req: MtnPaymentRequest): Promise<void> {
  const token   = await getToken()
  const msisdn  = req.phone.replace('+', '') // strip leading +

  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method:  'POST',
    headers: {
      'Authorization':              `Bearer ${token}`,
      'X-Reference-Id':             req.referenceId,
      'X-Target-Environment':       TARGET_ENV,
      'Ocp-Apim-Subscription-Key':  SUB_KEY,
      'Content-Type':               'application/json',
      ...(CALLBACK_URL ? { 'X-Callback-Url': req.callbackUrl ?? CALLBACK_URL } : {}),
    },
    body: JSON.stringify({
      amount:      String(req.amount),
      currency:    'XAF',
      externalId:  req.externalId,
      payer: {
        partyIdType: 'MSISDN',
        partyId:     msisdn,
      },
      payerMessage: req.payerMessage ?? 'LANDLORDZS Payment',
      payeeNote:    req.payeeNote ?? 'Property payment via LANDLORDZS',
    }),
  })

  if (res.status !== 202) {
    const body = await res.text()
    throw new Error(`MTN requesttopay failed ${res.status}: ${body}`)
  }
}

export async function mtnGetPaymentStatus(referenceId: string): Promise<MtnPaymentStatusResult> {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      'Authorization':             `Bearer ${token}`,
      'X-Target-Environment':      TARGET_ENV,
      'Ocp-Apim-Subscription-Key': SUB_KEY,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MTN status check failed ${res.status}: ${body}`)
  }

  return res.json()
}
