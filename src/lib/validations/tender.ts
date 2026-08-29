import { z } from 'zod'

export const TENDER_STATUS_VALUES = ['draft', 'published', 'closed', 'awarded', 'cancelled'] as const
export const BID_STATUS_VALUES    = ['submitted', 'shortlisted', 'awarded', 'rejected', 'withdrawn'] as const

export const createTenderSchema = z.object({
  title:               z.string().min(1, 'Title is required').max(300),
  description:         z.string().min(1, 'Description is required').max(5000),
  scope_of_work:       z.string().max(3000).optional(),
  requirements:        z.string().max(3000).optional(),
  category:            z.string().max(100).optional(),
  city:                z.string().max(100).nullable().optional(),
  address:             z.string().max(500).optional(),
  budget_min:          z.preprocess(v => (!v || v === '' ? null : v), z.coerce.number().int().min(0).nullable().optional()),
  budget_max:          z.preprocess(v => (!v || v === '' ? null : v), z.coerce.number().int().min(0).nullable().optional()),
  submission_deadline: z.string().min(1, 'Submission deadline is required'),
  start_date:          z.preprocess(v => (!v || v === '' ? null : v), z.string().nullable().optional()),
  completion_date:     z.preprocess(v => (!v || v === '' ? null : v), z.string().nullable().optional()),
})

export const submitTenderBidSchema = z.object({
  tender_id:     z.string().uuid(),
  amount:        z.coerce.number().int().min(1, 'Bid amount is required'),
  timeline_days: z.preprocess(v => (!v || v === '' ? null : v), z.coerce.number().int().min(1).nullable().optional()),
  proposal:      z.string().min(1, 'Proposal is required').max(5000),
})

export const updateTenderStatusSchema = z.object({
  tender_id:  z.string().uuid(),
  status:     z.enum(TENDER_STATUS_VALUES),
  awarded_to: z.string().uuid().optional(),
})

export type CreateTenderInput       = z.infer<typeof createTenderSchema>
export type SubmitTenderBidInput    = z.infer<typeof submitTenderBidSchema>
export type UpdateTenderStatusInput = z.infer<typeof updateTenderStatusSchema>
