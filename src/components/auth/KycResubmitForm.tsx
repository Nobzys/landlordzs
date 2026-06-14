'use client'

import { useState, useTransition, useRef } from 'react'
import { Upload, FileCheck, AlertCircle, CheckSquare, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { submitKycDocuments } from '@/lib/actions/auth'
import { STORAGE_BUCKETS } from '@/lib/utils/constants'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/types/auth'

interface Props { profile: Profile }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_BYTES = 20 * 1024 * 1024

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
  label: string
  hint: string
  required?: boolean
  file: File | null
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

export function KycResubmitForm({ profile }: Props) {
  const [isPending, startTransition] = useTransition()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack]   = useState<File | null>(null)
  const [cert, setCert]       = useState<File | null>(null)

  const uploadFile = async (file: File, docType: string): Promise<string> => {
    const validErr = validateFile(file)
    if (validErr) throw new Error(validErr)

    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.id}/${docType}-${Date.now()}.${ext}`

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        const frontPath = await uploadFile(idFront, 'national-id-front')
        const backPath  = await uploadFile(idBack,  'national-id-back')
        const certPath  = cert ? await uploadFile(cert, 'professional-cert') : null

        const result = await submitKycDocuments({
          national_id_front: frontPath,
          national_id_back:  backPath,
          professional_cert: certPath,
        })

        if (result?.error) {
          setUploadError(result.error)
          return
        }

        setSubmitted(true)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.'
        setUploadError(msg)
      }
    })
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
        <div>
          <p className="font-semibold text-emerald-800">Documents submitted!</p>
          <p className="text-sm text-emerald-700 mt-1">
            Our team will review your credentials within 1–2 business days.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Your account will remain in <strong>pending verification</strong> status until our team reviews your documents.
          You can still set up your profile but will not appear in public search results.
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
    </div>
  )
}
