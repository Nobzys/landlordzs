import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Database, HardDrive, RefreshCw, AlertTriangle, CheckCircle2, BookOpen } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'Backups — Admin' }
export const dynamic = 'force-dynamic'

export default async function BackupsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')

  const adminClient = createAdminClient()

  // Approximate data volume for context
  let userCount = 0
  let propertyCount = 0
  try {
    const [ur, pr] = await Promise.all([
      (adminClient as any).from('profiles').select('id', { count: 'exact', head: true }),
      (adminClient as any).from('properties').select('id', { count: 'exact', head: true }),
    ])
    userCount     = ur.count ?? 0
    propertyCount = pr.count ?? 0
  } catch {
    // Non-fatal
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Backup Status</h1>
          <p className="text-sm text-muted-foreground">Database and storage backup management</p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-800 text-sm">Action required: Enable automated backups</p>
          <p className="text-sm text-amber-700">
            Supabase automated backups must be enabled in your project dashboard. Daily backups are available
            on Pro plans and above. Point-in-time recovery (PITR) requires an Enterprise plan.
          </p>
          <a
            href="https://supabase.com/dashboard/project/_/settings/backups"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1 text-sm font-medium text-amber-800 underline hover:text-amber-900"
          >
            Open Supabase Backup Settings →
          </a>
        </div>
      </div>

      {/* Data volume summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'User Profiles',  value: userCount.toLocaleString(),     icon: <Database className="h-5 w-5" /> },
          { label: 'Properties',     value: propertyCount.toLocaleString(),  icon: <HardDrive className="h-5 w-5" /> },
          { label: 'Last Checked',   value: formatDate(new Date().toISOString()), icon: <RefreshCw className="h-5 w-5" /> },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              {stat.icon}
              <p className="text-sm">{stat.label}</p>
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Backup procedures */}
      <div className="space-y-4">
        {/* Database backups */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Database Backup Procedure</h2>
          </div>
          <div className="p-5 space-y-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-medium">Automated (Recommended)</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Log into <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline">supabase.com/dashboard</a></li>
                <li>Navigate to your project → Settings → Database → Backups</li>
                <li>Enable &ldquo;Daily backups&rdquo; (requires Pro plan)</li>
                <li>Optionally enable Point-in-Time Recovery (PITR) for continuous backup</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Manual Backup via CLI</h3>
              <div className="rounded-lg bg-muted p-3 font-mono text-xs space-y-1">
                <p className="text-muted-foreground"># Install Supabase CLI</p>
                <p>npm install -g supabase</p>
                <br />
                <p className="text-muted-foreground"># Login and link project</p>
                <p>supabase login</p>
                <p>supabase link --project-ref YOUR_PROJECT_REF</p>
                <br />
                <p className="text-muted-foreground"># Create a manual backup (downloads locally)</p>
                <p>supabase db dump --file backup-$(date +%Y%m%d).sql</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Restore Procedure</h3>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <strong>Warning:</strong> Restoring from backup will overwrite current data.
                Always take a fresh backup before restoring. Never restore to production
                without testing on a staging environment first.
              </div>
              <div className="rounded-lg bg-muted p-3 font-mono text-xs space-y-1">
                <p className="text-muted-foreground"># Restore from a SQL dump (staging first!)</p>
                <p>psql --host=db.YOUR_PROJECT.supabase.co \</p>
                <p>  --port=5432 \</p>
                <p>  --username=postgres \</p>
                <p>  --dbname=postgres \</p>
                <p>  --file=backup-YYYYMMDD.sql</p>
              </div>
            </div>
          </div>
        </div>

        {/* Storage backups */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Storage Backup Procedure</h2>
          </div>
          <div className="p-5 space-y-4 text-sm">
            <p className="text-muted-foreground">
              Files in Supabase Storage (avatars, property images, KYC documents, project images) are stored in
              object storage. Supabase does not automatically back up storage objects — you must configure this separately.
            </p>

            <div className="space-y-2">
              <h3 className="font-medium">Sync to External Storage</h3>
              <div className="rounded-lg bg-muted p-3 font-mono text-xs space-y-1">
                <p className="text-muted-foreground"># Using rclone to sync to S3-compatible storage</p>
                <p>rclone sync supabase-storage:landlordzs-bucket \</p>
                <p>  s3:your-backup-bucket/storage-$(date +%Y%m%d)/</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Storage Buckets to Back Up</h3>
              <ul className="space-y-1 text-muted-foreground">
                {['avatars', 'property-images', 'kyc-documents', 'project-images', 'vendor-media'].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <code className="text-xs">{b}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Recovery checklist */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Recovery Runbook</h2>
          </div>
          <div className="p-5">
            <ol className="space-y-3 text-sm">
              {[
                'Stop all incoming traffic (put maintenance page in place)',
                'Identify the last known-good backup timestamp',
                'Test restore on a clone/staging environment first',
                'Verify all migrations applied correctly on restored DB',
                'Check that storage files are accessible (run health check)',
                'Re-enable Row Level Security policies if dropped during restore',
                'Perform smoke tests: auth, property listing, payment flow',
                'Notify users of any data loss window via in-app announcement',
                'Restore production traffic gradually (canary)',
                'Document incident and update backup frequency if needed',
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
