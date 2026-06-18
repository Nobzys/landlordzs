'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, UserPlus, CheckCircle2 } from 'lucide-react'
import { signUp } from '@/lib/actions/auth'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { RoleSelector } from './RoleSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import type { RegisterableRole } from '@/types/auth'

type VerifyState = { email: string; skipVerification?: boolean } | null

export function RegisterForm() {
  const router = useRouter()
  const [serverError,  setServerError]  = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [verifyState,  setVerifyState]  = useState<VerifyState>(null)
  const [isPending,    startTransition]  = useTransition()

  const form = useForm<RegisterInput>({
    resolver:      zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '', role: undefined },
  })

  const onSubmit = (data: RegisterInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await signUp(data)
      if (result?.error) {
        setServerError(result.error)
        return
      }

      // Supabase returned a real session (project's "Confirm email" setting
      // is OFF) — the user is genuinely authenticated, safe to continue.
      if (result?.data?.sessionCreated) {
        router.push(result.data.redirectTo ?? '/onboarding')
        router.refresh()
        return
      }

      if (result?.data?.email) {
        setVerifyState({
          email: result.data.email,
          skipVerification: result.data.skipVerification,
        })
      }
    })
  }

  // ── Success: account created without email verification ──────────────────
  if (verifyState?.skipVerification) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="text-green-600" size={32} />
        </div>
        <h2 className="text-xl font-semibold">Account created!</h2>
        <p className="text-sm text-muted-foreground">
          Your account for{' '}
          <span className="font-medium text-foreground">{verifyState.email}</span>{' '}
          is ready. Sign in to finish setting up your profile.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    )
  }

  // ── Success: ask user to verify email ────────────────────────────────────
  if (verifyState) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span className="text-3xl">✉️</span>
        </div>
        <h2 className="text-xl font-semibold">Check your inbox</h2>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{' '}
          <span className="font-medium text-foreground">{verifyState.email}</span>.
          Click the link to activate your account.
        </p>
        <p className="text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder or{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={async () => {
              const { resendVerificationEmail } = await import('@/lib/actions/auth')
              await resendVerificationEmail(verifyState.email)
            }}
          >
            resend
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Full name */}
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Jean-Pierre Mvondo" autoComplete="name" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" autoComplete="email" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8+ chars, upper, lower, number, symbol"
                    autoComplete="new-password"
                    disabled={isPending}
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm password */}
        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Role selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">
            I am a… <span className="text-destructive">*</span>
          </p>
          <Controller
            control={form.control}
            name="role"
            render={({ field, fieldState }) => (
              <RoleSelector
                value={field.value as RegisterableRole ?? null}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating account…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus size={16} />
              Create Account
            </span>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to our{' '}
          <Link href="/about#terms" className="text-primary hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/about#privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </Form>
  )
}
