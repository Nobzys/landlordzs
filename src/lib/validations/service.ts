import { z } from 'zod'

export const createServiceRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150, 'Title is too long'),
  description: z.string().min(20, 'Please describe your project in detail (min 20 chars)').max(2000),
  category_id: z.string().uuid().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  budget_min: z.coerce.number().int().min(0).optional().nullable(),
  budget_max: z.coerce.number().int().min(0).optional().nullable(),
  deadline: z.string().optional().or(z.literal('')),
})

export const submitQuotationSchema = z.object({
  request_id: z.string().uuid('Invalid request ID'),
  amount: z.coerce.number().int().min(1, 'Amount must be at least 1 XAF'),
  timeline_days: z.coerce.number().int().min(1).max(365).optional().nullable(),
  proposal: z.string().min(20, 'Please describe your approach (min 20 chars)').max(2000),
})

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>
export type SubmitQuotationInput = z.infer<typeof submitQuotationSchema>
