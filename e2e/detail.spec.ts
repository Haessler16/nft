import { expect, test } from '@playwright/test'

import { resetMocks, setScenario, signIn } from './helpers'

/**
 * NFT detail and favorites (docs/PLAN.md → Seção 6).
 *
 * Every case starts from the deterministic seed, so the availability numbers
 * asserted here (2 units on `nft_004`, sold out on `nft_007`, 19 reviews on
 * `nft_001`) are part of the fixture contract.
 */

const NFT = '/nfts/nft_001'

test.describe('detalhe do NFT', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('acesso direto mostra os dados da API, a trilha e a coleção', async ({ page }) => {
    await page.goto(NFT)

    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByText('1.19 ETH')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Trilha de navegação' })).toBeVisible()
    await expect(page.getByText('ID do token:', { exact: true })).toBeVisible()
    // Exact match: `#042` also appears inside the title and the breadcrumb.
    await expect(page.getByText('#042', { exact: true })).toBeVisible()

    const related = page.getByRole('region', { name: 'Mais desta coleção' })
    await expect(related.locator('article')).toHaveCount(5)
  })

  test('NFT inexistente responde 404 dentro do shell', async ({ page }) => {
    await page.goto('/nfts/que-nao-existe')

    await expect(page.getByRole('heading', { level: 1, name: 'Este NFT não está disponível' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'KURIO', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar ao mercado' })).toBeVisible()
  })

  test('galeria troca a vista selecionada pelas miniaturas', async ({ page }) => {
    await page.goto(NFT)

    await expect(
      page.getByRole('img', { name: /Emerald Ape #042 — obra da coleção Kurio Editions/ }),
    ).toBeVisible()

    const thumbs = page.getByRole('group', { name: 'Vistas da imagem' })
    if (await thumbs.isVisible()) {
      const macro = thumbs.getByRole('button', { name: 'Ver macro de Emerald Ape #042' })
      await expect(macro).toHaveAttribute('aria-pressed', 'false')
      await macro.click()
      await expect(macro).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('quantidade é limitada pela disponibilidade da edição', async ({ page }) => {
    // The seed gives nft_004 exactly two purchasable units.
    await page.goto('/nfts/nft_004')

    await expect(page.getByText('máx. 2')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeEnabled()

    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(page.locator('output')).toHaveText('2')
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
  })

  test('edição esgotada sinaliza o estado e bloqueia a compra', async ({ page }) => {
    // The seed marks nft_007 as sold out.
    await page.goto('/nfts/nft_007')

    await expect(page.getByTestId('detalhe-edicao-estado')).toHaveText('Esgotada')
    await expect(page.getByTestId('detalhe-esgotado')).toBeVisible()
    await expect(page.getByTestId('detalhe-comprar')).toHaveCount(0)
    await expect(page.getByText('Nenhuma unidade disponível')).toBeVisible()
  })

  test('aba de avaliações lista os comentários dos colecionadores', async ({ page }) => {
    await page.goto(NFT)

    await page.getByRole('tab', { name: /Avaliações de colecionadores/ }).click()

    // The fixture cycles six review texts, so the same comment repeats: take
    // the first occurrence instead of asserting a unique match.
    await expect(
      page.getByText('Peça impecável: proveniência confere', { exact: false }).first(),
    ).toBeVisible()
    await expect(page.getByRole('tab', { name: /Avaliações de colecionadores/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('adicionar ao carrinho a partir do detalhe confirma na região de status', async ({
    page,
  }) => {
    await page.goto(NFT)

    await page.getByTestId('detalhe-comprar').click()

    await expect(page.getByTestId('detalhe-status')).toContainText('Adicionado ao carrinho.')
    await expect(page.getByRole('link', { name: 'Ver carrinho' })).toBeVisible()
  })

  test('favoritar com sessão persiste após o refresh', async ({ page }) => {
    await signIn(page, { email: 'ava@kurio.demo' })
    await page.goto(NFT)

    const favorite = page.getByTestId('detalhe-favoritar')
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')

    await favorite.click()
    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
    await expect(favorite).toContainText('Favoritado')

    await page.reload()
    await expect(page.getByTestId('detalhe-favoritar')).toHaveAttribute('aria-pressed', 'true')
  })

  test('falha na mutation de favorito faz rollback com feedback acessível', async ({ page }) => {
    await signIn(page, { email: 'ava@kurio.demo' })
    // `flaky` answers every favorite mutation with 503 (docs/PLAN.md → Seção 2).
    await setScenario(page, 'flaky')
    await page.goto(NFT)

    const favorite = page.getByTestId('detalhe-favoritar')
    await favorite.click()

    await expect(page.getByTestId('detalhe-status')).toContainText(
      'O estado anterior foi restaurado.',
    )
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')

    const serverState = await page.evaluate(async () => {
      const response = await fetch('/api/favorites')
      return (await response.json()) as { nftIds: string[] }
    })
    expect(serverState.nftIds).toEqual([])
  })
})
