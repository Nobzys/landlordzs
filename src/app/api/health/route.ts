import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  checks: Record<string, 'ok' | 'error' | 'unknown'>
  latencyMs: number
  version: string
  timestamp: string
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const t0 = Date.now()
  const checks: Record<string, 'ok' | 'error' | 'unknown'> = {}

  // ── Database connectivity ──────────────────────────────────────────────────
  try {
    const adminClient = createAdminClient()
    await (adminClient as any)
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  // ── Storage connectivity ───────────────────────────────────────────────────
  try {
    const adminClient = createAdminClient()
    await adminClient.storage.listBuckets()
    checks.storage = 'ok'
  } catch {
    checks.storage = 'error'
  }

  // ── Environment variables ──────────────────────────────────────────────────
  const requiredEnv = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  checks.environment = requiredEnv.every((k) => !!process.env[k]) ? 'ok' : 'error'

  const allOk      = Object.values(checks).every((v) => v === 'ok')
  const anyDown    = Object.values(checks).some((v) => v === 'error')
  const statusCode = allOk ? 200 : anyDown ? 503 : 200

  const payload: HealthStatus = {
    status:    allOk ? 'ok' : anyDown ? 'degraded' : 'ok',
    checks,
    latencyMs: Date.now() - t0,
    version:   process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(payload, { status: statusCode })
}
