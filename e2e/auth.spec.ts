import { test, expect, type Page } from '@playwright/test'
import { waitForEmail, extractFirstLink } from './utils/mailpit'

// Runs against the local Supabase CLI stack (npm run test:e2e), never the
// hosted project. Steps are sequential and share one browser context so the
// session created at verification carries through sign-out/login/reset.
test.describe.serial('Auth flows (signup -> verify -> login -> reset -> expired link)', () => {
  let page: Page
  const testEmail    = `e2e-${Date.now()}@example.test`
  const testPassword = 'Str0ng!Passw0rd'
  const newPassword  = 'Ev3nStr0nger!Pass'
  let confirmLink: string

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('registration shows the check-your-inbox state', async () => {
    await page.goto('/register')
    await page.getByPlaceholder('Jean-Pierre Mvondo').fill('E2E Test User')
    await page.getByPlaceholder('you@example.com').fill(testEmail)
    await page.getByPlaceholder('8+ chars, upper, lower, number, symbol').fill(testPassword)
    await page.getByPlaceholder('Repeat your password').fill(testPassword)
    await page.getByRole('button', { name: 'Property Buyer' }).click()
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible()
  })

  test('clicking the emailed confirmation link requires an explicit click (bot/scanner safe)', async () => {
    const { html } = await waitForEmail(testEmail)
    confirmLink = extractFirstLink(html)
    expect(confirmLink).toContain('/confirm')

    await page.goto(confirmLink)
    await expect(page.getByRole('button', { name: 'Confirm my email' })).toBeVisible()

    await page.getByRole('button', { name: 'Confirm my email' }).click()
    await page.waitForURL(/\/onboarding/)
  })

  test('sign out returns to the login page', async () => {
    await page.goto('/account')
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL(/\/login/)
  })

  test('login succeeds only after verification', async () => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(testEmail)
    await page.getByPlaceholder('••••••••').fill(testPassword)
    await page.getByRole('button', { name: 'Sign In' }).click()

    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  })

  test('forgot password flow emails a working reset link', async () => {
    // Test 4 leaves the session authenticated. /forgot-password is only
    // reachable by logged-out visitors — middleware redirects an
    // authenticated, onboarding-incomplete user to /onboarding instead,
    // which mirrors real usage (a logged-in user wouldn't need this flow).
    await page.goto('/account')
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL(/\/login/)

    await page.goto('/forgot-password')
    await page.getByPlaceholder('you@example.com').fill(testEmail)
    await page.getByRole('button', { name: 'Send Reset Link' }).click()
    await expect(page.getByRole('heading', { name: 'Reset link sent' })).toBeVisible()

    const { html } = await waitForEmail(testEmail)
    const resetLink = extractFirstLink(html)

    await page.goto(resetLink)
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible()

    await page.getByPlaceholder('8+ chars, upper, lower, number, symbol').fill(newPassword)
    await page.getByPlaceholder('Repeat your new password').fill(newPassword)
    await page.getByRole('button', { name: 'Set New Password' }).click()

    await page.waitForURL((url) => !url.pathname.startsWith('/reset-password'))
  })

  test('an already-used confirmation link fails gracefully instead of 500ing', async () => {
    // Test 5 leaves the recovery session authenticated (updateUser() reuses
    // it rather than creating a new one). /confirm is also an AUTH_ROUTE, so
    // without signing out first, middleware would bounce the user to
    // /onboarding before the "Confirm my email" button ever renders.
    await page.goto('/account')
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL(/\/login/)

    await page.goto(confirmLink)
    await page.getByRole('button', { name: 'Confirm my email' }).click()

    await expect(page.getByRole('heading', { name: 'Confirmation failed' })).toBeVisible()
  })
})
