'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { resetPassword } from '@/lib/actions/auth'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

export function ResetPasswordForm() {
  const router = useRouter()
  const [serverError,  setServerError]  = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending,    startTransition]  = useTransition()

  const form = useForm<ResetPasswordInput>({
    resolver:      zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm_password: '' },
  })

  const onSubmit = (data: ResetPasswordInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await resetPassword(data)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      router.push(result?.data?.redirectTo ?? '/account')
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <p className="text-sm text-muted-foreground">
          Choose a strong new password for your account.
        </p>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8+ chars, upper, lower, number, symbol"
                    autoComplete="new-password"
                    autoFocus
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

        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
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
              Updating password…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} />
              Set New Password
            </span>
          )}
        </Button>
      </form>
    </Form>
  )
}
