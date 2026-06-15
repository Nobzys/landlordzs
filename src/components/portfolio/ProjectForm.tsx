'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createProject, updateProject } from '@/lib/actions/portfolio'
import type { ProjectInput } from '@/lib/actions/portfolio'

interface ProjectFormProps {
  projectId?:    string
  defaultValues?: Partial<ProjectInput>
}

const CURRENT_YEAR = new Date().getFullYear()

export function ProjectForm({ projectId, defaultValues }: ProjectFormProps) {
  const router              = useRouter()
  const [isPending, start]  = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [saved, setSaved]   = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const fd   = new FormData(e.currentTarget)
    const yearRaw = fd.get('completion_year') as string | null
    const data: ProjectInput = {
      title:              (fd.get('title') as string)?.trim() ?? '',
      description:        (fd.get('description') as string)?.trim() || undefined,
      category:           (fd.get('category') as string)?.trim() || undefined,
      completion_year:    yearRaw ? parseInt(yearRaw, 10) : null,
      location:           (fd.get('location') as string)?.trim() || undefined,
      client_name:        (fd.get('client_name') as string)?.trim() || undefined,
      client_testimonial: (fd.get('client_testimonial') as string)?.trim() || undefined,
      is_public:          fd.get('is_public') === 'true',
    }

    start(async () => {
      if (projectId) {
        const res = await updateProject(projectId, data)
        if (res.error) setError(res.error)
        else setSaved(true)
      } else {
        const res = await createProject(data)
        if (res.error) {
          setError(res.error)
        } else if (res.data?.id) {
          router.push(`/account/portfolio/${res.data.id}/edit`)
        }
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="proj-title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="proj-title"
          name="title"
          required
          defaultValue={defaultValues?.title ?? ''}
          placeholder="e.g. 3-Bedroom Residential Build, Douala"
          className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Category + Year */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="proj-category" className="text-sm font-medium">Category</label>
          <input
            id="proj-category"
            name="category"
            defaultValue={defaultValues?.category ?? ''}
            placeholder="e.g. Residential Construction"
            className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="proj-year" className="text-sm font-medium">Completion Year</label>
          <input
            id="proj-year"
            name="completion_year"
            type="number"
            min={1990}
            max={CURRENT_YEAR}
            defaultValue={defaultValues?.completion_year ?? ''}
            placeholder={String(CURRENT_YEAR)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label htmlFor="proj-location" className="text-sm font-medium">Location</label>
        <input
          id="proj-location"
          name="location"
          defaultValue={defaultValues?.location ?? ''}
          placeholder="e.g. Douala, Cameroon"
          className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="proj-description" className="text-sm font-medium">Description</label>
        <textarea
          id="proj-description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ''}
          placeholder="Describe the project, scope of work, challenges, and outcome…"
          className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Client name (not shown publicly) */}
      <div className="space-y-1.5">
        <label htmlFor="proj-client" className="text-sm font-medium">
          Client Name
          <span className="ml-2 text-xs text-muted-foreground font-normal">(not shown publicly)</span>
        </label>
        <input
          id="proj-client"
          name="client_name"
          defaultValue={defaultValues?.client_name ?? ''}
          placeholder="Optional — kept private"
          className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Testimonial */}
      <div className="space-y-1.5">
        <label htmlFor="proj-testimonial" className="text-sm font-medium">Client Testimonial</label>
        <textarea
          id="proj-testimonial"
          name="client_testimonial"
          rows={3}
          defaultValue={defaultValues?.client_testimonial ?? ''}
          placeholder="Optional — quote from the client shown on your public profile"
          className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Visibility</p>
        <div className="flex gap-6">
          {[
            { value: 'true',  label: 'Public', hint: 'Visible on your public profile' },
            { value: 'false', label: 'Private', hint: 'Only visible to you' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="is_public"
                value={opt.value}
                defaultChecked={
                  opt.value === 'true'
                    ? (defaultValues?.is_public ?? true)
                    : !(defaultValues?.is_public ?? true)
                }
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Error + Success */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-emerald-600">Changes saved.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending
          ? (projectId ? 'Saving…' : 'Creating…')
          : (projectId ? 'Save Changes' : 'Create Project')
        }
      </Button>
    </form>
  )
}
