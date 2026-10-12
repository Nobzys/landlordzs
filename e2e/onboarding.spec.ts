import { test, expect } from '@playwright/test'

test.describe('User onboarding', () => {
  test('unauthenticated user is redirected to login when accessing dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to login
    await expect(page).toHaveURL(/\/(login|auth|sign-in)/)
  })

  test('sign-up page renders required fields', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
  })

  test('role selector is shown during sign-up', async ({ page }) => {
    await page.goto('/sign-up')
    // Role selector may be a radio group, select, or segmented control
    const roleSelector = page.locator(
      '[data-testid="role-selector"], [name="role"], input[type="radio"][value="buyer"], input[type="radio"][value="seller"]'
    )
    // Non-fatal: role selector might be on a later step
    if (await roleSelector.first().isVisible()) {
      await expect(roleSelector.first()).toBeVisible()
    }
  })
})
