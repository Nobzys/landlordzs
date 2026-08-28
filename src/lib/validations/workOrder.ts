import { z } from 'zod'

export const createWorkOrderSchema = z.object({
  propertyId:  z.string().uuid('Invalid property ID'),
  workerId:    z.string().uuid('Invalid worker ID'),
  title:       z.string().min(5, 'Title must be at least 5 characters').max(150, 'Title is too long'),
  description: z.string().min(10, 'Please describe the work required (at least 10 characters)').max(2000),
  priority:    z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  category:    z.string().max(100).optional().nullable(),
  dueDate:     z.string().optional().nullable(),
})

export const completeWorkOrderSchema = z.object({
  completionNotes: z.string().max(2000).optional().nullable(),
  photoUrls:       z.array(z.string()).default([]),
  partsCostXaf:    z.coerce.number().int().min(0).optional().nullable(),
})

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>
export type CompleteWorkOrderInput = z.infer<typeof completeWorkOrderSchema>
