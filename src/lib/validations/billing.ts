import { z } from 'zod'

// ─── Subscribe / pay activation fee ──────────────────────────────────────────

export const subscribePlanSchema = z.object({
  plan_id:  z.string({ error: 'Plan is required' }).uuid('Invalid plan ID'),
  provider: z.enum(['mock', 'stripe', 'paypal', 'mobile_money'], {
    error: 'Invalid payment provider',
  }),
  phone: z.string().optional().nullable(),
})

export type SubscribePlanInput = z.infer<typeof subscribePlanSchema>

// ─── Admin: grant activation ──────────────────────────────────────────────────

export const adminGrantSchema = z.object({
  user_id:    z.string({ error: 'User ID is required' }).uuid('Invalid user ID'),
  expires_at: z.string().optional().nullable(),
  note:       z.string().max(500).optional().nullable(),
})

export type AdminGrantInput = z.infer<typeof adminGrantSchema>

// ─── Toggle auto-renew ────────────────────────────────────────────────────────

export const toggleAutoRenewSchema = z.object({
  subscription_id: z.string({ error: 'Subscription ID is required' }).uuid(),
  auto_renew:      z.boolean(),
})

export type ToggleAutoRenewInput = z.infer<typeof toggleAutoRenewSchema>
