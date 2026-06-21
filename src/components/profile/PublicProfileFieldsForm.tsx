'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updatePublicProfileDetails } from '@/lib/actions/profile'

interface PublicProfileFieldsFormProps {
  companyName: string | null
  yearsExperience: number | null
  specialties: string[]
  serviceAreas: string[]
  websiteUrl: string | null
}

export function PublicProfileFieldsForm({
  companyName, yearsExperience, specialties, serviceAreas, websiteUrl,
}: PublicProfileFieldsFormProps) {
  const [company, setCompany] = useState(companyName ?? '')
  const [years, setYears] = useState(yearsExperience?.toString() ?? '')
  const [specialtiesText, setSpecialtiesText] = useState(specialties.join(', '))
  const [areasText, setAreasText] = useState(serviceAreas.join(', '))
  const [website, setWebsite] = useState(websiteUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updatePublicProfileDetails({
        company_name: company.trim() || null,
        years_experience: years.trim() ? Number(years) : null,
        specialties: specialtiesText.split(',').map((s) => s.trim()).filter(Boolean),
        service_areas: areasText.split(',').map((s) => s.trim()).filter(Boolean),
        website_url: website.trim() || null,
      })
      if (res?.error) { setError(res.error); return }
      setSaved(true)
    })
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border p-4 space-y-4">
      <p className="text-sm font-medium">Public profile details</p>

      <div className="space-y-1.5">
        <Label htmlFor="pp-company">Company name</Label>
        <Input id="pp-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company or business name" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pp-years">Years of experience</Label>
        <Input id="pp-years" type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pp-specialties">Specialties</Label>
        <Textarea id="pp-specialties" rows={2} value={specialtiesText} onChange={(e) => setSpecialtiesText(e.target.value)} placeholder="Comma-separated, e.g. Residential, Land surveys" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pp-areas">Service areas</Label>
        <Textarea id="pp-areas" rows={2} value={areasText} onChange={(e) => setAreasText(e.target.value)} placeholder="Comma-separated, e.g. Douala, Yaounde" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pp-website">Website</Label>
        <Input id="pp-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !isPending && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          Saved successfully
        </div>
      )}

      <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
    </form>
  )
}
