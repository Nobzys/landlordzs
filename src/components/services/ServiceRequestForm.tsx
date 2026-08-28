'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { createServiceRequest } from '@/lib/actions/services'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

interface Category {
  id:   string
  name: string
}

interface ServiceRequestFormProps {
  categories: Category[]
}

function StatusAlert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  return (
    <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
      type === 'success'
        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
        : 'bg-destructive/10 text-destructive'
    }`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function ServiceRequestForm({ categories }: ServiceRequestFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [city, setCity] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (categoryId) fd.set('category_id', categoryId)
    if (city) fd.set('city', city)

    startTransition(async () => {
      setResult(null)
      const res = await createServiceRequest(fd)
      if (res.error) {
        setResult({ error: res.error })
        return
      }
      setResult({ success: true })
      setTimeout(() => {
        if (res.data?.id) {
          router.push(`/services/${res.data.id}`)
        } else {
          router.push('/services')
        }
      }, 800)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {result?.error && <StatusAlert type="error" message={result.error} />}
      {result?.success && <StatusAlert type="success" message="Request posted! Redirecting…" />}

      <div className="space-y-1.5">
        <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Need a contractor to renovate my kitchen"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe the work you need done, including scope, materials, any special requirements…"
          rows={5}
          required
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>City</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {CAMEROON_CITIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address / Neighbourhood (optional)</Label>
        <Input
          id="address"
          name="address"
          placeholder="Street, neighbourhood, or landmark"
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="budget_min">Budget minimum (XAF)</Label>
          <Input
            id="budget_min"
            name="budget_min"
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 100000"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="budget_max">Budget maximum (XAF)</Label>
          <Input
            id="budget_max"
            name="budget_max"
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 500000"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="deadline">Deadline (optional)</Label>
        <Input
          id="deadline"
          name="deadline"
          type="date"
          disabled={isPending}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Post Service Request
      </Button>
    </form>
  )
}
