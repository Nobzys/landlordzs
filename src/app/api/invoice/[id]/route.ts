// ─── Invoice download route ───────────────────────────────────────────────────
// GET /api/invoice/[id]
// Returns an HTML invoice page that users can print/save as PDF.
// Only accessible to the invoice owner.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatXAF, formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export async function GET(
  _req:     NextRequest,
  context:  { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  const { data: invoice } = await (supabase as any)
    .from('invoices')
    .select('*, subscription:subscriptions(plan:subscription_plans(name, billing_type))')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle() as {
      data: {
        id:              string
        amount:          number
        currency:        string
        status:          string
        issued_at:       string
        paid_at:         string | null
        subscription?:   { plan?: { name: string; billing_type: string } | null } | null
      } | null
    }

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('full_name, display_name, email, phone')
    .eq('id', user.id)
    .maybeSingle() as { data: { full_name: string | null; display_name: string | null; email: string; phone: string | null } | null }

  const displayName = profile?.display_name ?? profile?.full_name ?? profile?.email ?? 'Customer'
  const planName    = invoice.subscription?.plan?.name ?? 'Subscription'
  const shortId     = invoice.id.slice(0, 8).toUpperCase()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${shortId} — LANDLORDZS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #111; background: #fff; padding: 48px; max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .brand { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
    .brand span { color: #6366f1; }
    .invoice-label { text-align: right; }
    .invoice-label h2 { font-size: 28px; font-weight: 700; color: #6366f1; }
    .invoice-label p { color: #64748b; font-size: 13px; margin-top: 4px; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .section { margin-bottom: 32px; }
    .section h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 8px; }
    .bill-to p { font-size: 14px; line-height: 1.8; color: #334155; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    thead th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    tbody td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .total-row { background: #f8fafc; }
    .total-row td { font-weight: 700; font-size: 16px; padding: 14px 12px; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: ${invoice.status === 'paid' ? '#d1fae5' : '#fef3c7'}; color: ${invoice.status === 'paid' ? '#065f46' : '#92400e'}; }
    .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #94a3b8; }
    @media print { body { padding: 24px; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">LANDLORD<span>ZS</span></div>
      <p style="color:#64748b;font-size:13px;margin-top:4px;">Cameroon Real Estate Platform</p>
    </div>
    <div class="invoice-label">
      <h2>INVOICE</h2>
      <p>#${shortId}</p>
      <p style="margin-top:8px;"><span class="status-badge">${invoice.status.toUpperCase()}</span></p>
    </div>
  </div>

  <hr class="divider" />

  <div style="display:flex;justify-content:space-between;gap:32px;margin-bottom:32px;">
    <div class="section">
      <h3>Billed To</h3>
      <div class="bill-to">
        <p><strong>${displayName}</strong></p>
        ${profile?.email ? `<p>${profile.email}</p>` : ''}
        ${profile?.phone ? `<p>${profile.phone}</p>` : ''}
      </div>
    </div>
    <div class="section" style="text-align:right;">
      <h3>Invoice Details</h3>
      <div class="bill-to">
        <p><strong>Issue date:</strong> ${formatDate(invoice.issued_at)}</p>
        ${invoice.paid_at ? `<p><strong>Paid date:</strong> ${formatDate(invoice.paid_at)}</p>` : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${planName}</td>
        <td style="text-align:right;">${formatXAF(invoice.amount)}</td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td style="text-align:right;">${formatXAF(invoice.amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top:4px;">LANDLORDZS · Cameroon · support@landlordzs.com</p>
  </div>

  <script>
    // Auto-trigger print dialog when opened directly
    if (window.location.search.includes('print=1')) {
      window.addEventListener('load', () => window.print())
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type':        'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="invoice-${shortId}.html"`,
    },
  })
}
