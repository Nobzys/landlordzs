'use client'

import { useState, useTransition, useRef } from 'react'
import { Upload, FileCheck, AlertCircle, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { submitKycDocuments, completeOnboarding } from '@/lib/actions/auth'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/types/auth'

interface KycUploadStepProps {
  profile:  Profile
  onFinish: (redirectTo: string) => void
  onError:  (msg: string) => void
}

type UploadedPaths = {
  national_id_front: string | null
  national_id_back:  string | null
  professional_cert: string | null
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG, or PDF files are accepted.'
  if (file.size > MAX_BYTES) return 'File must be under 20 MB.'
  return null
}

function FileInput({
  label,
  hint,
  required,
  file,
  onChange,
  disabled,
}: {
  label:    string
  hint:     string
  required?: boolean
  file:     File | null
  onChange: (f: File | null) => void
  disabled: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div
        className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors
          ${file ? 'border-primary/40 bg-primary/5' : 'border-muted hover:border-muted-foreground/40'}`}
        onClick={() => !disabled && ref.current?.click()}
      >
        {file ? (
          <FileCheck className="h-5 w-5 text-primary shrink-0" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm truncate min-w-0">
          {file ? file.name : 'Click to select file'}
        </span>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="ml-auto text-xs text-muted-foreground hover:text-destructive shrink-0"
            disabled={disabled}
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          onChange(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function KycUploadStep({ profile, onFinish, onError }: KycUploadStepProps) {
  const [isPending, startTransition] = useTransition()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [idFront,  setIdFront]  = useState<File | null>(null)
  const [idBack,   setIdBack]   = useState<File | null>(null)
  const [cert,     setCert]     = useState<File | null>(null)

  const uploadFile = async (file: File, docType: string): Promise<string> => {
    const validErr = validateFile(file)
    if (validErr) throw new Error(validErr)

    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.id}/${docType}-${Date.now()}.${ext}`

    const supabase = createClient()
    const { error } = await (supabase as any).storage
      .from(STORAGE_BUCKETS.VERIFY_DOCS)
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) throw new Error(error.message)
    return path
  }

  const handleSubmit = () => {
    if (!idFront) { setUploadError('National ID front photo is required.'); return }
    if (!idBack)  { setUploadError('National ID back photo is required.'); return }

    setUploadError(null)
    startTransition(async () => {
      try {
        const paths: UploadedPaths = {
          national_id_front: null,
          national_id_back:  null,
          professional_cert: null,
        }

        paths.national_id_front = await uploadFile(idFront, 'national-id-front')
        paths.national_id_back  = await uploadFile(idBack,  'national-id-back')
        if (cert) {
          paths.professional_cert = await uploadFile(cert, 'professional-cert')
        }

        const r1 = await submitKycDocuments(paths)
        if (r1?.error) { onError(r1.error); return }

        const r2 = await completeOnboarding()
        if (r2?.error) { onError(r2.error); return }

        onFinish(r2.data?.redirectTo ?? '/account')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.'
        setUploadError(msg)
      }
    })
  }

  const handleSkip = () => {
    startTransition(async () => {
      const r = await completeOnboarding()
      if (r?.error) { onError(r.error); return }
      onFinish(r.data?.redirectTo ?? '/account')
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Your account will remain in <strong>pending verification</strong> status until our team reviews your documents. You can still set up your profile but will not appear in public search results.
        </p>
      </div>

      <div className="space-y-4">
        <FileInput
          label="National ID — Front"
          hint="Clear photo or scan of the front of your national ID card"
          required
          file={idFront}
          onChange={setIdFront}
          disabled={isPending}
        />
        <FileInput
          label="National ID — Back"
          hint="Clear photo or scan of the back of your national ID card"
          required
          file={idBack}
          onChange={setIdBack}
          disabled={isPending}
        />
        <FileInput
          label="Professional Certificate / License"
          hint="Optional — your license, degree, or professional registration certificate"
          file={cert}
          onChange={setCert}
          disabled={isPending}
        />
      </div>

      {uploadError && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {uploadError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={handleSubmit} className="w-full" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckSquare size={16} />
              Submit Documents
            </span>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={handleSkip}
          disabled={isPending}
        >
          Skip for now — I&apos;ll upload later
        </Button>
      </div>
    </div>
  )
}
