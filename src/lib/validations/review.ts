import { z } from 'zod'

export const createReviewSchema = z.object({
  service_request_id: z.string().uuid('Invalid service request'),
  rating: z.coerce.number().int().min(1, 'Rating is required').max(5),
  title: z.string().max(120, 'Title is too long').optional().or(z.literal('')),
  body: z.string().max(2000, 'Review is too long').optional().or(z.literal('')),
  cleanliness: z.coerce.number().int().min(1).max(5).optional(),
  communication: z.coerce.number().int().min(1).max(5).optional(),
  value: z.coerce.number().int().min(1).max(5).optional(),
  accuracy: z.coerce.number().int().min(1).max(5).optional(),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
