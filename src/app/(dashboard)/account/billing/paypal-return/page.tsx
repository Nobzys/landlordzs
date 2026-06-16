import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { getServerProfile } from '@/lib/supabase/server'
import { confirmPayPalOrder } from '@/lib/actions/billing'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ token?: string; PayerID?: string }>
}

export default async function PayPalReturnPage({ searchParams }: Props) {
  const profile = await getServerProfile()
  if (!profile) redirect('/login')

  const { token: orderId } = await searchParams

  if (!orderId) {
    redirect('/account/billing')
  }

  const result = await confirmPayPalOrder(orderId)

  if (result.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center space-y-4">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment not confirmed</h1>
          <p className="text-muted-foreground">{result.error}</p>
          <a
            href="/account/billing"
            className="inline-block mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Back to Billing
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold">Payment successful</h1>
        <p className="text-muted-foreground">
          Your PayPal payment was confirmed. Your account is now active.
        </p>
        <a
          href="/account/billing"
          className="inline-block mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          View Billing
        </a>
      </div>
    </div>
  )
}
