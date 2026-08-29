'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createRentalListingSchema,
  createRentalBookingSchema,
  updateRentalStatusSchema,
} from '@/lib/validations/rental'

type RentalListingRow = {
  id:              string
  owner_id:        string
  daily_rate:      number
  deposit_amount:  number
  min_rental_days: number
  max_rental_days: number | null
  is_available:    boolean
}

type BookingRow = {
  id:        string
  owner_id:  string
  renter_id: string
  status:    string
}

// ─── createRentalListing ────────────────────────────────────────────────────
// Creates a text-only rental listing (no image upload — deferred to a future phase).
// Images column defaults to '{}' at the DB level.
export async function createRentalListing(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', listingId: null }

  const parsed = createRentalListingSchema.safeParse({
    name:            formData.get('name'),
    description:     formData.get('description') || undefined,
    type:            formData.get('type'),
    category_id:     formData.get('category_id') || null,
    city:            formData.get('city'),
    address:         formData.get('address') || undefined,
    condition:       formData.get('condition') || 'good',
    daily_rate:      formData.get('daily_rate'),
    weekly_rate:     formData.get('weekly_rate') || null,
    monthly_rate:    formData.get('monthly_rate') || null,
    deposit_amount:  formData.get('deposit_amount') ?? 0,
    min_rental_days: formData.get('min_rental_days') ?? 1,
    max_rental_days: formData.get('max_rental_days') || null,
    make:            formData.get('make') || undefined,
    model_name:      formData.get('model_name') || undefined,
    year:            formData.get('year') || null,
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid listing details', listingId: null }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listing, error } = await (supabase as any)
    .from('rental_listings')
    .insert({ owner_id: user.id, images: [], ...parsed.data })
    .select('id')
    .single() as { data: { id: string } | null; error: unknown }

  if (error || !listing) return { error: 'Failed to create listing', listingId: null }

  revalidatePath('/rentals')
  return { success: true, listingId: listing.id }
}

// ─── createRentalBooking ────────────────────────────────────────────────────
// Validates dates, checks overlap, fetches owner_id server-side, inserts booking.
export async function createRentalBooking(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', bookingId: null }

  const parsed = createRentalBookingSchema.safeParse({
    listing_id:   formData.get('listing_id'),
    start_date:   formData.get('start_date'),
    end_date:     formData.get('end_date'),
    pickup_notes: formData.get('pickup_notes') || undefined,
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid booking details', bookingId: null }
  }

  const { listing_id, start_date, end_date, pickup_notes } = parsed.data

  // Validate that dates are real and ordered correctly
  const startMs = Date.parse(start_date)
  const endMs   = Date.parse(end_date)
  if (isNaN(startMs) || isNaN(endMs))
    return { error: 'Invalid date format', bookingId: null }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (startMs < today.getTime())
    return { error: 'Start date cannot be in the past', bookingId: null }
  if (endMs <= startMs)
    return { error: 'End date must be after start date', bookingId: null }

  const days_count = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24))

  // Fetch listing server-side — never trust client-supplied owner_id or rates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listing } = await (supabase as any)
    .from('rental_listings')
    .select('id, owner_id, daily_rate, deposit_amount, min_rental_days, max_rental_days, is_available')
    .eq('id', listing_id)
    .single() as { data: RentalListingRow | null }

  if (!listing)              return { error: 'Listing not found', bookingId: null }
  if (!listing.is_available) return { error: 'This listing is not currently available for booking', bookingId: null }
  if (listing.owner_id === user.id)
    return { error: 'You cannot book your own listing', bookingId: null }
  if (days_count < listing.min_rental_days)
    return {
      error: `Minimum rental period is ${listing.min_rental_days} day${listing.min_rental_days === 1 ? '' : 's'}`,
      bookingId: null,
    }
  if (listing.max_rental_days && days_count > listing.max_rental_days)
    return { error: `Maximum rental period is ${listing.max_rental_days} days`, bookingId: null }

  // Overlap check: find any existing pending/confirmed/active booking whose dates
  // overlap the requested range. Overlap: NOT (existing.end <= req.start OR existing.start >= req.end)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: overlapping } = await (supabase as any)
    .from('rental_bookings')
    .select('id')
    .eq('listing_id', listing_id)
    .in('status', ['pending', 'confirmed', 'active'])
    .lt('start_date', end_date)
    .gt('end_date', start_date)
    .limit(1) as { data: { id: string }[] | null }

  if (overlapping && overlapping.length > 0)
    return { error: 'This listing is already booked for the selected dates', bookingId: null }

  const subtotal = listing.daily_rate * days_count
  const deposit  = listing.deposit_amount
  const total    = subtotal + deposit

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking, error: bookErr } = await (supabase as any)
    .from('rental_bookings')
    .insert({
      listing_id,
      renter_id:      user.id,
      owner_id:       listing.owner_id,
      start_date,
      end_date,
      days_count,
      daily_rate:     listing.daily_rate,
      subtotal,
      deposit,
      total,
      currency:       'XAF',
      status:         'pending',
      payment_status: 'pending',
      pickup_notes:   pickup_notes ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: unknown }

  if (bookErr || !booking) return { error: 'Failed to submit booking request', bookingId: null }

  return { success: true, bookingId: booking.id }
}

// ─── updateRentalStatus ─────────────────────────────────────────────────────
// Owner allowed transitions: pending→confirmed, pending→cancelled, confirmed→active,
//   confirmed→cancelled, active→completed.
// Renter allowed transitions: pending→cancelled, confirmed→cancelled.
export async function updateRentalStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = updateRentalStatusSchema.safeParse({
    booking_id: formData.get('booking_id'),
    status:     formData.get('status'),
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: first?.message ?? 'Invalid input' }
  }

  const { booking_id, status } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase as any)
    .from('rental_bookings')
    .select('id, owner_id, renter_id, status')
    .eq('id', booking_id)
    .single() as { data: BookingRow | null }

  if (!booking) return { error: 'Booking not found' }

  const isOwner  = booking.owner_id  === user.id
  const isRenter = booking.renter_id === user.id

  const OWNER_TRANSITIONS: Record<string, string[]> = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['active', 'cancelled'],
    active:    ['completed'],
  }
  const RENTER_TRANSITIONS: Record<string, string[]> = {
    pending:   ['cancelled'],
    confirmed: ['cancelled'],
  }

  const allowed = isOwner
    ? (OWNER_TRANSITIONS[booking.status] ?? [])
    : isRenter
      ? (RENTER_TRANSITIONS[booking.status] ?? [])
      : []

  if (!allowed.includes(status))
    return { error: 'This status change is not permitted' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('rental_bookings')
    .update({ status })
    .eq('id', booking_id)
    .eq(isOwner ? 'owner_id' : 'renter_id', user.id)

  if (error) return { error: 'Failed to update booking status' }

  revalidatePath('/rentals')
  return { success: true }
}
