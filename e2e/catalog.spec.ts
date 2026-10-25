import { expect, test, type Page } from '@playwright/test'

/**
 * Catalog flows (docs/PLAN.md → Seção 5).
 *
 * Every test starts from the deterministic mock seed and drives the real UI.
 * Filters, sort and pagination must live in the URL, so the assertions check
 * `page.url()` as well as the rendered result.
 */

const waitForMocks = async (page: Page) => {
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

const resetMocks = async (page: Page) => {
  await page.goto('/')
  await waitForMocks(page)
  await page.evaluate(async () => {
    await fetch('/api/__mock/reset', { method: 'POST' })
  })
}

const cardNames = (page: Page) =>
  page.locator('#catalogo ul > li h3').allTextContents()

test.describe('catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('mostra a primeira página com dados do MSW', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('#catalogo ul > li')).toHaveCount(6)
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Paginação do catálogo' })).toBeVisible()
  })

  test('filtro por categoria entra na URL, reinicia a paginação e reduz o resultado', async ({
    page,
  }) => {
    await page.goto('/?page=2')
    await expect(page).toHaveURL(/page=2/)
    await expect(page.locator('#catalogo ul > li')).toHaveCount(6)

    // Mobile keeps the filters inside a disclosure; desktop shows them inline.
    const mobileFilters = page.getByTestId('catalogo-filtros-mobile')
    if (await mobileFilters.isVisible()) {
      await mobileFilters.locator('summary').click()
    }
    const filters = (await page.getByTestId('catalogo-filtros-desktop').isVisible())
      ? page.getByTestId('catalogo-filtros-desktop')
      : mobileFilters

    // A plain click: the filter re-renders the grid, so the input node is replaced
    // and `check()` would fail its post-condition even though the URL changed.
    await filters.getByRole('checkbox', { name: 'Arte digital (4)' }).click()

    await expect(page).toHaveURL(/categories=/)
    await expect(page).toHaveURL(/page=1/)
    await expect(page.locator('#catalogo ul > li')).toHaveCount(4)
  })

  test('paginação altera a URL e o histórico restaura o estado anterior', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#catalogo ul > li')).toHaveCount(6)
    const firstPageNames = await cardNames(page)
    expect(firstPageNames.length).toBe(6)

    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.locator('#catalogo ul > li')).toHaveCount(6)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await page.goBack()
    await expect(page.locator('#catalogo ul > li h3')).toHaveText(firstPageNames)
  })

  test('busca pelo cabeçalho filtra e mantém o termo na URL', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByLabel('Buscar NFTs por nome, coleção ou categoria').fill('golden')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()

    await expect(page).toHaveURL(/q=golden/)
    const names = await cardNames(page)
    expect(names.length).toBeGreaterThan(0)
    expect(names.every((name) => name.toLowerCase().includes('golden'))).toBe(true)
  })

  test('busca em tempo real faz debounce (um request por pausa, não por tecla)', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    const input = page.getByLabel('Buscar NFTs por nome, coleção ou categoria')
    await input.focus()

    // First keystroke: the debounce window (350 ms) has not elapsed, so the
    // URL — and therefore the request — must still be untouched.
    await input.press('g')
    await page.waitForTimeout(200)
    await expect(page).not.toHaveURL(/q=/)

    // The remaining keys restart the timer: one pause, one navigation.
    await input.pressSequentially('olden', { delay: 30 })

    await expect(page).toHaveURL(/q=golden/)
    const names = await cardNames(page)
    expect(names.length).toBeGreaterThan(0)
    expect(names.every((name) => name.toLowerCase().includes('golden'))).toBe(true)
  })

  test('resultado vazio explica o estado e limpar filtros recupera o catálogo', async ({
    page,
  }) => {
    await page.goto('/?q=nada-encontrado')

    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await page.getByTestId('catalogo-limpar-vazio').click()

    await expect(page).not.toHaveURL(/q=/)
    await expect(page.locator('#catalogo ul > li')).toHaveCount(6)
  })

  test('ordenação por menor preço reflete a resposta da API', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Ordenar por:').selectOption('price-asc')

    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(page.locator('#catalogo ul > li').first()).toContainText('0.39 ETH')
  })

  test('aba de novos lançamentos ordena por data e volta a página 1', async ({ page }) => {
    await page.goto('/?page=3')

    await page.getByRole('tab', { name: 'Novos lançamentos' }).click()

    await expect(page).toHaveURL(/tab=novos/)
    await expect(page).toHaveURL(/sort=recent/)
    await expect(page).toHaveURL(/page=1/)
  })
})
