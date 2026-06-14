// MTN Mobile Money API client
// Collections docs:    https://momodeveloper.mtn.com/api-documentation/collection/
// Disbursements docs:  https://momodeveloper.mtn.com/api-documentation/disbursement/

import {
  MTN_BASE_URL,
  MTN_TARGET_ENV,
  MTN_CALLBACK,
  MTN_COLL_KEY,
  MTN_COLL_USER,
  MTN_COLL_SECRET,
  MTN_DISB_KEY,
  MTN_DISB_USER,
  MTN_DISB_SECRET,
} from '@/lib/config/env'

interface MtnToken {
  access_token: string
  expires_at:   number
}

// ─── Collections (customer → platform) ───────────────────────────────────────

let collTokenCache: MtnToken | null = null

async function getCollectionToken(): Promise<string> {
  const now = Date.now()
  if (collTokenCache && collTokenCache.expires_at > now + 30_000) {
    return collTokenCache.access_token
  }

  const creds = Buffer.from(`${MTN_COLL_USER}:${MTN_COLL_SECRET}`).toString('base64')
  const res   = await fetch(`${MTN_BASE_URL}/collection/token/`, {
    method:  'POST',
    headers: {
      Authorization:               `Basic ${creds}`,
      'Ocp-Apim-Subscription-Key': MTN_COLL_KEY,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MTN collection token failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  collTokenCache = {
    access_token: data.access_token,
    expires_at:   now + (data.expires_in ?? 3600) * 1000,
  }
  return collTokenCache.access_token
}

export interface MtnPaymentRequest {
  referenceId:   string   // UUID — our transaction ID (used as X-Reference-Id)
  phone:         string   // +237xxxxxxxxx
  amount:        number   // XAF integer
  externalId:    string   // our internal reference
  payerMessage?: string
  payeeNote?:    string
  callbackUrl?:  string
}

export type MtnPaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED'

export interface MtnPaymentStatusResult {
  status:                  MtnPaymentStatus
  financialTransactionId?: string
  reason?:                 { code: string; message: string }
}

export async function mtnRequestToPay(req: MtnPaymentRequest): Promise<void> {
  const token  = await getCollectionToken()
  const msisdn = req.phone.replace('+', '')

  const res = await fetch(`${MTN_BASE_URL}/collection/v1_0/requesttopay`, {
    method:  'POST',
    headers: {
      'Authorization':              `Bearer ${token}`,
      'X-Reference-Id':             req.referenceId,
      'X-Target-Environment':       MTN_TARGET_ENV,
      'Ocp-Apim-Subscription-Key':  MTN_COLL_KEY,
      'Content-Type':               'application/json',
      ...(MTN_CALLBACK ? { 'X-Callback-Url': req.callbackUrl ?? MTN_CALLBACK } : {}),
    },
    body: JSON.stringify({
      amount:       String(req.amount),
      currency:     'XAF',
      externalId:   req.externalId,
      payer: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage: req.payerMessage ?? 'LANDLORDZS Payment',
      payeeNote:    req.payeeNote    ?? `Ref: ${req.referenceId}`,
    }),
  })

  if (res.status !== 202) {
    const body = await res.text()
    throw new Error(`MTN requesttopay failed ${res.status}: ${body}`)
  }
}

export async function mtnGetPaymentStatus(referenceId: string): Promise<MtnPaymentStatusResult> {
  const token = await getCollectionToken()

  const res = await fetch(`${MTN_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      'Authorization':             `Bearer ${token}`,
      'X-Target-Environment':      MTN_TARGET_ENV,
      'Ocp-Apim-Subscription-Key': MTN_COLL_KEY,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MTN status check failed ${res.status}: ${body}`)
  }

  return res.json()
}

// ─── Disbursements (platform → recipient) ────────────────────────────────────
// Separate product from Collections. In sandbox, credentials are shared;
// in production, each product requires its own subscription and credentials.

let disbTokenCache: MtnToken | null = null

async function getDisbursementToken(): Promise<string> {
  const now = Date.now()
  if (disbTokenCache && disbTokenCache.expires_at > now + 30_000) {
    return disbTokenCache.access_token
  }

  const creds = Buffer.from(`${MTN_DISB_USER}:${MTN_DISB_SECRET}`).toString('base64')
  const res   = await fetch(`${MTN_BASE_URL}/disbursement/token/`, {
    method:  'POST',
    headers: {
      Authorization:               `Basic ${creds}`,
      'Ocp-Apim-Subscription-Key': MTN_DISB_KEY,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MTN disbursement token failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  disbTokenCache = {
    access_token: data.access_token,
    expires_at:   now + (data.expires_in ?? 3600) * 1000,
  }
  return disbTokenCache.access_token
}

export interface MtnTransferRequest {
  referenceId:   string
  phone:         string
  amount:        number
  externalId:    string
  payerMessage?: string
  payeeNote?:    string
}

export async function mtnTransfer(req: MtnTransferRequest): Promise<void> {
  const token  = await getDisbursementToken()
  const msisdn = req.phone.replace('+', '')

  const res = await fetch(`${MTN_BASE_URL}/disbursement/v1_0/transfer`, {
    method:  'POST',
    headers: {
      'Authorization':              `Bearer ${token}`,
      'X-Reference-Id':             req.referenceId,
      'X-Target-Environment':       MTN_TARGET_ENV,
      'Ocp-Apim-Subscription-Key':  MTN_DISB_KEY,
      'Content-Type':               'application/json',
      ...(MTN_CALLBACK ? { 'X-Callback-Url': MTN_CALLBACK } : {}),
    },
    body: JSON.stringify({
      amount:       String(req.amount),
      currency:     'XAF',
      externalId:   req.externalId,
      payee: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage: req.payerMessage ?? 'LANDLORDZS Payout',
      payeeNote:    req.payeeNote    ?? `Payout ${req.referenceId}`,
    }),
  })

  if (res.status !== 202) {
    const body = await res.text()
    throw new Error(`MTN transfer failed ${res.status}: ${body}`)
  }
}

export async function mtnGetTransferStatus(referenceId: string): Promise<MtnPaymentStatusResult> {
  const token = await getDisbursementToken()

  const res = await fetch(`${MTN_BASE_URL}/disbursement/v1_0/transfer/${referenceId}`, {
    headers: {
      'Authorization':             `Bearer ${token}`,
      'X-Target-Environment':      MTN_TARGET_ENV,
      'Ocp-Apim-Subscription-Key': MTN_DISB_KEY,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MTN transfer status check failed ${res.status}: ${body}`)
  }

  return res.json()
}
