'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckSquare } from 'lucide-react'
import {
  completeAgentProfile,
  completeVendorProfile,
  completeProfessionalProfile,
  completeOnboarding,
} from '@/lib/actions/auth'
import {
  agentProfileSchema,
  vendorProfileSchema,
  professionalProfileSchema,
  type AgentProfileInput,
  type VendorProfileInput,
  type ProfessionalProfileInput,
} from '@/lib/validations/auth'
import { ROLE_SPECIALIZATIONS, ROLE_LABELS, CAMEROON_CITIES } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import type { UserRole } from '@/types/auth'

interface RoleProfileStepProps {
  role:           UserRole
  isProfessional: boolean
  onNext:         () => void
  onFinish:       (redirectTo: string) => void
  onError:        (msg: string) => void
}

export function RoleProfileStep({ role, isProfessional, onNext, onFinish, onError }: RoleProfileStepProps) {
  switch (role) {
    case 'agent':
      return <AgentStep onNext={onNext} onFinish={onFinish} onError={onError} isProfessional={isProfessional} />
    case 'vendor':
      return <VendorStep onNext={onNext} onError={onError} />
    case 'contractor':
    case 'engineer':
    case 'architect':
    case 'lawyer':
      return <ProfessionalStep role={role} onNext={onNext} onError={onError} />
    case 'seller':
      return <SkipStep onNext={onNext} onFinish={onFinish} onError={onError} requiresVerification={isProfessional} />
    default:
      return <SkipStep onNext={onNext} onFinish={onFinish} onError={onError} requiresVerification={false} />
  }
}

// ─── Agent ────────────────────────────────────────────────────────────────────

function AgentStep({
  isProfessional, onNext, onFinish, onError,
}: { isProfessional: boolean; onNext: () => void; onFinish: (r: string) => void; onError: (m: string) => void }) {
  const [isPending, startTransition] = useTransition()
  const specializations = ROLE_SPECIALIZATIONS['agent']

  const form = useForm<AgentProfileInput>({
    resolver:      zodResolver(agentProfileSchema) as any,
    defaultValues: { agency_name: '', license_number: '', specializations: [], service_areas: [], experience_years: 0, commission_rate: 3 },
  })

  const onSubmit = (data: AgentProfileInput) => {
    startTransition(async () => {
      const r1 = await completeAgentProfile(data)
      if (r1?.error) { onError(r1.error); return }
      if (isProfessional) {
        onNext()
      } else {
        const r2 = await completeOnboarding()
        if (r2?.error) { onError(r2.error); return }
        onFinish(r2.data?.redirectTo ?? '/agent')
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="agency_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Agency name</FormLabel>
              <FormControl><Input placeholder="Prestige Immobilier" disabled={isPending} {...field} /></FormControl>
              <FormDescription>Optional — leave blank if independent</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="experience_years" render={({ field }) => (
            <FormItem>
              <FormLabel>Years of experience <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input type="number" min={0} max={50} disabled={isPending} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="license_number" render={({ field }) => (
            <FormItem>
              <FormLabel>License number</FormLabel>
              <FormControl><Input placeholder="e.g. AGT-2024-001" disabled={isPending} {...field} /></FormControl>
              <FormDescription>Your official real estate license ID</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="commission_rate" render={({ field }) => (
            <FormItem>
              <FormLabel>Default commission rate (%)</FormLabel>
              <FormControl><Input type="number" min={0} max={20} step={0.5} disabled={isPending} {...field} /></FormControl>
              <FormDescription>Platform default is 3%.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <SpecializationCheckboxes
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={form.control as any}
          name="specializations"
          label="Specializations"
          options={specializations}
          disabled={isPending}
        />

        <CityCheckboxes
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={form.control as any}
          name="service_areas"
          disabled={isPending}
        />

        <SubmitButton isPending={isPending} label={isProfessional ? 'Continue' : 'Finish Setup'} />
      </form>
    </Form>
  )
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

function VendorStep({ onNext, onError }: { onNext: () => void; onError: (m: string) => void }) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<VendorProfileInput>({
    resolver:      zodResolver(vendorProfileSchema),
    defaultValues: { store_name: '', store_description: '' },
  })

  const onSubmit = (data: VendorProfileInput) => {
    startTransition(async () => {
      const r1 = await completeVendorProfile(data)
      if (r1?.error) { onError(r1.error); return }
      onNext()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField control={form.control} name="store_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Store name <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input placeholder="Cameroon Build Supply" disabled={isPending} {...field} /></FormControl>
            <FormDescription>This is the public name customers will see</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="store_description" render={({ field }) => (
          <FormItem>
            <FormLabel>Store description</FormLabel>
            <FormControl>
              <Input placeholder="Quality building materials at competitive prices" disabled={isPending} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <SubmitButton isPending={isPending} label="Continue" />
      </form>
    </Form>
  )
}

// ─── Professional (contractor / engineer / architect / lawyer) ────────────────

const LICENSE_LABEL: Record<string, string> = {
  contractor: 'Registration number',
  engineer:   'Professional registration number',
  architect:  'Order of Architects number',
  lawyer:     'Bar association number',
}

function ProfessionalStep({
  role, onNext, onError,
}: { role: 'contractor' | 'engineer' | 'architect' | 'lawyer'; onNext: () => void; onError: (m: string) => void }) {
  const [isPending, startTransition] = useTransition()
  const specializations = ROLE_SPECIALIZATIONS[role] ?? []

  const form = useForm<ProfessionalProfileInput>({
    resolver:      zodResolver(professionalProfileSchema) as any,
    defaultValues: { company_name: '', license_number: '', specializations: [], service_areas: [], experience_years: 0, day_rate: undefined },
  })

  const onSubmit = (data: ProfessionalProfileInput) => {
    startTransition(async () => {
      const r1 = await completeProfessionalProfile(data, role)
      if (r1?.error) { onError(r1.error); return }
      onNext()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="company_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Company / Firm name</FormLabel>
              <FormControl><Input placeholder="Your firm name (optional)" disabled={isPending} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="experience_years" render={({ field }) => (
            <FormItem>
              <FormLabel>Years of experience <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input type="number" min={0} max={50} disabled={isPending} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="license_number" render={({ field }) => (
            <FormItem>
              <FormLabel>{LICENSE_LABEL[role] ?? 'Registration number'}</FormLabel>
              <FormControl><Input placeholder="e.g. OA-2024-0042" disabled={isPending} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="day_rate" render={({ field }) => (
            <FormItem>
              <FormLabel>Daily rate (XAF)</FormLabel>
              <FormControl><Input type="number" min={0} placeholder="e.g. 100000" disabled={isPending} {...field} /></FormControl>
              <FormDescription>Helps clients estimate costs.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {specializations.length > 0 && (
          <SpecializationCheckboxes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            control={form.control as any}
            name="specializations"
            label="Specializations"
            options={specializations}
            disabled={isPending}
          />
        )}

        <CityCheckboxes
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={form.control as any}
          name="service_areas"
          disabled={isPending}
        />

        <SubmitButton isPending={isPending} label="Continue" />
      </form>
    </Form>
  )
}

// ─── Skip (buyer — no extra profile data needed; seller — proceeds to KYC) ───

function SkipStep({
  onNext, onFinish, onError, requiresVerification,
}: { onNext: () => void; onFinish: (r: string) => void; onError: (m: string) => void; requiresVerification: boolean }) {
  const [isPending, startTransition] = useTransition()

  const handleFinish = () => {
    if (requiresVerification) {
      onNext()
      return
    }
    startTransition(async () => {
      const result = await completeOnboarding()
      if (result?.error) { onError(result.error); return }
      onFinish(result.data?.redirectTo ?? '/account')
    })
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        {requiresVerification
          ? 'Your profile is ready. Next, upload your identity documents for verification.'
          : 'Your profile is ready. You can fill in more details from your account settings at any time.'}
      </p>
      <Button onClick={handleFinish} className="w-full" disabled={isPending}>
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Setting up…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckSquare size={16} />
            {requiresVerification ? 'Continue' : 'Go to Dashboard'}
          </span>
        )}
      </Button>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SpecializationCheckboxes({
  control, name, label, options, disabled,
}: {
  control: ReturnType<typeof useForm>['control']
  name:    string
  label:   string
  options: { value: string; label: string }[]
  disabled: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">
            {label} <span className="text-destructive">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
            {options.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={(field.value as string[]).includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const current = field.value as string[]
                    field.onChange(
                      checked
                        ? [...current, opt.value]
                        : current.filter((v: string) => v !== opt.value)
                    )
                  }}
                  disabled={disabled}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {fieldState.error && (
            <p className="text-sm text-destructive">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  )
}

function CityCheckboxes({
  control, name, disabled,
}: {
  control: ReturnType<typeof useForm>['control']
  name:    string
  disabled: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">Service areas</p>
          <p className="text-xs text-muted-foreground">Select cities where you operate</p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
            {CAMEROON_CITIES.map((city) => (
              <label key={city.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={(field.value as string[]).includes(city.value)}
                  onCheckedChange={(checked) => {
                    const current = field.value as string[]
                    field.onChange(
                      checked
                        ? [...current, city.value]
                        : current.filter((v: string) => v !== city.value)
                    )
                  }}
                  disabled={disabled}
                />
                {city.label}
              </label>
            ))}
          </div>
          {fieldState.error && (
            <p className="text-sm text-destructive">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  )
}

function SubmitButton({ isPending, label }: { isPending: boolean; label: string }) {
  return (
    <Button type="submit" className="w-full" disabled={isPending}>
      {isPending ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Saving…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <CheckSquare size={16} />
          {label}
        </span>
      )}
    </Button>
  )
}
