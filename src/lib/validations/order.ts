import { z } from 'zod'

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity:  z.coerce.number().int().min(1).max(9999),
})

export const updateCartQuantitySchema = z.object({
  cartItemId: z.string().uuid(),
  quantity:   z.coerce.number().int().min(1).max(9999),
})

export const removeFromCartSchema = z.object({
  cartItemId: z.string().uuid(),
})

export const shippingSchema = z.object({
  shipping_name:    z.string().min(1, 'Full name is required').max(200),
  shipping_phone:   z.string().min(1, 'Phone number is required').max(30),
  shipping_address: z.string().min(1, 'Delivery address is required').max(500),
  shipping_city:    z.string().min(1, 'City is required').max(100),
  notes:            z.string().max(1000).optional(),
})

export const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
})

export type AddToCartInput          = z.infer<typeof addToCartSchema>
export type UpdateCartQuantityInput = z.infer<typeof updateCartQuantitySchema>
export type ShippingInput           = z.infer<typeof shippingSchema>
export type CancelOrderInput        = z.infer<typeof cancelOrderSchema>
