'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ROLE_LABELS, TOTAL_ONBOARDING_STEPS } from '@/lib/utils/constants'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BasicProfileStep } from './onboarding/BasicProfileStep'
import { RoleProfileStep } from './onboarding/RoleProfileStep'
import type { Profile, UserRole } from '@/types/auth'

interface OnboardingFlowProps {
  profile: Profile | null
}

const STEP_TITLES = ['Basic Profile', 'Account Setup']
const STEP_DESCRIPTIONS = [
  'Tell us who you are so clients and buyers can find you.',
  'Set up your role-specific profile to start using the platform.',
]

export function OnboardingFlow({ profile }: OnboardingFlowProps) {
  const router       = useRouter()
  const [step,       setStep]       = useState(1)
  const [error,      setError]      = useState<string | null>(null)

  const role = profile?.role as UserRole | undefined

  const handleNext = () => {
    setError(null)
    setStep((s) => s + 1)
  }

  const handleFinish = (redirectTo: string) => {
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to LANDLORDZS
        </h1>
        {role && (
          <p className="mt-1 text-sm text-muted-foreground">
            Setting up your <span className="font-medium">{ROLE_LABELS[role]}</span> account
          </p>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-0">
        {Array.from({ length: TOTAL_ONBOARDING_STEPS }).map((_, i) => {
          const stepNum = i + 1
          const done    = step > stepNum
          const active  = step === stepNum
          return (
            <div key={stepNum} className="flex items-center">
              {/* Circle */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  done   && 'bg-primary text-primary-foreground',
                  active && 'border-2 border-primary text-primary',
                  !done && !active && 'border-2 border-muted text-muted-foreground'
                )}
              >
                {done ? <CheckCircle2 size={18} /> : stepNum}
              </div>
              {/* Connector */}
              {stepNum < TOTAL_ONBOARDING_STEPS && (
                <div
                  className={cn(
                    'h-0.5 w-16 transition-colors sm:w-24',
                    step > stepNum ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step title */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 space-y-1">
          <h2 className="text-lg font-semibold">
            Step {step} of {TOTAL_ONBOARDING_STEPS}: {STEP_TITLES[step - 1]}
          </h2>
          <p className="text-sm text-muted-foreground">{STEP_DESCRIPTIONS[step - 1]}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step content */}
        {step === 1 && (
          <BasicProfileStep
            profile={profile}
            onNext={handleNext}
            onError={setError}
          />
        )}

        {step === 2 && role && (
          <RoleProfileStep
            role={role}
            onFinish={handleFinish}
            onError={setError}
          />
        )}
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: TOTAL_ONBOARDING_STEPS }).map((_, i) => (
          <Circle
            key={i}
            size={8}
            className={cn(
              'fill-current transition-colors',
              step === i + 1
                ? 'text-primary'
                : step > i + 1
                ? 'text-primary/40'
                : 'text-muted'
            )}
          />
        ))}
      </div>
    </div>
  )
}
