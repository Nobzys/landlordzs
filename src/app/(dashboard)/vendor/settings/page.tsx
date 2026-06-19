import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, getServerProfile } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/utils/account-status'
import { BusinessSettingsForm } from '@/components/marketplace/BusinessSettingsForm'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Settings — Vendor' }

export default async function VendorSettingsPage() {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'vendor') redirect('/login')
  requireActiveProfile(profile)

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vendor } = await (supabase as any)
    .from('vendor_profiles')
    .select('business_reg, tax_id')
    .eq('id', profile.id)
    .single() as { data: { business_reg: string | null; tax_id: string | null } | null }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Business registration and account security.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Business Details</CardTitle></CardHeader>
        <CardContent>
          <BusinessSettingsForm
            initial={{
              business_reg: vendor?.business_reg ?? '',
              tax_id:       vendor?.tax_id        ?? '',
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
