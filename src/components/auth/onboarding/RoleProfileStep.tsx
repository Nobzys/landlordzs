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
import { ROLE_SPECIALIZATIONS, ROLE_LABELS } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import type { UserRole } from '@/types/auth'

interface RoleProfileStepProps {
  role:      UserRole
  onFinish:  (redirectTo: string) => void
  onError:   (msg: string) => void
}

export function RoleProfileStep({ role, onFinish, onError }: RoleProfileStepProps) {
  switch (role) {
    case 'agent':
      return <AgentStep onFinish={onFinish} onError={onError} />
    case 'vendor':
      return <VendorStep onFinish={onFinish} onError={onError} />
    case 'contractor':
    case 'engineer':
    case 'architect':
    case 'lawyer':
      return <ProfessionalStep role={role} onFinish={onFinish} onError={onError} />
    default:
      return <SkipStep onFinish={onFinish} onError={onError} />
  }
}

// ─── Agent ────────────────────────────────────────────────────────────────────

function AgentStep({ onFinish, onError }: Omit<RoleProfileStepProps, 'role'>) {
  const [isPending, startTransition] = useTransition()
  const specializations = ROLE_SPECIALIZATIONS['agent']

  const form = useForm<AgentProfileInput>({
    resolver:      zodResolver(agentProfileSchema),
    defaultValues: { agency_name: '', specializations: [], experience_years: 0, commission_rate: 3 },
  })

  const onSubmit = (data: AgentProfileInput) => {
    startTransition(async () => {
      const r1 = await completeAgentProfile(data)
      if (r1?.error) { onError(r1.error); return }
      const r2 = await completeOnboarding()
      if (r2?.error) { onError(r2.error); return }
      onFinish(r2.data?.redirectTo ?? '/agent')
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

        <FormField control={form.control} name="commission_rate" render={({ field }) => (
          <FormItem>
            <FormLabel>Default commission rate (%)</FormLabel>
            <FormControl><Input type="number" min={0} max={20} step={0.5} disabled={isPending} {...field} /></FormControl>
            <FormDescription>Platform default is 3%. You can update this per listing.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <SpecializationCheckboxes
          control={form.control}
          name="specializations"
          options={specializations}
          disabled={isPending}
        />

        <SubmitButton isPending={isPending} label="Finish Setup" />
      </form>
    </Form>
  )
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

function VendorStep({ onFinish, onError }: Omit<RoleProfileStepProps, 'role'>) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<VendorProfileInput>({
    resolver:      zodResolver(vendorProfileSchema),
    defaultValues: { store_name: '', store_description: '' },
  })

  const onSubmit = (data: VendorProfileInput) => {
    startTransition(async () => {
      const r1 = await completeVendorProfile(data)
      if (r1?.error) { onError(r1.error); return }
      const r2 = await completeOnboarding()
      if (r2?.error) { onError(r2.error); return }
      onFinish(r2.data?.redirectTo ?? '/vendor')
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

        <SubmitButton isPending={isPending} label="Finish Setup" />
      </form>
    </Form>
  )
}

// ─── Professional (contractor / engineer / architect / lawyer) ────────────────

function ProfessionalStep({
  role, onFinish, onError,
}: { role: 'contractor' | 'engineer' | 'architect' | 'lawyer' } & Omit<RoleProfileStepProps, 'role'>) {
  const [isPending, startTransition] = useTransition()
  const specializations = ROLE_SPECIALIZATIONS[role] ?? []

  const form = useForm<ProfessionalProfileInput>({
    resolver:      zodResolver(professionalProfileSchema),
    defaultValues: { company_name: '', specializations: [], experience_years: 0, day_rate: undefined },
  })

  const onSubmit = (data: ProfessionalProfileInput) => {
    startTransition(async () => {
      const r1 = await completeProfessionalProfile(data, role)
      if (r1?.error) { onError(r1.error); return }
      const r2 = await completeOnboarding()
      if (r2?.error) { onError(r2.error); return }
      onFinish(r2.data?.redirectTo ?? `/${role}`)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="company_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Company name</FormLabel>
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

        <FormField control={form.control} name="day_rate" render={({ field }) => (
          <FormItem>
            <FormLabel>Daily rate (XAF)</FormLabel>
            <FormControl><Input type="number" min={0} placeholder="e.g. 100000" disabled={isPending} {...field} /></FormControl>
            <FormDescription>Optional. Helps clients estimate costs.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        {specializations.length > 0 && (
          <SpecializationCheckboxes
            control={form.control}
            name="specializations"
            options={specializations}
            disabled={isPending}
          />
        )}

        <SubmitButton isPending={isPending} label="Finish Setup" />
      </form>
    </Form>
  )
}

// ─── Skip (buyer / seller — no extra profile data needed) ────────────────────

function SkipStep({ onFinish, onError }: Omit<RoleProfileStepProps, 'role'>) {
  const [isPending, startTransition] = useTransition()

  const handleFinish = () => {
    startTransition(async () => {
      const result = await completeOnboarding()
      if (result?.error) { onError(result.error); return }
      onFinish(result.data?.redirectTo ?? '/account')
    })
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        Your profile is ready. You can fill in more details from your account settings at any time.
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
            Go to Dashboard
          </span>
        )}
      </Button>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SpecializationCheckboxes({
  control, name, options, disabled,
}: {
  control: ReturnType<typeof useForm>['control']
  name: string
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
            Specializations <span className="text-destructive">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
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
