import { test, expect } from '@playwright/test'

test.describe('Escrow access control', () => {
  test('unauthenticated user cannot access escrow page', async ({ page }) => {
    await page.goto('/account/escrow')
    // Must redirect away from /account/escrow
    await expect(page).not.toHaveURL(/\/account\/escrow/)
  })

  test('unauthenticated user cannot access payment pages', async ({ page }) => {
    await page.goto('/account/payments')
    await expect(page).not.toHaveURL(/\/account\/payments/)
  })
})
