'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User } from 'lucide-react'
import { updateBasicProfile } from '@/lib/actions/auth'
import { basicProfileSchema, type BasicProfileInput } from '@/lib/validations/auth'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Profile } from '@/types/auth'

interface BasicProfileStepProps {
  profile:  Profile | null
  onNext:   () => void
  onError:  (msg: string) => void
}

export function BasicProfileStep({ profile, onNext, onError }: BasicProfileStepProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<BasicProfileInput>({
    resolver:      zodResolver(basicProfileSchema),
    defaultValues: {
      full_name:    profile?.full_name    ?? '',
      display_name: profile?.display_name ?? '',
      phone:        profile?.phone        ?? '',
      city:         (profile?.city        ?? undefined) as BasicProfileInput['city'],
      bio:          profile?.bio          ?? '',
    },
  })

  const onSubmit = (data: BasicProfileInput) => {
    startTransition(async () => {
      const result = await updateBasicProfile(data)
      if (result?.error) {
        onError(result.error)
        return
      }
      onNext()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Full name */}
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Jean-Pierre Mvondo" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Display name */}
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input placeholder="JP (shown publicly)" disabled={isPending} {...field} />
                </FormControl>
                <FormDescription>Optional short name shown on listings</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Phone */}
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
                <FormDescription>Cameroon number (+237)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* City */}
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your city" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CAMEROON_CITIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                        <span className="ml-2 text-xs text-muted-foreground">({c.region})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bio */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us a bit about yourself…"
                  rows={3}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>Optional. Max 500 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <User size={16} />
              Save & Continue
            </span>
          )}
        </Button>
      </form>
    </Form>
  )
}
