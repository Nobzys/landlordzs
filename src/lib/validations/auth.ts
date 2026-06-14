import { z } from 'zod'

const CAMEROON_PHONE_RE = /^\+237[6-9][0-9]{8}$/

// â”€â”€â”€ Login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

// â”€â”€â”€ Register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirm_password: z.string(),
    role: z.enum(
      ['buyer', 'seller', 'agent', 'vendor', 'contractor', 'engineer', 'architect', 'lawyer'] as const,
      { error: 'Please select your account type' }
    ),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

// â”€â”€â”€ Forgot password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// â”€â”€â”€ Reset password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// â”€â”€â”€ Phone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const phoneSchema = z.object({
  phone: z
    .string()
    .regex(
      CAMEROON_PHONE_RE,
      'Enter a valid Cameroon number: +237 6X XXX XXXX'
    ),
})

export type PhoneInput = z.infer<typeof phoneSchema>

export const phoneOtpSchema = z.object({
  phone: z.string(),
  token: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
})

export type PhoneOtpInput = z.infer<typeof phoneOtpSchema>

// â”€â”€â”€ Basic profile (onboarding step 1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const basicProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name is too long')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(CAMEROON_PHONE_RE, 'Enter a valid Cameroon number: +237 6X XXX XXXX')
    .optional()
    .or(z.literal('')),
  city: z.enum(
    ['yaounde', 'douala', 'buea', 'bamenda', 'limbe', 'kribi',
     'bafoussam', 'ngaoundere', 'maroua', 'bertoua', 'ebolowa', 'kumba'] as const,
    { error: 'Please select your city' }
  ),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional().or(z.literal('')),
})

export type BasicProfileInput = z.infer<typeof basicProfileSchema>

// â”€â”€â”€ Role-specific profiles (onboarding step 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CAMEROON_CITIES = [
  'yaounde', 'douala', 'buea', 'bamenda', 'limbe', 'kribi',
  'bafoussam', 'ngaoundere', 'maroua', 'bertoua', 'ebolowa', 'kumba',
] as const

export const agentProfileSchema = z.object({
  agency_name:      z.string().max(100).optional().or(z.literal('')),
  license_number:   z.string().max(100).optional().or(z.literal('')),
  specializations:  z.array(z.string()).min(1, 'Select at least one specialization'),
  service_areas:    z.array(z.enum(CAMEROON_CITIES)).optional().default([]),
  experience_years: z.coerce.number().min(0).max(50),
  commission_rate:  z.coerce.number().min(0).max(20).optional(),
})

export type AgentProfileInput = z.infer<typeof agentProfileSchema>

export const vendorProfileSchema = z.object({
  store_name:        z.string().min(2, 'Store name required').max(100),
  store_description: z.string().max(500).optional().or(z.literal('')),
})

export type VendorProfileInput = z.infer<typeof vendorProfileSchema>

export const professionalProfileSchema = z.object({
  company_name:     z.string().max(100).optional().or(z.literal('')),
  license_number:   z.string().max(100).optional().or(z.literal('')),
  specializations:  z.array(z.string()).min(1, 'Select at least one specialization'),
  service_areas:    z.array(z.enum(CAMEROON_CITIES)).optional().default([]),
  experience_years: z.coerce.number().min(0).max(50),
  day_rate:         z.coerce.number().min(0).optional(),
})

export type ProfessionalProfileInput = z.infer<typeof professionalProfileSchema>

// Seller and buyer have no extra role profile (preferences added later in account)
export const sellerProfileSchema  = z.object({})
export const buyerProfileSchema   = z.object({})
