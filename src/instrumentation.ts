/**
 * Next.js instrumentation hook — runs once when the server process starts,
 * before any requests are served.
 *
 * Used to validate payment credentials early so a misconfigured production
 * deployment fails fast rather than discovering broken config on first checkout.
 */
export async function register() {
  // Only run on the Node.js runtime (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validatePaymentConfig } = await import('@/lib/config/env')
    validatePaymentConfig()
  }
}
