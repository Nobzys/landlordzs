'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import {
  updateBasicProfile,
  completeAgentProfile,
  completeVendorProfile,
  completeProfessionalProfile,
} from '@/lib/actions/auth'
import {
  basicProfileSchema,
  agentProfileSchema,
  vendorProfileSchema,
  professionalProfileSchema,
  type BasicProfileInput,
  type AgentProfileInput,
  type VendorProfileInput,
  type ProfessionalProfileInput,
} from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CAMEROON_CITIES, ROLE_SPECIALIZATIONS, ROLE_LABELS } from '@/lib/utils/constants'
import type { Profile, UserRole } from '@/types/auth'

// ─── Shared ───────────────────────────────────────────────────────────────────

function Saved() {
  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle2 className="h-4 w-4" />
      Saved successfully
    </div>
  )
}

// ─── Basic Info ───────────────────────────────────────────────────────────────

function BasicProfileSection({ profile }: { profile: Profile }) {
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()

  const form = useForm<BasicProfileInput>({
    resolver: zodResolver(basicProfileSchema),
    defaultValues: {
      full_name:    profile.full_name    ?? '',
      display_name: profile.display_name ?? '',
      phone:        profile.phone        ?? '',
      city:         (profile.city as BasicProfileInput['city']) ?? undefined,
      bio:          profile.bio          ?? '',
    },
  })

  const onSubmit = (data: BasicProfileInput) => {
    setSaved(false); setErr('')
    startTransition(async () => {
      const res = await updateBasicProfile(data)
      if (res?.error) { setErr(res.error) } else { setSaved(true) }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="display_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input {...field} placeholder="+237 6X XXX XXXX" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={pending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Select a city</option>
                      {CAMEROON_CITIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem>
                <FormLabel>Bio <span className="text-muted-foreground text-xs">(optional, max 500 chars)</span></FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={3}
                    disabled={pending}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex items-center gap-4 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save Changes'}
              </Button>
              {saved && <Saved />}
              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// ─── Agent Profile ────────────────────────────────────────────────────────────

function AgentSection({
  initial,
}: {
  initial: { experience_years: number; specializations: string[]; commission_rate: number } | null
}) {
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()

  const form = useForm<AgentProfileInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(agentProfileSchema) as any,
    defaultValues: {
      agency_name:      '',
      specializations:  initial?.specializations  ?? [],
      experience_years: initial?.experience_years ?? 0,
      commission_rate:  initial?.commission_rate  ?? 3,
    },
  })

  const specs = form.watch('specializations') ?? []

  const onSubmit = (data: AgentProfileInput) => {
    setSaved(false); setErr('')
    startTransition(async () => {
      const res = await completeAgentProfile(data)
      if (res?.error) { setErr(res.error) } else { setSaved(true) }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Agent Profile</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="experience_years" render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl><Input type="number" min={0} max={50} {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="commission_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Rate (%)</FormLabel>
                  <FormControl><Input type="number" min={0} max={20} step={0.5} {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Specializations <span className="text-destructive">*</span></p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_SPECIALIZATIONS.agent?.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      value={s.value}
                      checked={specs.includes(s.value)}
                      disabled={pending}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...specs, s.value]
                          : specs.filter((x) => x !== s.value)
                        form.setValue('specializations', next, { shouldValidate: true })
                      }}
                      className="rounded"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
              {form.formState.errors.specializations && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.specializations.message}</p>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save Changes'}
              </Button>
              {saved && <Saved />}
              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// ─── Vendor Profile ───────────────────────────────────────────────────────────

function VendorSection({
  initial,
}: {
  initial: { store_name: string; store_description: string | null } | null
}) {
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()

  const form = useForm<VendorProfileInput>({
    resolver: zodResolver(vendorProfileSchema),
    defaultValues: {
      store_name:        initial?.store_name        ?? '',
      store_description: initial?.store_description ?? '',
    },
  })

  const onSubmit = (data: VendorProfileInput) => {
    setSaved(false); setErr('')
    startTransition(async () => {
      const res = await completeVendorProfile(data)
      if (res?.error) { setErr(res.error) } else { setSaved(true) }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Store Information</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="store_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Store Name</FormLabel>
                <FormControl><Input {...field} disabled={pending} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="store_description" render={({ field }) => (
              <FormItem>
                <FormLabel>Store Description <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={3}
                    disabled={pending}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex items-center gap-4 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save Changes'}
              </Button>
              {saved && <Saved />}
              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// ─── Professional Profile (contractor | engineer | architect | lawyer) ─────────

function ProfessionalSection({
  role,
  initial,
}: {
  role: 'contractor' | 'engineer' | 'architect' | 'lawyer'
  initial: {
    company_name: string | null
    specializations: string[]
    experience_years: number
    day_rate: number | null
  } | null
}) {
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()

  const form = useForm<ProfessionalProfileInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(professionalProfileSchema) as any,
    defaultValues: {
      company_name:     initial?.company_name     ?? '',
      specializations:  initial?.specializations  ?? [],
      experience_years: initial?.experience_years ?? 0,
      day_rate:         initial?.day_rate          ?? undefined,
    },
  })

  const specs = form.watch('specializations') ?? []
  const roleSpecs = ROLE_SPECIALIZATIONS[role] ?? []

  const onSubmit = (data: ProfessionalProfileInput) => {
    setSaved(false); setErr('')
    startTransition(async () => {
      const res = await completeProfessionalProfile(data, role)
      if (res?.error) { setErr(res.error) } else { setSaved(true) }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{ROLE_LABELS[role]} Profile</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="company_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Company / Firm Name <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl><Input {...field} disabled={pending} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="experience_years" render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl><Input type="number" min={0} max={50} {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="day_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Day Rate (XAF) <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="e.g. 50000" {...field} value={field.value ?? ''} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {roleSpecs.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Specializations <span className="text-destructive">*</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {roleSpecs.map((s) => (
                    <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        value={s.value}
                        checked={specs.includes(s.value)}
                        disabled={pending}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...specs, s.value]
                            : specs.filter((x) => x !== s.value)
                          form.setValue('specializations', next, { shouldValidate: true })
                        }}
                        className="rounded"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
                {form.formState.errors.specializations && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.specializations.message}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save Changes'}
              </Button>
              {saved && <Saved />}
              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

interface ProfileFormProps {
  profile: Profile
  agentProfile?: {
    experience_years: number
    specializations:  string[]
    commission_rate:  number
  } | null
  vendorProfile?: {
    store_name:        string
    store_description: string | null
  } | null
  professionalProfile?: {
    company_name:     string | null
    specializations:  string[]
    experience_years: number
    day_rate:         number | null
  } | null
}

export function ProfileForm({
  profile,
  agentProfile,
  vendorProfile,
  professionalProfile,
}: ProfileFormProps) {
  const PROF_ROLES = ['contractor', 'engineer', 'architect', 'lawyer'] as const
  const isProfessional = PROF_ROLES.includes(profile.role as (typeof PROF_ROLES)[number])

  return (
    <div className="space-y-6">
      <BasicProfileSection profile={profile} />

      {profile.role === 'agent' && (
        <AgentSection initial={agentProfile ?? null} />
      )}

      {profile.role === 'vendor' && (
        <VendorSection initial={vendorProfile ?? null} />
      )}

      {isProfessional && (
        <ProfessionalSection
          role={profile.role as 'contractor' | 'engineer' | 'architect' | 'lawyer'}
          initial={professionalProfile ?? null}
        />
      )}
    </div>
  )
}
