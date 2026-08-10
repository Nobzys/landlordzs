'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { requestPropertyBooking } from '@/lib/actions/properties'
import { useAuthStore } from '@/stores/authStore'

interface PropertyBookingFormProps {
  propertyId: string
}

export function PropertyBookingForm({ propertyId }: PropertyBookingFormProps) {
  const profile = useAuthStore(s => s.profile)
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [checkIn, setCheckIn]   = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [notes, setNotes]       = useState('')

  const today = new Date().toISOString().slice(0, 10)

  if (!profile) {
    return (
      <div className="rounded-xl border p-5 bg-card shadow-sm text-center space-y-3">
        <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <p className="text-sm font-medium">Request a Booking</p>
        <p className="text-xs text-muted-foreground">
          Sign in to request dates for this short-term rental.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href="/login">Sign in</a>
        </Button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="rounded-xl border p-5 bg-card shadow-sm text-center space-y-3">
        <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
        <p className="text-sm font-medium">Booking request sent!</p>
        <p className="text-xs text-muted-foreground">
          The owner will review your request and respond shortly.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setSubmitted(false); setCheckIn(''); setCheckOut(''); setNotes('') }}
        >
          Send another request
        </Button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!checkIn || !checkOut) {
      toast.error('Please select both check-in and check-out dates.')
      return
    }
    startTransition(async () => {
      const result = await requestPropertyBooking(propertyId, checkIn, checkOut, notes || undefined)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setSubmitted(true)
      toast.success('Booking request sent successfully.')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-5 bg-card shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Request to Book</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="book-checkin" className="text-xs">Check-in</Label>
          <input
            id="book-checkin"
            type="date"
            min={today}
            value={checkIn}
            onChange={e => {
              setCheckIn(e.target.value)
              if (checkOut && e.target.value >= checkOut) setCheckOut('')
            }}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="book-checkout" className="text-xs">Check-out</Label>
          <input
            id="book-checkout"
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={e => setCheckOut(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {checkIn && checkOut && checkOut > checkIn && (
        <p className="text-xs text-muted-foreground">
          {Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)} night
          {Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000) !== 1 ? 's' : ''}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="book-notes" className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="book-notes"
          placeholder="Any special requirements or questions for the owner…"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={500}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Request Booking
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        The owner will review and confirm your request. No payment required now.
      </p>
    </form>
  )
}
