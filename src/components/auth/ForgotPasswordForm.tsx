'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { forgotPassword } from '@/lib/actions/auth'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent,        setSent]        = useState(false)
  const [sentEmail,   setSentEmail]   = useState('')
  const [isPending,   startTransition] = useTransition()

  const form = useForm<ForgotPasswordInput>({
    resolver:      zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = (data: ForgotPasswordInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await forgotPassword(data)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      setSentEmail(data.email)
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Mail className="text-blue-600" size={28} />
        </div>
        <h2 className="text-xl font-semibold">Reset link sent</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for{' '}
          <span className="font-medium text-foreground">{sentEmail}</span>, we&apos;ve
          sent password reset instructions.
        </p>
        <Button asChild variant="outline" className="mt-2 w-full">
          <Link href="/login">
            <ArrowLeft size={16} className="mr-2" />
            Back to Sign In
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
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
              Sending link…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Mail size={16} />
              Send Reset Link
            </span>
          )}
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/login">
            <ArrowLeft size={16} className="mr-2" />
            Back to Sign In
          </Link>
        </Button>
      </form>
    </Form>
  )
}
