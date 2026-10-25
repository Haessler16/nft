import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

/**
 * Smoke test for the scaffold (docs/PLAN.md → Seção 0).
 *
 * It proves the pieces that everything else depends on: the router renders the
 * shell, MSW intercepts REST at the network layer, the 404 boundary works and
 * `/account` forwards to the profile.
 */
test.describe('estrutura inicial', () => {
  test('a home renderiza o shell da KURIO', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { level: 1, name: 'SEJA DONO DO FUTURO DA ARTE DIGITAL' }),
    ).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('link', { name: 'KURIO', exact: true })).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })

  test('o service worker do MSW intercepta a API', async ({ page }) => {
    await page.goto('/')

    // The first load registers the service worker; requests only pass through
    // MSW once the page is controlled by it.
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

    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const response = await fetch('/api/health')
            if (!response.ok) return null
            return (await response.json()) as { status: string; mocked: boolean }
          }),
        { timeout: 10_000 },
      )
      .toEqual({ status: 'ok', mocked: true })
  })

  test('rota inexistente cai no 404 dentro do shell', async ({ page }) => {
    await page.goto('/rota-que-nao-existe')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada')
    await expect(page.getByRole('link', { name: 'Ir para o catálogo' })).toBeVisible()
  })

  test('/account redireciona para o perfil', async ({ page }) => {
    // `/account/*` became private in Seção 4: without a session the visitor
    // would be sent to `/login`, so the index redirect is only observable signed in.
    await signIn(page, { email: 'ava@kurio.demo' })
    await page.goto('/account')

    await expect(page).toHaveURL(/\/account\/profile$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Perfil do colecionador' }),
    ).toBeVisible()
  })
})
