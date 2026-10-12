'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEscrow } from '@/lib/actions/escrow'
import type { CreateEscrowInput } from '@/lib/validations/payment'

interface MilestoneField {
  title: string
  amount: number
  due_date: string
  description: string
}

interface FormValues {
  payee_id: string
  amount: number
  description: string
  milestones: MilestoneField[]
}

interface CreateEscrowFormProps {
  payeeId?: string
  referenceType?: string
  referenceId?: string
  onSuccess?: (id: string) => void
}

export function CreateEscrowForm({
  payeeId,
  referenceType = 'service_request',
  referenceId,
  onSuccess,
}: CreateEscrowFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      payee_id:   payeeId ?? '',
      amount:     0,
      description: '',
      milestones: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' })

  const totalAmount  = watch('amount')
  const milestones   = watch('milestones')
  const milestoneSum = milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0)
  const milestoneDiff = milestones.length > 0 ? milestoneSum - (Number(totalAmount) || 0) : 0

  const onSubmit = async (values: FormValues) => {
    setError(null)
    setPending(true)
    try {
      const input: CreateEscrowInput = {
        payee_id:       values.payee_id,
        amount:         Number(values.amount),
        reference_type: referenceType,
        reference_id:   referenceId ?? crypto.randomUUID(),
        description:    values.description || undefined,
        milestones:     milestones.length > 0
          ? milestones.map(m => ({
              title:       m.title,
              amount:      Number(m.amount),
              due_date:    m.due_date || undefined,
              description: m.description || undefined,
            }))
          : undefined,
      }

      const result = await createEscrow(input)

      if (result.error) {
        setError(result.error)
      } else if (result.data?.id) {
        onSuccess?.(result.data.id)
        router.push(`/account/escrow/${result.data.id}`)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Parties & amount */}
      <div className="space-y-4">
        {!payeeId && (
          <div className="space-y-1">
            <Label htmlFor="payee_id">Payee User ID</Label>
            <Input
              id="payee_id"
              placeholder="UUID of the person receiving funds"
              {...register('payee_id', { required: 'Payee is required' })}
            />
            {errors.payee_id && <p className="text-xs text-destructive">{errors.payee_id.message}</p>}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="amount">Total Amount (XAF)</Label>
          <Input
            id="amount"
            type="number"
            min={10000}
            step={500}
            placeholder="10000"
            {...register('amount', {
              required: 'Amount is required',
              min: { value: 10000, message: 'Minimum escrow is 10,000 XAF' },
            })}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          <p className="text-xs text-muted-foreground">Platform fee: 2.5% deducted on release</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            placeholder="e.g. Renovation work for property at 12 Main St"
            {...register('description')}
          />
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Milestones</p>
            <p className="text-xs text-muted-foreground">Optional — break payment into stages</p>
          </div>
          {fields.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ title: '', amount: 0, due_date: '', description: '' })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add milestone
            </Button>
          )}
        </div>

        {fields.length > 0 && (
          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="rounded-xl border p-3 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Milestone {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Input
                      placeholder="Title (e.g. Foundation work)"
                      {...register(`milestones.${i}.title`, { required: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="Amount (XAF)"
                      min={1}
                      step={500}
                      {...register(`milestones.${i}.amount`, { required: true, min: 1 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="date"
                      {...register(`milestones.${i}.due_date`)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Sum validation */}
            <div className={`text-xs px-1 ${milestoneDiff === 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              Milestone total: {milestoneSum.toLocaleString()} XAF
              {milestoneDiff !== 0 && ` (${milestoneDiff > 0 ? '+' : ''}${milestoneDiff.toLocaleString()} vs. escrow total)`}
              {milestoneDiff === 0 && milestones.length > 0 && ' ✓'}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || (milestones.length > 0 && milestoneDiff !== 0)}
      >
        <Shield className="h-4 w-4 mr-2" />
        {pending ? 'Creating…' : 'Create Escrow'}
      </Button>
    </form>
  )
}
