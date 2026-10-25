import { type Page } from '@playwright/test'

/**
 * Shared setup for the E2E suites: every test starts from the deterministic
 * mock seed, so the catalog, the accounts and the availability rules are the
 * same for everyone running the suite.
 */

/** The service worker only intercepts after it takes control of the page. */
export const waitForMocks = async (page: Page) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      )
    }
  })
}

export const resetMocks = async (page: Page) => {
  await page.goto('/')
  await waitForMocks(page)
  await page.evaluate(async () => {
    await fetch('/api/__mock/reset', { method: 'POST' })
  })
}

/** Applies a deterministic network scenario (docs/PLAN.md → Seção 2). */
export const setScenario = async (page: Page, scenario: string) => {
  await page.evaluate(async (value) => {
    await fetch('/api/__mock/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: value }),
    })
  }, scenario)
}

/** Signs in through the real form (never through the mocked API directly). */
export const signIn = async (
  page: Page,
  {
    email,
    password = 'demo1234',
    redirect,
  }: { email: string; password?: string; redirect?: string },
) => {
  // Already on the login screen (e.g. sent by a route guard): keep its
  // `redirect` param so the return destination is not lost.
  if (!new URL(page.url()).pathname.startsWith('/login')) {
    const search = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
    await page.goto(`/login${search}`)
  }
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  // The submit is async: wait for the screen to actually leave `/login`, so a
  // following `page.goto` can never abort the login request in flight.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}
