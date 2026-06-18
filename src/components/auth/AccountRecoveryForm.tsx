'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { LifeBuoy, ArrowLeft } from 'lucide-react'
import { submitAccountRecoveryRequest } from '@/lib/actions/auth'
import { accountRecoverySchema, type AccountRecoveryInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

export function AccountRecoveryForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent,         setSent]        = useState(false)
  const [isPending,    startTransition] = useTransition()

  const form = useForm<AccountRecoveryInput>({
    resolver:      zodResolver(accountRecoverySchema),
    defaultValues: { full_name: '', phone: '', alternative_email: '', note: '' },
  })

  const onSubmit = (data: AccountRecoveryInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await submitAccountRecoveryRequest(data)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <LifeBuoy className="text-blue-600" size={28} />
        </div>
        <h2 className="text-xl font-semibold">Request received</h2>
        <p className="text-sm text-muted-foreground">
          Our support team will review your request and reach out using the contact
          details you provided. This usually takes 1-2 business days.
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
          Can&apos;t access your account and the email reset link isn&apos;t working?
          Tell us how to reach you and our support team will follow up.
        </p>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your full name"
                  autoComplete="name"
                  autoFocus
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+237 6XX XXX XXX"
                  autoComplete="tel"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alternative_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alternative email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="An email we can reach you at"
                  autoComplete="email"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What&apos;s going on? (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Briefly describe the issue"
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
              Submitting…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LifeBuoy size={16} />
              Submit Request
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
