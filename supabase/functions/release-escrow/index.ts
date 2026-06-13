// Edge Function: release-escrow
// Cron-triggered function that auto-releases escrow accounts
// that have been in 'funded' status for longer than the configured
// release window (default: 30 days per platform_settings).
//
// Schedule via Supabase Dashboard > Edge Functions > Schedule:
//   Cron: 0 2 * * *  (daily at 02:00 UTC)
//
// Also callable manually via POST for admin overrides:
//   POST /functions/v1/release-escrow
//   Body: { escrow_id?: string }  — omit to run the full sweep

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Resolve auto-release window from platform settings
  const { data: setting } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'escrow_auto_release_days')
    .single()

  const releaseDays = parseInt(setting?.value ?? '30', 10)

  let targetIds: string[] = []

  // If called with a specific escrow_id, release that one immediately
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    if (body.escrow_id) {
      targetIds = [body.escrow_id]
    }
  }

  // Otherwise find all eligible funded escrow accounts
  if (targetIds.length === 0) {
    const cutoff = new Date(Date.now() - releaseDays * 86_400_000).toISOString()

    const { data: eligible, error } = await supabase
      .from('escrow_accounts')
      .select('id')
      .eq('status', 'funded')
      .lte('funded_at', cutoff)

    if (error) {
      console.error('escrow query error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    targetIds = (eligible ?? []).map((r: { id: string }) => r.id)
  }

  if (targetIds.length === 0) {
    return new Response(JSON.stringify({ released: 0, ids: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const released: string[] = []
  const failed:   Array<{ id: string; error: string }> = []

  for (const escrowId of targetIds) {
    const { data, error } = await supabase
      .rpc('release_escrow', { p_escrow_id: escrowId })

    if (error) {
      console.error(`release_escrow(${escrowId}) failed:`, error.message)
      failed.push({ id: escrowId, error: error.message })
      continue
    }

    released.push(escrowId)

    // Fire notification to payer and payee
    const { data: escrow } = await supabase
      .from('escrow_accounts')
      .select('payer_id, payee_id, amount, currency')
      .eq('id', escrowId)
      .single()

    if (escrow) {
      const formattedAmount = new Intl.NumberFormat('fr-CM', {
        style: 'currency', currency: escrow.currency,
      }).format(escrow.amount)

      for (const userId of [escrow.payer_id, escrow.payee_id]) {
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: userId,
            type: 'escrow_released',
            title: 'Escrow Released',
            body:  `Your escrow of ${formattedAmount} has been released.`,
            data:  { escrow_id: escrowId },
          },
        })
      }
    }
  }

  console.log(`Escrow sweep: released ${released.length}, failed ${failed.length}`)

  return new Response(
    JSON.stringify({ released: released.length, ids: released, failed }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
