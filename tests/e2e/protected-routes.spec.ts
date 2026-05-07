import { test, expect } from '@playwright/test'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/new-content',
  '/drafts',
  '/calendar',
  '/writing-style',
  '/settings',
]

test.describe('Protected routes — unauthenticated redirect', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`GET ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  test('root / redirects unauthenticated users', async ({ page }) => {
    await page.goto('/')
    // Root redirects to dashboard which then redirects to login
    await expect(page).toHaveURL(/\/(login|dashboard)/)
  })
})
