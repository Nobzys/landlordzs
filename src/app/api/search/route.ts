import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { propertySearchSchema } from '@/lib/validations/property'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const parsed = propertySearchSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { q, listing_type, property_type, city, min_price, max_price, bedrooms, is_furnished, page, limit } = parsed.data
  const from = (page - 1) * limit
  const to   = from + limit - 1

  const supabase = await createClient()
  let query = supabase
    .from('properties')
    .select('*, property_images(*)', { count: 'exact' })
    .eq('status', 'active')
    .range(from, to)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (q)            query = query.or(`title.ilike.%${q}%,neighborhood.ilike.%${q}%`)
  if (listing_type) query = query.eq('listing_type', listing_type)
  if (property_type)query = query.eq('property_type', property_type)
  if (city)         query = query.eq('city', city)
  if (min_price)    query = query.gte('price', min_price)
  if (max_price)    query = query.lte('price', max_price)
  if (bedrooms)     query = query.gte('bedrooms', bedrooms)
  if (is_furnished !== undefined) query = query.eq('is_furnished', is_furnished)

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    items:   data ?? [],
    total:   count ?? 0,
    page,
    hasMore: (count ?? 0) > to + 1,
  })
}
