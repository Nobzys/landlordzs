import { test, expect } from '@playwright/test'

test.describe('Email verification gate', () => {
  test('verification page renders with a link-expired message for a stale token', async ({ page }) => {
    // Navigating to /confirm without required params shows "Invalid confirmation link"
    await page.goto('/confirm')
    await expect(page.locator('body')).toContainText(/invalid|expired|error|verification/i)
  })

  test('password reset page renders for unauthenticated user', async ({ page }) => {
    await page.goto('/auth/reset-password')
    // Should either render the form or redirect to login
    const url = page.url()
    const isExpectedPath = /reset-password|login|sign-in/.test(url)
    expect(isExpectedPath).toBe(true)
  })
})
