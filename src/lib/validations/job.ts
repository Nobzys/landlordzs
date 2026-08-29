import { z } from 'zod'

export const JOB_TYPE_VALUES    = ['full_time', 'part_time', 'contract', 'freelance', 'internship'] as const
export const JOB_STATUS_VALUES  = ['draft', 'active', 'closed', 'expired', 'filled'] as const
export const APP_STATUS_VALUES  = [
  'submitted', 'reviewed', 'shortlisted', 'interviewed', 'accepted', 'rejected', 'withdrawn',
] as const
export const SALARY_PERIOD_VALUES = ['hour', 'day', 'week', 'month', 'year'] as const

const optionalUrl = z.preprocess(
  v => (!v || v === '' ? null : v),
  z.string().url('Must be a valid URL').max(500).nullable().optional()
)

export const createJobSchema = z.object({
  title:                z.string().min(1, 'Title is required').max(300),
  description:          z.string().min(1, 'Description is required').max(5000),
  requirements:         z.string().max(3000).optional(),
  responsibilities:     z.string().max(3000).optional(),
  category:             z.string().max(100).optional(),
  job_type:             z.enum(JOB_TYPE_VALUES),
  city:                 z.string().max(100).nullable().optional(),
  is_remote:            z.preprocess(v => v === 'on' || v === true, z.boolean()).default(false),
  salary_min:           z.preprocess(v => (!v || v === '' ? null : v), z.coerce.number().int().min(0).nullable().optional()),
  salary_max:           z.preprocess(v => (!v || v === '' ? null : v), z.coerce.number().int().min(0).nullable().optional()),
  salary_period:        z.enum(SALARY_PERIOD_VALUES).default('month'),
  experience_years_min: z.coerce.number().int().min(0).default(0),
  deadline:             z.preprocess(v => (!v || v === '' ? null : v), z.string().nullable().optional()),
})

export const applyToJobSchema = z.object({
  job_id:          z.string().uuid(),
  cover_letter:    z.string().max(3000).optional(),
  cv_url:          optionalUrl,
  portfolio_url:   optionalUrl,
  expected_salary: z.preprocess(v => (!v || v === '' ? null : v), z.coerce.number().int().min(0).nullable().optional()),
})

export const updateJobStatusSchema = z.object({
  job_id:  z.string().uuid(),
  status:  z.enum(JOB_STATUS_VALUES),
})

export const updateApplicationStatusSchema = z.object({
  application_id: z.string().uuid(),
  status:         z.enum(APP_STATUS_VALUES),
})

export type CreateJobInput             = z.infer<typeof createJobSchema>
export type ApplyToJobInput            = z.infer<typeof applyToJobSchema>
export type UpdateJobStatusInput       = z.infer<typeof updateJobStatusSchema>
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>
