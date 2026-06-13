'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import {
  createProperty,
  updateProperty,
  deleteProperty,
  publishProperty,
} from '@/lib/actions/properties'
import type { PropertyCreateInput } from '@/lib/validations/property'

export function useCreateProperty() {
  const router = useRouter()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: PropertyCreateInput) => createProperty(data),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.properties.lists() })
      qc.invalidateQueries({ queryKey: queryKeys.properties.my() })
      toast.success('Property created')
      router.push(`/seller/listings/${result.data!.id}/edit`)
    },
    onError: () => toast.error('Failed to create property'),
  })
}

export function useUpdateProperty(propertyId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<PropertyCreateInput>) => updateProperty(propertyId, data),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.properties.detail(propertyId) })
      qc.invalidateQueries({ queryKey: queryKeys.properties.my() })
      toast.success('Property updated')
    },
    onError: () => toast.error('Failed to update property'),
  })
}

export function useDeleteProperty() {
  const router = useRouter()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (propertyId: string) => deleteProperty(propertyId),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.properties.lists() })
      qc.invalidateQueries({ queryKey: queryKeys.properties.my() })
      toast.success('Property deleted')
      router.push('/seller/listings')
    },
    onError: () => toast.error('Failed to delete property'),
  })
}

export function usePublishProperty() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      publishProperty(id, publish),
    onSuccess: (result, { id, publish }) => {
      if (result.error) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: queryKeys.properties.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.properties.my() })
      toast.success(publish ? 'Property published' : 'Property unpublished')
    },
    onError: () => toast.error('Failed to update status'),
  })
}
