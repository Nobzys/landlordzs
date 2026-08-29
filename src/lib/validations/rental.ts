import { z } from 'zod'

const BOOKING_STATUS_VALUES = [
  'pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show',
] as const

export const createRentalListingSchema = z.object({
  name:            z.string().min(1, 'Name is required').max(200),
  description:     z.string().max(2000).optional(),
  type:            z.enum(['equipment', 'vehicle']),
  category_id:     z.string().uuid().nullable().optional(),
  city:            z.string().min(1, 'City is required').max(100),
  address:         z.string().max(500).optional(),
  condition:       z.enum(['new', 'excellent', 'good', 'fair', 'poor']).default('good'),
  daily_rate:      z.coerce.number().int().min(1, 'Daily rate is required'),
  weekly_rate:     z.coerce.number().int().min(1).nullable().optional(),
  monthly_rate:    z.coerce.number().int().min(1).nullable().optional(),
  deposit_amount:  z.coerce.number().int().min(0).default(0),
  min_rental_days: z.coerce.number().int().min(1).default(1),
  max_rental_days: z.coerce.number().int().min(1).nullable().optional(),
  make:            z.string().max(100).optional(),
  model_name:      z.string().max(100).optional(),
  year:            z.coerce.number().int().min(1900).max(2030).nullable().optional(),
})

export const createRentalBookingSchema = z.object({
  listing_id:   z.string().uuid(),
  start_date:   z.string().min(1, 'Start date is required'),
  end_date:     z.string().min(1, 'End date is required'),
  pickup_notes: z.string().max(1000).optional(),
})

export const updateRentalStatusSchema = z.object({
  booking_id: z.string().uuid(),
  status:     z.enum(BOOKING_STATUS_VALUES),
})

export type CreateRentalListingInput = z.infer<typeof createRentalListingSchema>
export type CreateRentalBookingInput = z.infer<typeof createRentalBookingSchema>
export type UpdateRentalStatusInput  = z.infer<typeof updateRentalStatusSchema>
