import { z } from 'zod'

export const createServiceRequestSchema = z.object({
  provider_id:    z.string({ error: 'Provider is required' }).uuid({ error: 'Invalid provider' }),
  request_type:   z.string({ error: 'Request type is required' }).min(1, 'Request type is required'),
  title:          z.string({ error: 'Title is required' }).min(3, 'Title must be at least 3 characters').max(120, 'Title is too long'),
  description:    z.string({ error: 'Description is required' }).min(20, 'Please describe your request in at least 20 characters').max(2000, 'Description is too long'),
  budget_min:     z.number().int().positive().optional().nullable(),
  budget_max:     z.number().int().positive().optional().nullable(),
  preferred_date: z.string().optional().nullable(),
  contact_phone:  z.string().optional().nullable(),
  property_id:    z.string().uuid().optional().nullable(),
})

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>

export const rejectRequestSchema = z.object({
  notes: z.string().max(500, 'Note is too long').optional().nullable(),
})

export type RejectRequestInput = z.infer<typeof rejectRequestSchema>
