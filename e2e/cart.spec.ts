import { expect, test, type Page } from '@playwright/test'

import { resetMocks, setScenario, signIn } from './helpers'

/**
 * Cart and quote (docs/PLAN.md → Seção 7).
 *
 * Every test starts from the deterministic seed and drives the real UI: items
 * are added through the detail screen, and all money asserted here is what the
 * API answered (`GET /api/quote`), so the numbers double as a contract check:
 *
 * - `nft_004` (Cosmic Bloom) costs 1.29 ETH and has 2 units in the seed;
 * - network fee is 0.0005 ETH per unit (mock economics);
 * - `KURIO10` takes 10% off the subtotal, `BLACKFRIDAY` is expired and any
 *   unknown code is invalid.
 */

const CART = '/cart'

const line = (page: Page, nftId = 'nft_004') => page.getByTestId(`carrinho-linha-${nftId}`)

/** Adds through the detail screen — the only path a real visitor has. */
const addToCart = async (page: Page, nftId: string, quantity = 1) => {
  await page.goto(`/nfts/${nftId}`)
  for (let unit = 1; unit < quantity; unit += 1) {
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  }
  await page.getByTestId('detalhe-comprar').click()
  await expect(page.getByTestId('detalhe-status')).toContainText('Adicionado ao carrinho.')
}

test.describe('carrinho', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('do detalhe ao resumo: quantidade, badge e totais vêm da API', async ({ page }) => {
    await addToCart(page, 'nft_004', 2)

    // The badge shares the cart cache, so it flips in the same commit.
    await expect(page.getByTestId('header-carrinho-badge')).toHaveText('2')

    await page.goto(CART)

    await expect(line(page)).toBeVisible()
    await expect(page.getByTestId('carrinho-quantidade-nft_004')).toHaveText('2')
    await expect(page.getByTestId('carrinho-disponibilidade-nft_004')).toHaveText(
      'Disponível: 2 unidades',
    )
    await expect(page.getByTestId('carrinho-total-linha-nft_004')).toHaveText('2.58 ETH')

    // The stepper refuses what the handler would reject with 409.
    await expect(line(page).getByRole('button', { name: /Aumentar quantidade/ })).toBeDisabled()

    // 2 × 1.29 = 2.58 · fee 0.0005 × 2 = 0.001 · total 2.581 (no local math).
    await expect(page.getByTestId('carrinho-subtotal')).toHaveText('2.58 ETH')
    await expect(page.getByTestId('carrinho-taxa')).toHaveText('0.001 ETH')
    await expect(page.getByTestId('carrinho-total')).toHaveText('2.581 ETH')
    await expect(page.getByTestId('carrinho-finalizar')).toHaveAttribute('href', '/checkout')

    // Refresh survives: the cart lives in the mock DB, not in component state.
    await page.reload()
    await expect(page.getByTestId('carrinho-quantidade-nft_004')).toHaveText('2')
    await expect(page.getByTestId('header-carrinho-badge')).toHaveText('2')
  })

  test('alterar quantidade e remover atualizam resumo, badge e status', async ({ page }) => {
    await addToCart(page, 'nft_004', 2)
    await page.goto(CART)

    await line(page).getByRole('button', { name: /Diminuir quantidade/ }).click()

    await expect(page.getByTestId('carrinho-status')).toHaveText('Quantidade atualizada.')
    await expect(page.getByTestId('carrinho-quantidade-nft_004')).toHaveText('1')
    await expect(page.getByTestId('carrinho-subtotal')).toHaveText('1.29 ETH')
    await expect(page.getByTestId('carrinho-total')).toHaveText('1.2905 ETH')
    await expect(page.getByTestId('header-carrinho-badge')).toHaveText('1')

    await line(page).getByRole('button', { name: /Remover/ }).click()

    await expect(page.getByTestId('carrinho-status')).toHaveText('Item removido.')
    await expect(page.getByTestId('carrinho-vazio')).toBeVisible()
    await expect(page.getByTestId('header-carrinho-badge')).toHaveCount(0)
  })

  test('cupom: inválido e expirado apontam o campo, válido entra na URL', async ({ page }) => {
    await addToCart(page, 'nft_004')
    await page.goto(CART)

    const input = page.getByTestId('carrinho-cupom-input')

    await input.fill('NAOEXISTE')
    await page.getByTestId('carrinho-cupom-aplicar').click()
    await expect(page.getByTestId('carrinho-cupom-erro')).toHaveText('Cupom inválido.')
    // A rejected code never replaces a summary that was already correct.
    await expect(page).not.toHaveURL(/coupon=/)
    await expect(page.getByTestId('carrinho-subtotal')).toHaveText('1.29 ETH')

    await input.fill('BLACKFRIDAY')
    await page.getByTestId('carrinho-cupom-aplicar').click()
    await expect(page.getByTestId('carrinho-cupom-erro')).toHaveText('Cupom expirado.')

    await input.fill('kurio10')
    await page.getByTestId('carrinho-cupom-aplicar').click()
    await expect(page.getByTestId('carrinho-cupom-aplicado')).toHaveText('KURIO10')
    await expect(page).toHaveURL(/coupon=KURIO10/)
    await expect(page.getByTestId('carrinho-desconto')).toContainText('0.129 ETH')
    await expect(page.getByTestId('carrinho-total')).toHaveText('1.1615 ETH')

    // The confirmed coupon lives in the URL, so a refresh reproduces the quote.
    await page.reload()
    await expect(page.getByTestId('carrinho-cupom-aplicado')).toHaveText('KURIO10')

    await page.getByTestId('carrinho-cupom-remover').click()
    await expect(page.getByTestId('carrinho-cupom-aplicado')).toHaveCount(0)
    await expect(page).not.toHaveURL(/coupon=/)
    await expect(page.getByTestId('carrinho-desconto')).toHaveCount(0)
    await expect(page.getByTestId('carrinho-total')).toHaveText('1.2905 ETH')
  })

  test('cupom digitado só na URL degrada sem derrubar a tela', async ({ page }) => {
    await addToCart(page, 'nft_004')
    // Hand-edited address: the quote answers 422 on `fields.coupon` and the
    // rows (from `GET /api/cart`) keep rendering with a way out.
    await page.goto(`${CART}?coupon=NAOEXISTE`)

    await expect(line(page)).toBeVisible()
    await expect(page.getByTestId('carrinho-resumo-erro')).toContainText('Cupom inválido.')
    await expect(page.getByTestId('carrinho-cupom-aplicado')).toHaveText('NAOEXISTE')
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  })

  test('carrinho do visitante é mantido ao entrar na conta', async ({ page }) => {
    await addToCart(page, 'nft_004', 2)

    await signIn(page, { email: 'ava@kurio.demo', redirect: '/cart' })

    // The login handler merges guest → account; the screen re-reads that scope.
    await expect(page).toHaveURL(/\/cart$/)
    await expect(line(page)).toBeVisible()
    await expect(page.getByTestId('header-carrinho-badge')).toHaveText('2')
  })

  test('cenário price-changed atualiza o total e sinaliza a cotação', async ({ page }) => {
    await addToCart(page, 'nft_004')
    await setScenario(page, 'price-changed')
    await page.goto(CART)

    // Seed price 1.29 → +10% = 1.419, fee 0.0005 → 1.4195 total.
    await expect(page.getByTestId('carrinho-alerta-preco')).toBeVisible()
    await expect(page.getByTestId('carrinho-subtotal')).toHaveText('1.419 ETH')
    await expect(page.getByTestId('carrinho-total')).toHaveText('1.4195 ETH')
  })

  test('cenário sold-out bloqueia a quantidade e explica o motivo', async ({ page }) => {
    await addToCart(page, 'nft_004', 2)
    await setScenario(page, 'sold-out')
    await page.goto(CART)

    await expect(page.getByTestId('carrinho-alerta-disponibilidade')).toBeVisible()
    await expect(page.getByTestId('carrinho-disponibilidade-nft_004')).toHaveText('Esgotada')
    await expect(line(page).getByRole('button', { name: /Aumentar quantidade/ })).toBeDisabled()
    await expect(line(page).getByRole('button', { name: /Diminuir quantidade/ })).toBeEnabled()
  })

  test('carrinho vazio convida a voltar ao catálogo', async ({ page }) => {
    await page.goto(CART)

    await expect(page.getByTestId('carrinho-vazio')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explorar o catálogo' })).toBeVisible()
    await expect(page.getByTestId('header-carrinho-badge')).toHaveCount(0)
  })
})
