'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUpload } from './ImageUpload'
import { VideoUpload } from './VideoUpload'
import { AmenitiesForm } from './AmenitiesForm'
import { CAMEROON_CITIES } from '@/lib/utils/constants'
import { propertyCreateSchema, type PropertyCreateInput } from '@/lib/validations/property'
import { createProperty, updateProperty } from '@/lib/actions/properties'
import { cn } from '@/lib/utils/cn'

const STEPS = ['Basic Info', 'Details', 'Media', 'Amenities', 'Review'] as const
type Step = 0 | 1 | 2 | 3 | 4

const LISTING_TYPES  = [{ value: 'sale', label: 'For Sale' }, { value: 'rent', label: 'For Rent' }, { value: 'shortlet', label: 'Shortlet' }]
const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' }, { value: 'villa', label: 'Villa' },
  { value: 'house', label: 'House' }, { value: 'studio', label: 'Studio' },
  { value: 'duplex', label: 'Duplex' }, { value: 'penthouse', label: 'Penthouse' },
  { value: 'commercial_space', label: 'Commercial Space' }, { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' }, { value: 'shop', label: 'Shop' },
  { value: 'land', label: 'Land' }, { value: 'farm', label: 'Farm' }, { value: 'hotel', label: 'Hotel' },
]
const LAND_TITLES = [
  { value: 'titre_foncier', label: 'Titre Foncier' }, { value: 'bail_emphyteotique', label: 'Bail Emphytéotique' },
  { value: 'concession', label: 'Concession' }, { value: 'none', label: 'None' },
]

interface PropertyFormProps {
  mode: 'create' | 'edit'
  propertyId?: string
  userId: string
  defaultValues?: Partial<PropertyCreateInput>
}

export function PropertyForm({ mode, propertyId, userId, defaultValues }: PropertyFormProps) {
  const [step, setStep]         = useState<Step>(0)
  const [savedId, setSavedId]   = useState<string | null>(propertyId ?? null)
  const router                  = useRouter()

  const form = useForm<PropertyCreateInput>({
    resolver: zodResolver(propertyCreateSchema),
    defaultValues: {
      listing_type:  'sale',
      property_type: 'apartment',
      city:          'yaounde',
      land_title:    'none',
      bedrooms:      1,
      bathrooms:     1,
      toilets:       1,
      is_negotiable: false,
      is_furnished:  false,
      has_security:  false,
      has_generator: false,
      has_borehole:  false,
      amenities:     [],
      ...defaultValues,
    },
  })

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue, getValues } = form

  const goNext = async () => {
    const stepFields: Record<Step, (keyof PropertyCreateInput)[]> = {
      0: ['title', 'listing_type', 'property_type', 'city', 'price'],
      1: ['bedrooms', 'bathrooms', 'toilets', 'land_title'],
      2: [],
      3: [],
      4: [],
    }

    const valid = await form.trigger(stepFields[step] as any)
    if (!valid) return

    // Auto-save on first step completion for media uploads
    if (step === 0 && !savedId && mode === 'create') {
      const data = getValues()
      const result = await createProperty(data)
      if (result.error) { toast.error(result.error); return }
      setSavedId(result.data!.id)
    }

    setStep(s => (s + 1) as Step)
  }

  const onSubmit = async (data: PropertyCreateInput) => {
    if (mode === 'create' && savedId) {
      const result = await updateProperty(savedId, data)
      if (result.error) { toast.error(result.error); return }
      toast.success('Property saved! You can publish it from your listings.')
      router.push('/seller/listings')
    } else if (mode === 'create') {
      const result = await createProperty(data)
      if (result.error) { toast.error(result.error); return }
      toast.success('Property created!')
      router.push('/seller/listings')
    } else if (mode === 'edit' && propertyId) {
      const result = await updateProperty(propertyId, data)
      if (result.error) { toast.error(result.error); return }
      toast.success('Property updated')
      router.push('/seller/listings')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                i < step  ? 'bg-blue-600 text-white' :
                i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                             'bg-muted text-muted-foreground'
              )}>
                {i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-1', i < step ? 'bg-blue-600' : 'bg-muted')} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>

            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Spacious 3-bedroom apartment in Bastos" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Listing Type</Label>
                <Select value={watch('listing_type')} onValueChange={v => setValue('listing_type', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Property Type</Label>
                <Select value={watch('property_type')} onValueChange={v => setValue('property_type', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Select value={watch('city')} onValueChange={v => setValue('city', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMEROON_CITIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Neighborhood</Label>
                <Input placeholder="e.g. Bastos, Bonanjo" {...register('neighborhood')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="Street address (optional)" {...register('address')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (XAF)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...register('price', { valueAsNumber: true })}
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="is_negotiable"
                  checked={watch('is_negotiable')}
                  onCheckedChange={v => setValue('is_negotiable', v)}
                />
                <Label htmlFor="is_negotiable" className="font-normal cursor-pointer">Negotiable</Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Describe your property…" rows={5} {...register('description')} />
            </div>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Property Details</h2>

            <div className="grid grid-cols-3 gap-3">
              {(['bedrooms', 'bathrooms', 'toilets'] as const).map(field => (
                <div key={field} className="space-y-1.5">
                  <Label className="capitalize">{field}</Label>
                  <Input type="number" min={0} {...register(field, { valueAsNumber: true })} />
                  {errors[field] && <p className="text-xs text-destructive">{errors[field]!.message}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Area (m²)</Label>
                <Input type="number" placeholder="Interior area" {...register('area_sqm', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Land Area (m²)</Label>
                <Input type="number" placeholder="Total plot size" {...register('land_area_sqm', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Land Title</Label>
                <Select value={watch('land_title')} onValueChange={v => setValue('land_title', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAND_TITLES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year Built</Label>
                <Input type="number" placeholder="e.g. 2018" {...register('year_built', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is_furnished"
                checked={watch('is_furnished')}
                onCheckedChange={v => setValue('is_furnished', v)}
              />
              <Label htmlFor="is_furnished" className="font-normal cursor-pointer">Furnished</Label>
            </div>

            <div className="space-y-3">
              <Label>Features</Label>
              {(['has_security', 'has_generator', 'has_borehole'] as const).map(f => (
                <div key={f} className="flex items-center gap-3">
                  <Switch
                    id={f}
                    checked={watch(f)}
                    onCheckedChange={v => setValue(f, v)}
                  />
                  <Label htmlFor={f} className="font-normal cursor-pointer capitalize">
                    {f.replace('has_', '').replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Media */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Photos & Videos</h2>
            {savedId ? (
              <>
                <div>
                  <Label className="mb-3 block">Photos</Label>
                  <ImageUpload propertyId={savedId} userId={userId} />
                </div>
                <div>
                  <Label className="mb-3 block">Videos (optional)</Label>
                  <VideoUpload propertyId={savedId} userId={userId} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete basic info first to enable media uploads.
              </p>
            )}
          </div>
        )}

        {/* Step 3: Amenities */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Amenities & Features</h2>
            <AmenitiesForm form={form} />
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review</h2>
            <div className="rounded-lg border p-4 text-sm space-y-2 text-muted-foreground">
              <ReviewRow label="Title"        value={watch('title')} />
              <ReviewRow label="Type"         value={`${watch('listing_type')} / ${watch('property_type')}`} />
              <ReviewRow label="City"         value={watch('city')} />
              <ReviewRow label="Price"        value={`${watch('price')?.toLocaleString()} XAF`} />
              <ReviewRow label="Bedrooms"     value={watch('bedrooms')} />
              <ReviewRow label="Bathrooms"    value={watch('bathrooms')} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(s => (s - 1) as Step)}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Save Property' : 'Update Property'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="font-medium text-foreground">{label}</span>
      <span className="capitalize">{value ?? '—'}</span>
    </div>
  )
}
