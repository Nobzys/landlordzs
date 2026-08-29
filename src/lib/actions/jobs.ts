'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createJobSchema,
  applyToJobSchema,
  updateJobStatusSchema,
} from '@/lib/validations/job'

type JobRow = {
  id:        string
  poster_id: string
  status:    string
  title:     string
}

// ─── createJob ──────────────────────────────────────────────────────────────
// Any authenticated user may post a job. Inserts with status = 'draft';
// the poster calls updateJobStatus to publish it as 'active'.
// skills_required is accepted as a comma-separated string and split server-side.
export async function createJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', jobId: null }

  const parsed = createJobSchema.safeParse({
    title:                formData.get('title'),
    description:          formData.get('description'),
    requirements:         formData.get('requirements')     || undefined,
    responsibilities:     formData.get('responsibilities') || undefined,
    category:             formData.get('category')         || undefined,
    job_type:             formData.get('job_type'),
    city:                 formData.get('city')             || null,
    is_remote:            formData.get('is_remote'),
    salary_min:           formData.get('salary_min'),
    salary_max:           formData.get('salary_max'),
    salary_period:        formData.get('salary_period')    || 'month',
    experience_years_min: formData.get('experience_years_min') ?? 0,
    deadline:             formData.get('deadline'),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid job details', jobId: null }
  }

  const skillsRaw = formData.get('skills_required')?.toString().trim() ?? ''
  const skills_required = skillsRaw
    ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job, error } = await (supabase as any)
    .from('jobs')
    .insert({
      poster_id: user.id,
      status:    'draft',
      skills_required,
      ...parsed.data,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: unknown }

  if (error || !job) return { error: 'Failed to create job listing', jobId: null }

  revalidatePath('/jobs')
  return { success: true, jobId: job.id }
}

// ─── applyToJob ──────────────────────────────────────────────────────────────
// Authenticated users apply to an active job. applicant_id is always set
// server-side. Self-application is blocked. Duplicate is caught gracefully.
export async function applyToJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = applyToJobSchema.safeParse({
    job_id:          formData.get('job_id'),
    cover_letter:    formData.get('cover_letter')    || undefined,
    cv_url:          formData.get('cv_url'),
    portfolio_url:   formData.get('portfolio_url'),
    expected_salary: formData.get('expected_salary'),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid application details' }
  }

  const { job_id, cover_letter, cv_url, portfolio_url, expected_salary } = parsed.data

  // Fetch job server-side to confirm it is active and not owned by the applicant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, poster_id, status, title')
    .eq('id', job_id)
    .single() as { data: JobRow | null }

  if (!job)                        return { error: 'Job not found' }
  if (job.status !== 'active')     return { error: 'This job is no longer accepting applications' }
  if (job.poster_id === user.id)   return { error: 'You cannot apply to your own job listing' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: appErr } = await (supabase as any)
    .from('job_applications')
    .insert({
      job_id,
      applicant_id:    user.id,
      cover_letter:    cover_letter ?? null,
      cv_url:          cv_url       ?? null,
      portfolio_url:   portfolio_url ?? null,
      expected_salary: expected_salary ?? null,
      status:          'submitted',
    })

  if (appErr) {
    // PostgreSQL unique violation (23505) = already applied
    if ((appErr as { code?: string }).code === '23505')
      return { error: 'You have already applied to this job' }
    return { error: 'Failed to submit application' }
  }

  return { success: true }
}

// ─── updateJobStatus ─────────────────────────────────────────────────────────
// Poster transitions: draft→active, active→{closed,filled}, closed→active, expired→active.
// Sets published_at when going active, closed_at when closing.
export async function updateJobStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = updateJobStatusSchema.safeParse({
    job_id: formData.get('job_id'),
    status: formData.get('status'),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid input' }
  }

  const { job_id, status } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, poster_id, status')
    .eq('id', job_id)
    .single() as { data: JobRow | null }

  if (!job)                      return { error: 'Job not found' }
  if (job.poster_id !== user.id) return { error: 'Not authorised to update this job' }

  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    draft:   ['active'],
    active:  ['closed', 'filled'],
    closed:  ['active'],
    expired: ['active'],
    filled:  [],
  }

  if (!(ALLOWED_TRANSITIONS[job.status] ?? []).includes(status))
    return { error: 'Invalid status transition' }

  const now = new Date().toISOString()
  const extraFields: Record<string, string | null> = {}
  if (status === 'active') {
    extraFields.published_at = now
    extraFields.closed_at    = null
  } else if (status === 'closed' || status === 'filled') {
    extraFields.closed_at = now
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('jobs')
    .update({ status, ...extraFields })
    .eq('id', job_id)
    .eq('poster_id', user.id)

  if (error) return { error: 'Failed to update job status' }

  revalidatePath('/jobs')
  return { success: true }
}
