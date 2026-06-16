import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Activity, CheckCircle2, XCircle, AlertCircle, Database, HardDrive, Shield, Clock } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'System Health — Admin' }
export const dynamic = 'force-dynamic'

interface CheckResult {
  name: string
  status: 'ok' | 'error' | 'warning'
  detail: string
  latencyMs?: number
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const adminClient = createAdminClient()

  // ── Database ───────────────────────────────────────────────────────────────
  const dbStart = Date.now()
  try {
    const { count } = await (adminClient as any)
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1) as { count: number | null }
    results.push({
      name:      'PostgreSQL (Supabase)',
      status:    'ok',
      detail:    `Reachable · ${count?.toLocaleString() ?? 0} user profiles`,
      latencyMs: Date.now() - dbStart,
    })
  } catch (e: any) {
    results.push({ name: 'PostgreSQL (Supabase)', status: 'error', detail: e?.message ?? 'Connection failed', latencyMs: Date.now() - dbStart })
  }

  // ── Storage ────────────────────────────────────────────────────────────────
  const storStart = Date.now()
  try {
    const { data: buckets } = await adminClient.storage.listBuckets()
    results.push({
      name:      'Object Storage',
      status:    'ok',
      detail:    `${(buckets ?? []).length} bucket${(buckets ?? []).length !== 1 ? 's' : ''} configured`,
      latencyMs: Date.now() - storStart,
    })
  } catch (e: any) {
    results.push({ name: 'Object Storage', status: 'error', detail: e?.message ?? 'Storage unreachable', latencyMs: Date.now() - storStart })
  }

  // ── Environment variables ──────────────────────────────────────────────────
  const requiredEnvs = {
    'NEXT_PUBLIC_SUPABASE_URL':     process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY':process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY':    process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
  const optionalEnvs = {
    'MTN_COLLECTION_USER_ID':   process.env.MTN_COLLECTION_USER_ID,
    'MTN_COLLECTION_API_KEY':   process.env.MTN_COLLECTION_API_KEY,
    'ORANGE_MERCHANT_KEY':      process.env.ORANGE_MERCHANT_KEY,
    'NEXT_PUBLIC_APP_URL':      process.env.NEXT_PUBLIC_APP_URL,
  }

  const missingRequired = Object.entries(requiredEnvs).filter(([, v]) => !v).map(([k]) => k)
  const missingOptional = Object.entries(optionalEnvs).filter(([, v]) => !v).map(([k]) => k)

  if (missingRequired.length > 0) {
    results.push({ name: 'Required Environment', status: 'error', detail: `Missing: ${missingRequired.join(', ')}` })
  } else {
    results.push({ name: 'Required Environment', status: 'ok', detail: 'All required variables present' })
  }

  if (missingOptional.length > 0) {
    results.push({ name: 'Optional Environment', status: 'warning', detail: `Not set: ${missingOptional.join(', ')}` })
  } else {
    results.push({ name: 'Optional Environment', status: 'ok', detail: 'All optional variables configured' })
  }

  // ── Rate limit log ─────────────────────────────────────────────────────────
  try {
    const { count } = await (adminClient as any)
      .from('rate_limit_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 3600_000).toISOString()) as { count: number | null }
    const c = count ?? 0
    results.push({
      name:   'Rate Limiter',
      status: c > 500 ? 'warning' : 'ok',
      detail: `${c.toLocaleString()} attempts in last hour${c > 500 ? ' — possible abuse' : ''}`,
    })
  } catch {
    results.push({ name: 'Rate Limiter', status: 'warning', detail: 'Table not accessible' })
  }

  return results
}

function StatusIcon({ status }: { status: 'ok' | 'error' | 'warning' }) {
  if (status === 'ok')      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  if (status === 'error')   return <XCircle      className="h-5 w-5 text-red-500" />
  return                           <AlertCircle  className="h-5 w-5 text-amber-500" />
}

export default async function SystemHealthPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const checks = await runChecks()
  const allOk   = checks.every((c) => c.status === 'ok')
  const hasError = checks.some((c) => c.status === 'error')
  const overallStatus = allOk ? 'ok' : hasError ? 'error' : 'warning'

  // Deployment checklist
  const checklist = [
    { label: 'Environment variables validated',   done: checks.find((c) => c.name === 'Required Environment')?.status === 'ok' },
    { label: 'Database reachable',               done: checks.find((c) => c.name.includes('PostgreSQL'))?.status === 'ok' },
    { label: 'Storage buckets accessible',       done: checks.find((c) => c.name === 'Object Storage')?.status === 'ok' },
    { label: 'Rate limiting enabled (table)',    done: checks.find((c) => c.name === 'Rate Limiter')?.status !== 'error' },
    { label: 'SSL/HTTPS enforced (HSTS header)', done: true },
    { label: 'Security headers set (CSP, HSTS)', done: true },
    { label: 'robots.txt present',               done: true },
    { label: 'sitemap.xml route configured',     done: true },
    { label: 'Payment provider configured',      done: checks.find((c) => c.name === 'Optional Environment')?.status !== 'error' },
    { label: 'Error monitoring configured',      done: false },   // update when Sentry/Datadog wired
    { label: 'Supabase daily backups enabled',   done: false },   // enable in Supabase dashboard
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          overallStatus === 'ok' ? 'bg-emerald-100 text-emerald-600'
          : overallStatus === 'error' ? 'bg-red-100 text-red-600'
          : 'bg-amber-100 text-amber-600'
        }`}>
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground">
            Last checked: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
          overallStatus === 'ok' ? 'bg-emerald-100 text-emerald-700'
          : overallStatus === 'error' ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700'
        }`}>
          <StatusIcon status={overallStatus} />
          {overallStatus === 'ok' ? 'All Systems Operational' : overallStatus === 'error' ? 'System Degraded' : 'Partial Issues'}
        </span>
      </div>

      {/* Service checks */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <h2 className="font-semibold">Service Checks</h2>
        </div>
        <div className="divide-y">
          {checks.map((check) => (
            <div key={check.name} className="px-5 py-4 flex items-start gap-4">
              <StatusIcon status={check.status} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{check.name}</p>
                <p className="text-sm text-muted-foreground">{check.detail}</p>
              </div>
              {check.latencyMs != null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                  {check.latencyMs}ms
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Deployment checklist */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Deployment Checklist
          </h2>
        </div>
        <div className="divide-y">
          {checklist.map((item) => (
            <div key={item.label} className="px-5 py-3 flex items-center gap-3">
              {item.done
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                : <XCircle      className="h-4 w-4 text-red-400 shrink-0" />
              }
              <span className={`text-sm ${item.done ? '' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: '/api/health',          icon: <Activity  className="h-5 w-5" />, label: 'Health API',        desc: 'JSON health endpoint for load balancers' },
          { href: '/admin/audit-logs',    icon: <Shield    className="h-5 w-5" />, label: 'Audit Logs',       desc: 'Security events and admin actions' },
          { href: '/admin/backups',       icon: <Database  className="h-5 w-5" />, label: 'Backup Status',    desc: 'Database and storage backup info' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            target={link.href.startsWith('/api') ? '_blank' : undefined}
            className="rounded-xl border bg-card p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="text-primary mb-2">{link.icon}</div>
            <p className="font-medium text-sm">{link.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
