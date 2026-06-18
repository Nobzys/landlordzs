import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { updatePassword } from './auth'

const mockUser = { id: 'user-1', email: 'jean@example.com' }

function buildSupabaseMock(opts: { verifyFails?: boolean; updateFails?: boolean } = {}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null }),
      signInWithPassword: async () =>
        opts.verifyFails
          ? { data: null, error: { message: 'Invalid login credentials' } }
          : { data: { user: mockUser }, error: null },
      updateUser: async () =>
        opts.updateFails
          ? { data: null, error: { message: 'Update failed' } }
          : { data: { user: mockUser }, error: null },
    },
  }
}

const valid = {
  current_password: 'OldPass1!',
  new_password: 'Str0ng!Pass',
  confirm_password: 'Str0ng!Pass',
}

describe('updatePassword RBAC/complexity (Sprint 1, Task 2)', () => {
  it('rejects a new password that fails complexity rules before touching Supabase', async () => {
    const supabase = buildSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const result = await updatePassword({
      current_password: 'OldPass1!', new_password: 'weakpass', confirm_password: 'weakpass',
    })
    expect(result.error).toBeTruthy()
  })

  it('rejects mismatched confirm_password', async () => {
    const supabase = buildSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const result = await updatePassword({
      current_password: 'OldPass1!', new_password: 'Str0ng!Pass', confirm_password: 'Other1!Pass',
    })
    expect(result.error).toBeTruthy()
  })

  it('rejects when new password equals current password', async () => {
    const supabase = buildSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const result = await updatePassword({
      current_password: 'Str0ng!Pass', new_password: 'Str0ng!Pass', confirm_password: 'Str0ng!Pass',
    })
    expect(result.error).toBeTruthy()
  })

  it('rejects when current password does not verify', async () => {
    const supabase = buildSupabaseMock({ verifyFails: true })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const result = await updatePassword(valid)
    expect(result.error).toBe('Current password is incorrect.')
  })

  it('succeeds for a valid, compliant password change', async () => {
    const supabase = buildSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const result = await updatePassword(valid)
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })

  it('surfaces a Supabase updateUser error', async () => {
    const supabase = buildSupabaseMock({ updateFails: true })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const result = await updatePassword(valid)
    expect(result.error).toBe('Update failed')
  })
})
