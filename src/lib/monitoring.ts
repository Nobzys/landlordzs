/**
 * Error monitoring and observability abstraction.
 *
 * Replace the console-based implementations below with your chosen provider:
 *   - Sentry:    import * as Sentry from '@sentry/nextjs'
 *   - Datadog:   import { datadogLogs } from '@datadog/browser-logs'
 *   - LogRocket: import LogRocket from 'logrocket'
 *
 * The function signatures are intentionally provider-agnostic so a single
 * search-and-replace is all that's needed to switch providers.
 */

type Context = Record<string, unknown>

// ─── Exception capture ────────────────────────────────────────────────────────

export function captureException(error: unknown, context?: Context): void {
  const err = error instanceof Error ? error : new Error(String(error))

  // TODO: Sentry.captureException(err, { extra: context })
  console.error('[EXCEPTION]', err.message, {
    stack:   err.stack?.split('\n').slice(0, 5).join('\n'),
    ...context,
  })
}

// ─── Named events ─────────────────────────────────────────────────────────────

export function captureEvent(name: string, data?: Context): void {
  // TODO: Sentry.captureEvent({ message: name, extra: data })
  if (process.env.NODE_ENV === 'development') {
    console.log('[EVENT]', name, data)
  }
}

// ─── Performance ──────────────────────────────────────────────────────────────

const SLOW_QUERY_THRESHOLD_MS = 500

export function captureSlowQuery(
  queryName: string,
  durationMs: number,
  context?: Context,
): void {
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    // TODO: Sentry.addBreadcrumb({ category: 'db', message: queryName, data: { durationMs, ...context } })
    console.warn('[SLOW_QUERY]', queryName, `${durationMs}ms`, context)
  }
}

// ─── Domain-specific events ───────────────────────────────────────────────────

export function captureFailedPayment(
  transactionId: string,
  reason: string,
  context?: Context,
): void {
  // TODO: Sentry.captureMessage(`Payment failed: ${transactionId}`, { level: 'error', extra: { reason, ...context } })
  console.error('[PAYMENT_FAILED]', { transactionId, reason, ...context })
}

export function captureFailedNotification(
  notificationId: string,
  reason: string,
  context?: Context,
): void {
  // TODO: Sentry.captureMessage(`Notification failed: ${notificationId}`, { level: 'warning', extra: { reason, ...context } })
  console.warn('[NOTIFICATION_FAILED]', { notificationId, reason, ...context })
}

export function captureFailedWebhook(
  provider: string,
  referenceId: string,
  reason: string,
): void {
  // TODO: Sentry.captureMessage(`Webhook failed: ${provider}/${referenceId}`, { level: 'error', extra: { reason } })
  console.error('[WEBHOOK_FAILED]', { provider, referenceId, reason })
}

// ─── Timing helper ────────────────────────────────────────────────────────────

export function startTimer(): () => number {
  const t0 = Date.now()
  return () => Date.now() - t0
}
