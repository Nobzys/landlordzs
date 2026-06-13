import { z } from 'zod'

const LISTING_TYPES  = ['sale', 'rent', 'shortlet'] as const
const PROPERTY_TYPES = ['villa','apartment','studio','duplex','penthouse','house','commercial_space','office','warehouse','shop','land','farm','hotel'] as const
const LAND_TITLES    = ['titre_foncier','bail_emphyteotique','concession','none'] as const
const CITIES         = ['yaounde','douala','buea','bamenda','limbe','kribi','bafoussam','ngaoundere','maroua','bertoua','ebolowa','kumba'] as const
const INQUIRY_TYPES  = ['general','viewing','offer'] as const

export const propertyBasicSchema = z.object({
  title:        z.string().min(10, 'Title must be at least 10 characters').max(120),
  listing_type: z.enum(LISTING_TYPES),
  property_type:z.enum(PROPERTY_TYPES),
  city:         z.enum(CITIES),
  neighborhood: z.string().max(100).optional(),
  address:      z.string().max(200).optional(),
  price:        z.number({ required_error: 'Price is required' }).positive('Price must be positive').int(),
  is_negotiable:z.boolean().default(false),
  description:  z.string().max(3000).optional(),
})

export const propertyDetailsSchema = z.object({
  bedrooms:      z.number().int().min(0).max(50),
  bathrooms:     z.number().int().min(0).max(50),
  toilets:       z.number().int().min(0).max(50),
  area_sqm:      z.number().positive().optional(),
  land_area_sqm: z.number().positive().optional(),
  land_title:    z.enum(LAND_TITLES),
  year_built:    z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  is_furnished:  z.boolean().default(false),
})

const amenityItemSchema = z.object({
  category:    z.string(),
  name:        z.string(),
  has_feature: z.boolean(),
})

export const propertyFeaturesSchema = z.object({
  has_security:  z.boolean().default(false),
  has_generator: z.boolean().default(false),
  has_borehole:  z.boolean().default(false),
  amenities:     z.array(amenityItemSchema).default([]),
})

export const propertyCreateSchema = propertyBasicSchema
  .merge(propertyDetailsSchema)
  .merge(propertyFeaturesSchema)
  .extend({ agent_id: z.string().uuid().optional() })

export const inquirySchema = z.object({
  name:    z.string().max(100).optional(),
  email:   z.string().email().optional(),
  phone:   z.string().regex(/^\+237[6-9]\d{8}$/, 'Invalid Cameroon phone').optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
  type:    z.enum(INQUIRY_TYPES),
})

export const propertySearchSchema = z.object({
  q:            z.string().optional(),
  listing_type: z.enum(LISTING_TYPES).optional(),
  property_type:z.enum(PROPERTY_TYPES).optional(),
  city:         z.enum(CITIES).optional(),
  min_price:    z.coerce.number().positive().optional(),
  max_price:    z.coerce.number().positive().optional(),
  bedrooms:     z.coerce.number().int().min(0).optional(),
  is_furnished: z.coerce.boolean().optional(),
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(50).default(12),
})

export type PropertyBasicInput    = z.infer<typeof propertyBasicSchema>
export type PropertyDetailsInput  = z.infer<typeof propertyDetailsSchema>
export type PropertyFeaturesInput = z.infer<typeof propertyFeaturesSchema>
export type PropertyCreateInput   = z.infer<typeof propertyCreateSchema>
export type InquiryInput          = z.infer<typeof inquirySchema>
export type PropertySearchInput   = z.infer<typeof propertySearchSchema>
