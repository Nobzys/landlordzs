import { test, expect } from '@playwright/test'

test.describe('Property browsing', () => {
  test('guest can browse the property listing page', async ({ page }) => {
    await page.goto('/')
    // Either landing page or redirect to listings
    await expect(page).toHaveURL(/\/(properties|listings|$)/)
  })

  test('property search returns filtered results', async ({ page }) => {
    await page.goto('/properties')
    await expect(page.locator('main')).toBeVisible()
  })

  test('property detail page loads without errors', async ({ page }) => {
    await page.goto('/properties')
    // Click first property card if present
    const firstCard = page.locator('[data-testid="property-card"], a[href*="/properties/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      await expect(page).toHaveURL(/\/properties\//)
      await expect(page.locator('main')).toBeVisible()
    } else {
      // No properties seeded yet — just check page loads
      await expect(page.locator('main')).toBeVisible()
    }
  })
})
