'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useQueryClient } from '@tanstack/react-query'
import { inquirySchema, type InquiryInput } from '@/lib/validations/property'
import { submitInquiry } from '@/lib/actions/properties'
import { createConversation } from '@/lib/actions/messaging'
import { queryKeys } from '@/lib/query/keys'
import { useAuthStore } from '@/stores/authStore'

interface PropertyInquiryFormProps {
  propertyId: string
  ownerId:    string
  agentId:    string | null
}

export function PropertyInquiryForm({ propertyId, ownerId, agentId }: PropertyInquiryFormProps) {
  const user        = useAuthStore(s => s.user)
  const profile     = useAuthStore(s => s.profile)
  const router      = useRouter()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      type:    'general',
      name:    profile?.full_name ?? undefined,
      email:   profile?.email ?? undefined,
      phone:   undefined,
      message: '',
    },
  })

  const type = watch('type')

  const onSubmit = async (data: InquiryInput) => {
    const recipientId = agentId ?? ownerId

    if (user?.id === recipientId) {
      toast.error("You can't send an inquiry on your own property.")
      return
    }

    // Guard: the Supabase user object is the authoritative auth identity.
    // profile (the DB row) may be null transiently but user is always set
    // for an authenticated session. createConversation() enforces auth
    // server-side independently via requireAuth().
    if (!user) {
      toast.error('You must be signed in to send an inquiry.')
      return
    }

    const result = await submitInquiry(propertyId, data)
    if (result.error) {
      toast.error(result.error)
      return
    }

    // Inquiry saved — now create the conversation thread.
    const convResult = await createConversation({
      recipientId,
      contextType:    'property',
      contextId:      propertyId,
      initialMessage: data.message,
    })

    if (convResult.error) {
      console.error('[PropertyInquiryForm] createConversation failed:', convResult.error)
      toast.error(convResult.error || 'Unable to start a conversation. Please try again.')
      return
    }

    if (!convResult.data?.conversationId) {
      console.error('[PropertyInquiryForm] createConversation returned no conversationId:', convResult)
      toast.error('Conversation was created but no ID was returned. Please contact support.')
      return
    }

    // Invalidate the shared conversations cache so the new thread appears
    // immediately in ConversationList, regardless of the 30 s stale window.
    await queryClient.invalidateQueries({ queryKey: queryKeys.messaging.conversations() })

    router.push(`/messages/${convResult.data.conversationId}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border p-5 bg-card shadow-sm">
      <h3 className="font-semibold">Send an Inquiry</h3>

      <div className="space-y-1.5">
        <Label>Inquiry Type</Label>
        <RadioGroup
          value={type}
          onValueChange={v => setValue('type', v as InquiryInput['type'])}
          className="flex gap-4"
        >
          {(['general', 'viewing', 'offer'] as const).map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <RadioGroupItem value={t} id={`type-${t}`} />
              <Label htmlFor={`type-${t}`} className="capitalize cursor-pointer font-normal">
                {t}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {!user && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="inq-name">Your Name</Label>
            <Input id="inq-name" placeholder="Full name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inq-email">Email</Label>
              <Input id="inq-email" type="email" placeholder="you@email.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inq-phone">Phone</Label>
              <Input id="inq-phone" placeholder="+237 6XX XXX XXX" {...register('phone')} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="inq-msg">Message</Label>
        <Textarea
          id="inq-msg"
          placeholder={
            type === 'viewing'
              ? 'I would like to schedule a viewing. What times are available?'
              : type === 'offer'
              ? 'I would like to make an offer of…'
              : 'Hi, I am interested in this property…'
          }
          rows={4}
          {...register('message')}
        />
        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send Inquiry
      </Button>
    </form>
  )
}
