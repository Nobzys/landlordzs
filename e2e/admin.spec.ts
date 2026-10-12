import { test, expect } from '@playwright/test'

test.describe('Admin dashboard access control', () => {
  test('unauthenticated user cannot access admin dashboard', async ({ page }) => {
    await page.goto('/admin')
    // Must redirect away from /admin
    await expect(page).not.toHaveURL(/\/admin($|\/)/)
  })

  test('unauthenticated user cannot access admin KYC panel', async ({ page }) => {
    await page.goto('/admin/kyc')
    await expect(page).not.toHaveURL(/\/admin\/kyc/)
  })

  test('unauthenticated user cannot access admin users panel', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).not.toHaveURL(/\/admin\/users/)
  })
})
