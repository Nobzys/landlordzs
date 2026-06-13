import { z } from 'zod'

const MOBILE_PROVIDERS = ['mtn_momo', 'orange_money'] as const
const ALL_PROVIDERS    = [...MOBILE_PROVIDERS, 'wallet', 'bank_transfer', 'cash'] as const

const CAMEROON_PHONE = /^\+237[6-9]\d{8}$/
const MTN_PREFIXES   = ['650', '651', '652', '653', '654', '670', '671', '672', '673', '674', '680', '681', '682', '683', '684']
const ORANGE_PREFIXES= ['655', '656', '657', '658', '659', '675', '676', '677', '678', '679']

function isMtnPhone(phone: string): boolean {
  const local = phone.replace('+237', '')
  return MTN_PREFIXES.some(p => local.startsWith(p))
}

function isOrangePhone(phone: string): boolean {
  const local = phone.replace('+237', '')
  return ORANGE_PREFIXES.some(p => local.startsWith(p))
}

export const initiatePaymentSchema = z.object({
  amount: z.number().int().positive('Amount must be positive').min(100, 'Minimum payment is 100 XAF'),
  provider: z.enum([...MOBILE_PROVIDERS, 'wallet'] as ['mtn_momo', 'orange_money', 'wallet']),
  phone: z.string().regex(CAMEROON_PHONE, 'Invalid Cameroon phone number').optional(),
  reference_type: z.string().optional(),
  reference_id:   z.string().uuid().optional(),
  escrow_id:      z.string().uuid().optional(),
  description:    z.string().max(200).optional(),
  transaction_type: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.provider === 'mtn_momo' && !val.phone) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'MTN phone number is required' })
  }
  if (val.provider === 'orange_money' && !val.phone) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Orange Money phone number is required' })
  }
  if (val.provider === 'mtn_momo' && val.phone && !isMtnPhone(val.phone)) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Number does not appear to be an MTN number' })
  }
  if (val.provider === 'orange_money' && val.phone && !isOrangePhone(val.phone)) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Number does not appear to be an Orange number' })
  }
})

export const requestPayoutSchema = z.object({
  amount:   z.number().int().positive().min(1000, 'Minimum payout is 1,000 XAF'),
  provider: z.enum(MOBILE_PROVIDERS),
  phone:    z.string().regex(CAMEROON_PHONE, 'Invalid Cameroon phone number'),
  name:     z.string().max(100).optional(),
}).superRefine((val, ctx) => {
  if (val.provider === 'mtn_momo' && !isMtnPhone(val.phone)) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Number does not appear to be an MTN number' })
  }
  if (val.provider === 'orange_money' && !isOrangePhone(val.phone)) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Number does not appear to be an Orange number' })
  }
})

export const createEscrowSchema = z.object({
  payee_id:       z.string().uuid(),
  amount:         z.number().int().positive().min(10000, 'Minimum escrow is 10,000 XAF'),
  reference_type: z.string(),
  reference_id:   z.string().uuid(),
  description:    z.string().max(500).optional(),
  milestones: z.array(z.object({
    title:       z.string().min(3).max(200),
    description: z.string().max(500).optional(),
    amount:      z.number().int().positive(),
    due_date:    z.string().optional(),
  })).optional(),
})

export const disputeEscrowSchema = z.object({
  reason: z.string().min(20, 'Please provide a detailed reason').max(1000),
})

export const completeMilestoneSchema = z.object({
  milestone_id:  z.string().uuid(),
  evidence_urls: z.array(z.string().url()).optional(),
  notes:         z.string().max(500).optional(),
})

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>
export type RequestPayoutInput   = z.infer<typeof requestPayoutSchema>
export type CreateEscrowInput    = z.infer<typeof createEscrowSchema>
export type DisputeEscrowInput   = z.infer<typeof disputeEscrowSchema>
export type CompleteMilestoneInput = z.infer<typeof completeMilestoneSchema>
