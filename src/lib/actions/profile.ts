'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
export async function toggleProfessionalAvailability(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase as any)
    .from('professional_profiles')
    .select('is_available')
    .eq('id', user.id)
    .single()

  if (!current) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('professional_profiles')
    .update({ is_available: !current.is_available })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
}

export async function updateProfileAvatar(avatarUrl: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
}
