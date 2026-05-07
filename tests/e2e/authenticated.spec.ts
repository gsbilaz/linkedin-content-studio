import { test, expect, type Page } from '@playwright/test'

// These tests require a real test account. Set TEST_USER_EMAIL and
// TEST_USER_PASSWORD in .env.local (or your CI environment) to enable them.
// They are skipped automatically when credentials are not provided.

const EMAIL = process.env.TEST_USER_EMAIL ?? ''
const PASSWORD = process.env.TEST_USER_PASSWORD ?? ''
const HAS_CREDENTIALS = Boolean(EMAIL && PASSWORD)

// Run sequentially so multiple simultaneous logins don't saturate Supabase auth
test.describe.configure({ mode: 'serial' })

test.describe('Authenticated flows', () => {
  test.skip(!HAS_CREDENTIALS, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated tests')

  // Generous timeout: dev-server auth + page renders can be slow
  test.setTimeout(60_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/password/i).fill(PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 })
    // Wait for the dashboard to fully hydrate before each test body runs
    await page.waitForLoadState('networkidle')
  })

  // On mobile the sidebar lives inside a Radix Sheet.
  // Next.js App Router preserves layout state across client-side navigations,
  // so the Sheet stays open after clicking a nav link. Only click the hamburger
  // when the Sheet is not already open.
  async function openMobileNavIfNeeded(page: Page) {
    const viewport = page.viewportSize()
    if (viewport && viewport.width < 1024) {
      const isOpen = await page.locator('[role="dialog"][data-state="open"]').count()
      if (!isOpen) {
        await page.locator('button[aria-label="Open navigation menu"]').click()
        await page.waitForTimeout(300)
      }
    }
  }

  test('dashboard renders stat cards', async ({ page }) => {
    await expect(page.getByText('Active Drafts')).toBeVisible()
    await expect(page.getByText('Published')).toBeVisible()
    // exact:true prevents matching "No scheduled posts yet" (getByText is case-insensitive by default)
    await expect(page.getByText('Scheduled', { exact: true })).toBeVisible()
    await expect(page.getByText('Writing Samples')).toBeVisible()
  })

  test('dashboard quick actions link to correct pages', async ({ page }) => {
    const link = page.getByRole('link', { name: /new content/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/new-content/)
  })

  test('new content page renders type selection', async ({ page }) => {
    await page.goto('/new-content')
    await expect(page.getByRole('heading', { name: /new content/i })).toBeVisible()
    await expect(page.getByText('Text / Notes')).toBeVisible()
  })

  test('drafts page renders without error', async ({ page }) => {
    await page.goto('/drafts')
    await expect(page.getByRole('heading', { name: /drafts/i })).toBeVisible()
  })

  test('settings page shows LinkedIn and AI provider sections', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /linkedin connection/i })).toBeVisible()
    await expect(page.getByText(/anthropic/i).first()).toBeVisible()
    await expect(page.getByText(/openai/i).first()).toBeVisible()
  })

  test('writing style page renders', async ({ page }) => {
    await page.goto('/writing-style')
    await expect(page.getByRole('heading', { name: /writing style/i })).toBeVisible()
  })

  test('calendar page renders', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible()
  })

  test('navigation sidebar links work', async ({ page }) => {
    const links = [
      { name: /dashboard/i, url: /\/dashboard/ },
      { name: /drafts/i,    url: /\/drafts/ },
      { name: /calendar/i,  url: /\/calendar/ },
      { name: /settings/i,  url: /\/settings/ },
    ]
    for (const { name, url } of links) {
      await openMobileNavIfNeeded(page)
      await page.getByRole('link', { name }).first().click()
      await expect(page).toHaveURL(url)
    }
  })

  test('sign out returns to login', async ({ page }) => {
    await openMobileNavIfNeeded(page)
    // .evaluate() calls the native DOM click(), bypassing the Next.js dev overlay
    // (nextjs-portal) that captures pointer events and blocks Playwright's click()
    await page.getByRole('button', { name: /sign out/i }).evaluate(
      el => (el as HTMLButtonElement).click()
    )
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
