import { describe, it, expect } from 'vitest'
import { passwordSchema, registerSchema, resetPasswordSchema, changePasswordSchema } from './auth'

describe('passwordSchema (Sprint 1, Task 2)', () => {
  const valid = 'Str0ng!Pass'

  it('accepts a password meeting all 5 rules', () => {
    expect(passwordSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects fewer than 8 characters', () => {
    const result = passwordSchema.safeParse('Sh0rt!')
    expect(result.success).toBe(false)
  })

  it('rejects a password with no uppercase letter', () => {
    const result = passwordSchema.safeParse('str0ng!pass')
    expect(result.success).toBe(false)
  })

  it('rejects a password with no lowercase letter', () => {
    const result = passwordSchema.safeParse('STR0NG!PASS')
    expect(result.success).toBe(false)
  })

  it('rejects a password with no number', () => {
    const result = passwordSchema.safeParse('Strong!Pass')
    expect(result.success).toBe(false)
  })

  it('rejects a password with no special character', () => {
    const result = passwordSchema.safeParse('Str0ngPass')
    expect(result.success).toBe(false)
  })
})

describe('registerSchema password rules', () => {
  const base = { full_name: 'Jean Mvondo', email: 'jean@example.com', role: 'buyer' as const }

  it('rejects a password missing a special character', () => {
    const result = registerSchema.safeParse({
      ...base, password: 'Str0ngPass', confirm_password: 'Str0ngPass',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a fully compliant password', () => {
    const result = registerSchema.safeParse({
      ...base, password: 'Str0ng!Pass', confirm_password: 'Str0ng!Pass',
    })
    expect(result.success).toBe(true)
  })
})

describe('resetPasswordSchema password rules', () => {
  it('rejects a password missing a special character', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Str0ngPass', confirm_password: 'Str0ngPass',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a fully compliant password', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Str0ng!Pass', confirm_password: 'Str0ng!Pass',
    })
    expect(result.success).toBe(true)
  })
})

describe('changePasswordSchema', () => {
  it('rejects when new_password and confirm_password do not match', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'OldPass1!',
      new_password: 'Str0ng!Pass',
      confirm_password: 'Different1!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when new_password equals current_password', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'Str0ng!Pass',
      new_password: 'Str0ng!Pass',
      confirm_password: 'Str0ng!Pass',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a new_password that fails complexity rules', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'OldPass1!',
      new_password: 'weakpass',
      confirm_password: 'weakpass',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid change request', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'OldPass1!',
      new_password: 'Str0ng!Pass',
      confirm_password: 'Str0ng!Pass',
    })
    expect(result.success).toBe(true)
  })
})
