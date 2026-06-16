/**
 * Centralized environment configuration for LANDLORDZS.
 *
 * Rules:
 *  - get()      tracks missing required vars; never throws at module load (build-safe)
 *  - optional() returns fallback silently
 *  - validatePaymentConfig() is called from instrumentation.ts at server startup:
 *      production → throws (fail fast before serving requests)
 *      development → console.warn (allows local dev without all credentials)
 */

const _missing: string[] = []

function get(key: string): string {
  const v = process.env[key]
  if (!v) _missing.push(key)
  return v ?? ''
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

// ─── MTN Mobile Money ─────────────────────────────────────────────────────────
// Collections API:  customer → platform  (wallet top-up)
// Disbursements API: platform → recipient (payouts)
// Sandbox: https://momodeveloper.mtn.com  →  Get API Key → Create sandbox credentials
// Production: same portal, switch Target Environment to 'production'

export const MTN_BASE_URL    = optional('MTN_MOMO_BASE_URL',    'https://sandbox.momodeveloper.mtn.com')
export const MTN_TARGET_ENV  = optional('MTN_MOMO_TARGET_ENV',  'sandbox')
export const MTN_CALLBACK    = optional('MTN_MOMO_CALLBACK_URL')

// Collections (required for wallet top-ups)
export const MTN_COLL_KEY    = get('MTN_MOMO_SUBSCRIPTION_KEY')
export const MTN_COLL_USER   = get('MTN_MOMO_API_USER')
export const MTN_COLL_SECRET = get('MTN_MOMO_API_KEY')

// Disbursements (required for payouts; falls back to Collection credentials in sandbox
// because MTN sandbox shares credentials across products)
export const MTN_DISB_KEY    = optional('MTN_MOMO_DISBURSEMENT_KEY',     MTN_COLL_KEY)
export const MTN_DISB_USER   = optional('MTN_MOMO_DISBURSEMENT_USER',    MTN_COLL_USER)
export const MTN_DISB_SECRET = optional('MTN_MOMO_DISBURSEMENT_API_KEY', MTN_COLL_SECRET)

// ─── Orange Money Cameroon ────────────────────────────────────────────────────
// Portal: https://developer.orange.com → My apps → Create app → Subscribe to OM WebPay CM
// Merchant key: Orange partner portal → My accounts → Merchant details

export const OM_BASE_URL      = optional('ORANGE_MONEY_BASE_URL', 'https://api.orange.com')
export const OM_CLIENT_ID     = get('ORANGE_MONEY_CLIENT_ID')
export const OM_CLIENT_SECRET = get('ORANGE_MONEY_CLIENT_SECRET')
export const OM_MERCHANT_KEY  = get('ORANGE_MONEY_MERCHANT_KEY')
export const OM_RETURN_URL    = get('ORANGE_MONEY_RETURN_URL')
export const OM_CANCEL_URL    = get('ORANGE_MONEY_CANCEL_URL')
export const OM_NOTIF_URL     = get('ORANGE_MONEY_NOTIF_URL')

// ─── Stripe ──────────────────────────────────────────────────────────────────
// Docs: https://dashboard.stripe.com/apikeys
// Sandbox: use sk_test_xxx / pk_test_xxx keys
// Production: use sk_live_xxx / pk_live_xxx keys

export const STRIPE_SECRET_KEY      = optional('STRIPE_SECRET_KEY')
export const STRIPE_WEBHOOK_SECRET  = optional('STRIPE_WEBHOOK_SECRET')
export const STRIPE_PUBLISHABLE_KEY = optional('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')

// ─── PayPal ───────────────────────────────────────────────────────────────────
// Docs: https://developer.paypal.com/api/rest/
// Sandbox: https://api-m.sandbox.paypal.com
// Production: https://api-m.paypal.com

export const PAYPAL_CLIENT_ID     = optional('PAYPAL_CLIENT_ID')
export const PAYPAL_CLIENT_SECRET = optional('PAYPAL_CLIENT_SECRET')
export const PAYPAL_WEBHOOK_ID    = optional('PAYPAL_WEBHOOK_ID')
export const PAYPAL_BASE_URL      = optional('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com')

// ─── Application ──────────────────────────────────────────────────────────────
export const APP_URL = optional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')

// ─── Startup validation ───────────────────────────────────────────────────────

/**
 * Called from src/instrumentation.ts when the Node.js server process starts.
 *
 * Production: throws immediately if any required payment credential is absent,
 * preventing the server from accepting requests with broken payment config.
 *
 * Development: emits a yellow console warning — useful when running the app
 * locally without full payment credentials.
 */
export function validatePaymentConfig(): void {
  if (_missing.length === 0) return

  const list = _missing.map(k => `  • ${k}`).join('\n')
  const msg  = `[LANDLORDZS] Missing required environment variables:\n${list}`

  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg)
  }

  // Development: warn but continue so the app is usable without payment creds
  console.warn(`\n\x1b[33m${msg}\n  Payments will fail until these are added to .env.local\x1b[0m\n`)
}
