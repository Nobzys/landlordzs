'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { updateBusinessSettings } from '@/lib/actions/marketplace'
import { businessSettingsSchema, type BusinessSettingsInput } from '@/lib/validations/marketplace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

export function BusinessSettingsForm({ initial }: { initial: BusinessSettingsInput }) {
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()

  const form = useForm<BusinessSettingsInput>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: initial,
  })

  const onSubmit = (data: BusinessSettingsInput) => {
    setSaved(false); setErr('')
    startTransition(async () => {
      const res = await updateBusinessSettings(data)
      if (res?.error) { setErr(res.error) } else { setSaved(true) }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="business_reg" render={({ field }) => (
            <FormItem>
              <FormLabel>Business Registration No. <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl><Input {...field} disabled={pending} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="tax_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Tax ID <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl><Input {...field} disabled={pending} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex items-center gap-4 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save Changes'}
          </Button>
          {saved && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Saved successfully
            </div>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      </form>
    </Form>
  )
}
