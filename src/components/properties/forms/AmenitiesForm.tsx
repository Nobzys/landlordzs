'use client'

import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { PropertyCreateInput } from '@/lib/validations/property'

const AMENITY_GROUPS = [
  {
    category: 'Outdoor',
    items: ['Swimming Pool', 'Garden', 'Parking Space', 'Garage', 'Balcony', 'Terrace'],
  },
  {
    category: 'Security',
    items: ['CCTV', 'Intercom', 'Fence', 'Security Cabin', 'Electric Fence'],
  },
  {
    category: 'Utilities',
    items: ['Solar Panels', 'Water Tank', 'Backup Electricity', 'Internet Ready', 'Cable TV'],
  },
  {
    category: 'Indoor',
    items: ['Air Conditioning', 'Built-in Wardrobes', 'Modern Kitchen', 'Staff Quarters', 'Gym'],
  },
]

interface AmenitiesFormProps {
  form: UseFormReturn<PropertyCreateInput>
}

export function AmenitiesForm({ form }: AmenitiesFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'amenities',
  })

  const toggle = (category: string, name: string, checked: boolean) => {
    const idx = fields.findIndex(f => f.category === category && f.name === name)
    if (idx >= 0) {
      form.setValue(`amenities.${idx}.has_feature`, checked)
    } else {
      append({ category, name, has_feature: checked })
    }
  }

  const isChecked = (category: string, name: string): boolean => {
    const found = fields.find(f => f.category === category && f.name === name)
    return found?.has_feature ?? false
  }

  return (
    <div className="space-y-6">
      {AMENITY_GROUPS.map(group => (
        <div key={group.category}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            {group.category}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {group.items.map(item => {
              const id = `${group.category}-${item}`
              const checked = isChecked(group.category, item)
              return (
                <div key={item} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={v => toggle(group.category, item, !!v)}
                  />
                  <Label htmlFor={id} className="font-normal cursor-pointer text-sm">{item}</Label>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
