'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createAgency, updateAgency, joinAgency } from '@/lib/actions/auth'

type AgencyData = {
  id:             string
  name:           string
  city:           string | null
  phone:          string | null
  email:          string | null
  description:    string | null
  license_number: string | null
}

interface Props {
  profileId: string
  agency:    AgencyData | null
  isOwner:   boolean
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

function AgencyFields({
  defaults,
}: {
  defaults?: Partial<AgencyData>
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Agency name <span className="text-destructive">*</span></Label>
        <Input id="name" name="name" required defaultValue={defaults?.name ?? ''} placeholder="Prime Realty Douala" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue={defaults?.city ?? ''} placeholder="Douala" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={defaults?.phone ?? ''} placeholder="+237 6XX XXX XXX" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ''} placeholder="agency@example.com" />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="license_number">License number</Label>
        <Input id="license_number" name="license_number" defaultValue={defaults?.license_number ?? ''} placeholder="FIMAC-XXXXX" />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={defaults?.description ?? ''} placeholder="Brief description of your agency…" />
      </div>
    </div>
  )
}

function CreateForm() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createAgency({
        name:           fd.get('name') as string,
        city:           (fd.get('city') as string) || undefined,
        phone:          (fd.get('phone') as string) || undefined,
        email:          (fd.get('email') as string) || undefined,
        license_number: (fd.get('license_number') as string) || undefined,
        description:    (fd.get('description') as string) || undefined,
      })
      setResult(res)
      if (res.success) window.location.reload()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AgencyFields />
      {result?.error && <StatusAlert type="error" message={result.error} />}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Create agency
      </Button>
    </form>
  )
}

function JoinForm() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const slug = (new FormData(e.currentTarget).get('slug') as string).trim()
    startTransition(async () => {
      const res = await joinAgency(slug)
      setResult(res)
      if (res.success) window.location.reload()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="slug">Agency slug <span className="text-destructive">*</span></Label>
        <Input id="slug" name="slug" required placeholder="prime-realty-douala" />
        <p className="text-xs text-muted-foreground">Ask the agency owner for their slug.</p>
      </div>
      {result?.error && <StatusAlert type="error" message={result.error} />}
      <Button type="submit" disabled={isPending} variant="outline" className="w-full">
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Join agency
      </Button>
    </form>
  )
}

function UpdateForm({ agency }: { agency: AgencyData }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateAgency(agency.id, {
        name:           fd.get('name') as string,
        city:           (fd.get('city') as string) || undefined,
        phone:          (fd.get('phone') as string) || undefined,
        email:          (fd.get('email') as string) || undefined,
        license_number: (fd.get('license_number') as string) || undefined,
        description:    (fd.get('description') as string) || undefined,
      })
      setResult(res)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AgencyFields defaults={agency} />
      {result?.error   && <StatusAlert type="error"   message={result.error} />}
      {result?.success && <StatusAlert type="success" message="Agency updated." />}
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save changes
      </Button>
    </form>
  )
}

export function AgencyForms({ profileId: _, agency, isOwner }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create')

  // Case 1: Owner — can update their own agency
  if (agency && isOwner) {
    return (
      <div className="rounded-xl border p-6 space-y-4">
        <p className="text-sm font-semibold">Edit Agency</p>
        <UpdateForm agency={agency} />
      </div>
    )
  }

  // Case 2: Member (not owner) — display-only, no edit
  if (agency && !isOwner) {
    return (
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">
          You are a member of this agency. Contact the agency owner to make changes.
        </p>
      </div>
    )
  }

  // Case 3: No agency — create or join
  return (
    <div className="rounded-xl border p-6 space-y-6">
      <div>
        <p className="text-sm font-semibold">Get started</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your own agency or join an existing one.
        </p>
      </div>

      <div className="flex gap-2 rounded-lg border p-1 w-fit">
        {(['create', 'join'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'create' ? 'Create agency' : 'Join agency'}
          </button>
        ))}
      </div>

      {tab === 'create' ? <CreateForm /> : <JoinForm />}
    </div>
  )
}
