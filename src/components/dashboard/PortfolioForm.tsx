'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle, ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  PortfolioImageUpload,
  type PortfolioImage,
} from '@/components/dashboard/PortfolioImageUpload'
import { createPortfolioItem, updatePortfolioItem, addPortfolioImage } from '@/lib/actions/profile'
import { uploadPortfolioImage } from '@/lib/supabase/storage'
import { CAMEROON_CITIES } from '@/lib/utils/constants'

const MAX_IMAGES = 10

const PROJECT_TYPES = [
  'Residential Construction',
  'Commercial Construction',
  'Renovation / Refurbishment',
  'Civil Engineering',
  'Architectural Design',
  'Interior Design',
  'Plumbing',
  'Electrical',
  'Roofing',
  'Landscaping',
  'Legal Advisory',
  'Other',
] as const

interface PortfolioFormProps {
  mode: 'create' | 'edit'
  portfolioId?: string
  userId: string
  defaultValues?: {
    title?:        string
    description?:  string
    project_type?: string
    client_name?:  string
    city?:         string
    budget_xaf?:   number
    completed_at?: string
  }
  existingImages?: PortfolioImage[]
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

type StagedFile = { localId: string; file: File; previewUrl: string }

export function PortfolioForm({
  mode,
  portfolioId,
  userId,
  defaultValues = {},
  existingImages = [],
}: PortfolioFormProps) {
  const router  = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult]   = useState<{ success?: boolean; error?: string } | null>(null)
  const [city, setCity]       = useState(defaultValues.city ?? '')
  const [projectType, setProjectType] = useState(defaultValues.project_type ?? '')

  // Staged images — create mode only
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [imageError, setImageError]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canAddMore = stagedFiles.length < MAX_IMAGES

  function addStagedFiles(files: FileList | null) {
    if (!files) return
    setImageError(null)
    const remaining = MAX_IMAGES - stagedFiles.length
    const incoming  = Array.from(files).slice(0, remaining)
    const newStaged: StagedFile[] = incoming.map(file => ({
      localId:    crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setStagedFiles(prev => [...prev, ...newStaged])
  }

  function removeStagedFile(localId: string) {
    setStagedFiles(prev => {
      const target = prev.find(f => f.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter(f => f.localId !== localId)
    })
  }

  function buildInput(fd: FormData) {
    const str = (key: string) => (fd.get(key) as string | null)?.trim() || undefined
    const num = (key: string): number | undefined => {
      const v = parseInt(fd.get(key) as string, 10)
      return isNaN(v) ? undefined : v
    }

    return {
      title:        (fd.get('title') as string).trim(),
      description:  str('description'),
      project_type: projectType || undefined,
      client_name:  str('client_name'),
      city:         city || undefined,
      budget_xaf:   num('budget_xaf'),
      completed_at: str('completed_at'),
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      setResult(null)
      setImageError(null)

      const input = buildInput(fd)

      if (mode === 'create') {
        const res = await createPortfolioItem(input)
        if (res.error) { setResult({ error: res.error }); return }

        const newId = res.data!.id

        // Upload staged images; failures are non-fatal
        for (let i = 0; i < stagedFiles.length; i++) {
          try {
            const { url } = await uploadPortfolioImage(newId, stagedFiles[i].file, userId)
            await addPortfolioImage(newId, url, i === 0, i)
          } catch (err) {
            setImageError(
              `Project created, but photo ${i + 1} failed: ${err instanceof Error ? err.message : 'Upload error'}. Add it on the edit page.`
            )
            break
          }
        }

        router.push('/contractor/portfolio')
        return
      }

      // Edit mode
      const res = await updatePortfolioItem(portfolioId!, input)
      setResult(res.error ? { error: res.error } : { success: true })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Project details */}
      <div className="rounded-xl border p-5 space-y-4">
        <p className="text-sm font-semibold">Project Details</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="title">Project title <span className="text-destructive">*</span></Label>
            <Input
              id="title" name="title" required
              placeholder="e.g. 3-bedroom villa — Bastos, Yaoundé"
              defaultValue={defaultValues.title}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Project type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(pt => (
                  <SelectItem key={pt} value={pt}>{pt}</SelectItem>
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
                <SelectItem value="">No city</SelectItem>
                {CAMEROON_CITIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client_name">Client name</Label>
            <Input
              id="client_name" name="client_name"
              placeholder="Optional — displayed on portfolio"
              defaultValue={defaultValues.client_name}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="completed_at">Completion date</Label>
            <Input
              id="completed_at" name="completed_at"
              type="date"
              defaultValue={defaultValues.completed_at}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget_xaf">Project value (XAF)</Label>
            <Input
              id="budget_xaf" name="budget_xaf"
              type="number" min={0} step={1}
              placeholder="Approximate budget in XAF"
              defaultValue={defaultValues.budget_xaf}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description" name="description" rows={4}
              placeholder="Describe the scope, challenges, materials used, and outcome…"
              defaultValue={defaultValues.description}
            />
          </div>
        </div>
      </div>

      {/* Images */}
      {mode === 'edit' && portfolioId ? (
        <div className="rounded-xl border p-5">
          <PortfolioImageUpload
            portfolioId={portfolioId}
            userId={userId}
            initialImages={existingImages}
          />
        </div>
      ) : (
        <div className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Project Photos</p>
            <span className="text-xs text-muted-foreground">{stagedFiles.length} / {MAX_IMAGES}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {stagedFiles.map((sf, idx) => (
              <div
                key={sf.localId}
                className="group relative aspect-square rounded-lg border overflow-hidden bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sf.previewUrl} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeStagedFile(sf.localId)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={e => addStagedFiles(e.target.files)}
          />

          {imageError && <StatusAlert type="error" message={imageError} />}

          <p className="text-xs text-muted-foreground">
            JPEG, PNG, or WebP · max 25 MB each · up to {MAX_IMAGES} photos · first photo becomes the cover
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col gap-3">
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Add Project' : 'Save Changes'}
          </Button>
        </div>
        {result?.error   && <StatusAlert type="error"   message={result.error} />}
        {result?.success && <StatusAlert type="success" message="Project updated." />}
      </div>
    </form>
  )
}
