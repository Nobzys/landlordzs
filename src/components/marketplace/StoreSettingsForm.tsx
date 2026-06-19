'use client'

import { useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateStoreSettings, updateStoreImage } from '@/lib/actions/marketplace'
import { storeSettingsSchema, type StoreSettingsInput } from '@/lib/validations/marketplace'
import { STORAGE_BUCKETS, CAMEROON_CITIES } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StoreSettingsFormProps {
  userId: string
  storeLogo: string | null
  storeBanner: string | null
  initial: StoreSettingsInput & { delivery_areas: string[] }
}

function StoreImageField({
  userId, label, field, currentUrl,
}: { userId: string; label: string; field: 'store_logo' | 'store_banner'; currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(currentUrl)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleFile = (file: File) => {
    setError(null)
    startTransition(async () => {
      try {
        const supabase = createClient()
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/${field}-${Date.now()}.${ext}`

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: uploadError } = await (supabase as any).storage
          .from(STORAGE_BUCKETS.MARKETPLACE)
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(uploadError.message)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: urlData } = (supabase as any).storage
          .from(STORAGE_BUCKETS.MARKETPLACE)
          .getPublicUrl(path)

        const newUrl = urlData.publicUrl as string
        const result = await updateStoreImage(field, newUrl)
        if (result?.error) throw new Error(result.error)
        setUrl(newUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      }
    })
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className={field === 'store_logo' ? 'h-16 w-16 rounded-lg object-cover border' : 'h-16 w-32 rounded-lg object-cover border'} />
        ) : (
          <div className={field === 'store_logo' ? 'h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground' : 'h-16 w-32 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground'}>
            <Upload className="h-4 w-4" />
          </div>
        )}
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
          {isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function StoreSettingsForm({ userId, storeLogo, storeBanner, initial }: StoreSettingsFormProps) {
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()

  const form = useForm<StoreSettingsInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(storeSettingsSchema) as any,
    defaultValues: initial,
  })

  const areas = form.watch('delivery_areas') ?? []

  const onSubmit = (data: StoreSettingsInput) => {
    setSaved(false); setErr('')
    startTransition(async () => {
      const res = await updateStoreSettings(data)
      if (res?.error) { setErr(res.error) } else { setSaved(true) }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Logo &amp; Banner</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <StoreImageField userId={userId} label="Store Logo" field="store_logo" currentUrl={storeLogo} />
          <StoreImageField userId={userId} label="Store Banner" field="store_banner" currentUrl={storeBanner} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Store Information</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="store_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Name</FormLabel>
                  <FormControl><Input {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="store_description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      disabled={pending}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} placeholder="+237 6X XXX XXXX" disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input type="email" {...field} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} placeholder="https://" disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl><Input {...field} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="business_hours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Hours <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input {...field} placeholder="Mon–Sat: 8:00 – 18:00" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div>
                <p className="text-sm font-medium mb-2">Delivery Areas</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CAMEROON_CITIES.map((c) => (
                    <label key={c.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        value={c.value}
                        checked={areas.includes(c.value)}
                        disabled={pending}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...areas, c.value]
                            : areas.filter((x) => x !== c.value)
                          form.setValue('delivery_areas', next, { shouldValidate: true })
                        }}
                        className="rounded"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
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
        </CardContent>
      </Card>
    </div>
  )
}
