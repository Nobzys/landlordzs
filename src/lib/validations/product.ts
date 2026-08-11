import { z } from 'zod'

export const PRODUCT_UNITS = [
  'unit', 'kg', 'g', 'tonne',
  'm', 'cm', 'mm', 'm2', 'm3',
  'litre', 'bag', 'pack', 'box', 'roll', 'sheet', 'piece',
] as const satisfies readonly string[]

export type ProductUnit = (typeof PRODUCT_UNITS)[number]

export const productSchema = z.object({
  name:           z.string().min(3, 'Name must be at least 3 characters').max(200),
  name_fr:        z.string().max(200).optional(),
  description:    z.string().max(3000).optional(),
  sku:            z.string().max(100).optional(),
  brand:          z.string().max(100).optional(),
  price:          z.number({ message: 'Price is required' })
                   .int('Price must be a whole number in XAF')
                   .nonnegative('Price must not be negative'),
  original_price: z.number().int().nonnegative().optional(),
  stock_qty:      z.number().int().nonnegative().default(0),
  min_order_qty:  z.number().int().positive().default(1),
  unit:           z.enum(PRODUCT_UNITS).default('unit'),
  category_id:    z.string().uuid().optional(),
  is_available:   z.boolean().default(true),
})

export type ProductInput = z.infer<typeof productSchema>
