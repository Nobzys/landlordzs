'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Phone, ShieldCheck } from 'lucide-react'
import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/actions/auth'
import { phoneSchema, phoneOtpSchema, type PhoneInput, type PhoneOtpInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

interface PhoneVerificationFormProps {
  onVerified?: () => void
}

export function PhoneVerificationForm({ onVerified }: PhoneVerificationFormProps) {
  const [step,        setStep]        = useState<'phone' | 'otp'>('phone')
  const [serverError, setServerError] = useState<string | null>(null)
  const [otpSentTo,   setOtpSentTo]   = useState('')
  const [isPending,   startTransition] = useTransition()

  // ── Step 1: Enter phone number ──────────────────────────────────────────
  const phoneForm = useForm<PhoneInput>({
    resolver:      zodResolver(phoneSchema),
    defaultValues: { phone: '+237' },
  })

  const onSendOtp = (data: PhoneInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await sendPhoneOtp(data)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      setOtpSentTo(data.phone)
      setStep('otp')
    })
  }

  // ── Step 2: Enter OTP ──────────────────────────────────────────────────
  const otpForm = useForm<Omit<PhoneOtpInput, 'phone'>>({
    resolver:      zodResolver(phoneOtpSchema.omit({ phone: true })),
    defaultValues: { token: '' },
  })

  const onVerifyOtp = (data: { token: string }) => {
    setServerError(null)
    startTransition(async () => {
      const result = await verifyPhoneOtp({ phone: otpSentTo, token: data.token })
      if (result?.error) {
        setServerError(result.error)
        return
      }
      onVerified?.()
    })
  }

  if (step === 'phone') {
    return (
      <Form {...phoneForm}>
        <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4" noValidate>
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={phoneForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number (Cameroon)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    autoComplete="tel"
                    autoFocus
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending OTP…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Phone size={16} />
                Send Verification Code
              </span>
            )}
          </Button>
        </form>
      </Form>
    )
  }

  return (
    <Form {...otpForm}>
      <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4" noValidate>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to{' '}
          <span className="font-medium text-foreground">{otpSentTo}</span>.
        </p>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={otpForm.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification code</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  autoFocus
                  disabled={isPending}
                  className="tracking-[0.5em] text-center text-lg font-mono"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Verifying…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} />
              Verify Phone
            </span>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={isPending}
          onClick={() => {
            setStep('phone')
            setServerError(null)
          }}
        >
          Use a different number
        </Button>
      </form>
    </Form>
  )
}
