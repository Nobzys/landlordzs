// Edge Function: send-notification
// Dispatches push, email, and SMS notifications for platform events.
// Invoked by DB triggers via pg_net or directly from server-side code.
//
// Request body:
//   { user_id, type, title, body, data?, channels? }
// Supported channels: push | email | sms (defaults to all enabled prefs)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
const EXPO_PUSH_URL   = 'https://exp.host/--/api/v2/push/send'

interface NotificationPayload {
  user_id:  string
  type:     string
  title:    string
  body:     string
  data?:    Record<string, unknown>
  channels?: ('push' | 'email' | 'sms')[]
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let payload: NotificationPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { user_id, type, title, body, data = {}, channels } = payload
  if (!user_id || !type || !title || !body) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Fetch user profile + notification preferences
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, expo_push_token')
    .eq('id', user_id)
    .single()

  if (profileErr || !profile) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('email_enabled, push_enabled, sms_enabled')
    .eq('user_id', user_id)
    .single()

  const enabledChannels = channels ?? (['push', 'email', 'sms'] as const)
  const results: Record<string, string> = {}

  // ── Persist notification row ─────────────────────────────────────────────
  const { error: insertErr } = await supabase.from('notifications').insert({
    user_id,
    type,
    title,
    body,
    data,
  })
  if (insertErr) console.error('notification insert error:', insertErr.message)

  // ── Push (Expo) ──────────────────────────────────────────────────────────
  if (
    enabledChannels.includes('push') &&
    prefs?.push_enabled &&
    profile.expo_push_token
  ) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.expo_push_token,
          title,
          body,
          data,
          sound: 'default',
        }),
      })
      results.push = res.ok ? 'sent' : `failed:${res.status}`
    } catch (e) {
      results.push = `error:${(e as Error).message}`
    }
  }

  // ── Email (Resend) ───────────────────────────────────────────────────────
  if (
    enabledChannels.includes('email') &&
    prefs?.email_enabled &&
    profile.email &&
    RESEND_API_KEY
  ) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LANDLORDZS <noreply@landlordzs.com>',
          to:   profile.email,
          subject: title,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#1e293b">${title}</h2>
              <p style="color:#475569">${body}</p>
              <hr style="border:none;border-top:1px solid #e2e8f0"/>
              <p style="font-size:12px;color:#94a3b8">
                LANDLORDZS — Cameroon's Real Estate Marketplace<br/>
                <a href="https://landlordzs.com/unsubscribe?uid=${user_id}">Unsubscribe</a>
              </p>
            </div>
          `,
        }),
      })
      results.email = res.ok ? 'sent' : `failed:${res.status}`
    } catch (e) {
      results.email = `error:${(e as Error).message}`
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
