import { type Page } from '@playwright/test'

/**
 * Shared setup for the E2E suites: every test starts from the deterministic
 * mock seed, so the catalog, the accounts and the availability rules are the
 * same for everyone running the suite.
 */

/**
 * The service worker takes control before the app can answer mocked requests.
 *
 * Checking only `navigator.serviceWorker.controller` is not enough after a full
 * navigation: the controller survives the reload, but the new page has not
 * started its MSW client yet, so an immediate POST to `/api/__mock/*` can fall
 * through to Vite and receive a 404. Polling the mocked health endpoint proves
 * that this document is actually intercepting requests.
 */
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
  await page.waitForFunction(
    async () => {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) return false
        const body = (await response.json()) as { mocked?: boolean }
        return body.mocked === true
      } catch {
        return false
      }
    },
    undefined,
    { timeout: 15_000 },
  )
}

export const resetMocks = async (page: Page) => {
  await page.goto('/')
  await waitForMocks(page)
  const response = await page.evaluate(async () => {
    const reset = await fetch('/api/__mock/reset', { method: 'POST' })
    return reset.ok
  })
  if (!response) throw new Error('Não foi possível reiniciar o estado dos mocks.')
}

/** Applies a deterministic network scenario (docs/PLAN.md → Seção 2). */
export const setScenario = async (page: Page, scenario: string) => {
  // A previous navigation may still be bootstrapping MSW; without this wait the
  // scenario POST can silently hit the dev server instead of the worker.
  await waitForMocks(page)
  const applied = await page.evaluate(async (value) => {
    const response = await fetch('/api/__mock/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: value }),
    })
    if (!response.ok) return false
    const body = (await response.json()) as { scenario?: string }
    return body.scenario === value
  }, scenario)
  if (!applied) throw new Error(`Não foi possível aplicar o cenário "${scenario}".`)
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
