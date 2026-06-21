import { z } from 'zod'

export const productCreateSchema = z.object({
  name:           z.string().min(3, 'Name must be at least 3 characters').max(150),
  description:    z.string().max(3000).optional(),
  sku:            z.string().max(60).optional(),
  brand:          z.string().max(80).optional(),
  category_id:    z.string().uuid().optional(),
  price:          z.coerce.number({ error: 'Price is required' }).positive('Price must be positive').int(),
  original_price: z.coerce.number().int().positive().optional(),
  stock_qty:      z.coerce.number().int().min(0).default(0),
  min_order_qty:  z.coerce.number().int().min(1).default(1),
  unit:           z.string().max(30).default('unit'),
  is_active:      z.boolean().default(true),
})

export type ProductCreateInput = z.infer<typeof productCreateSchema>

export const storeSettingsSchema = z.object({
  store_name:        z.string().min(2, 'Store name must be at least 2 characters').max(100),
  store_description: z.string().max(2000).optional(),
  phone:             z.string().max(30).optional(),
  email:             z.string().email().optional().or(z.literal('')),
  website:           z.string().max(200).optional(),
  address:           z.string().max(200).optional(),
  business_hours:    z.string().max(500).optional(),
  delivery_areas:    z.array(z.string()).default([]),
})

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>

export const businessSettingsSchema = z.object({
  business_reg: z.string().max(80).optional(),
  tax_id:       z.string().max(80).optional(),
})

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>
