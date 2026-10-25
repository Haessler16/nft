import { expect, test, type Page } from '@playwright/test'

import { resetMocks, setScenario, signIn } from './helpers'

/**
 * Order receipt and history (docs/PLAN.md → Seção 9).
 *
 * Everything is driven through the real screens: the purchase runs through the
 * checkout, the receipt is read at `/orders/:orderId` and the history at
 * `/account/orders`, all served by the MSW handlers.
 *
 * Fixture facts (`nft_004` = Cosmic Bloom): 1.29 ETH × 1 + fee 0.0005 ETH =
 * total 1.2905 ETH, and the seed starts the order sequence at `ord_0001`.
 * `price-changed` (catalog +10%) happens *after* the purchase to prove the
 * receipt is a snapshot, not a live view.
 */

const MOCK_DB_KEY = 'kurio:db:v4'

const addToCart = async (page: Page, nftId = 'nft_004') => {
  await page.goto(`/nfts/${nftId}`)
  await page.getByTestId('detalhe-comprar').click()
  await expect(page.getByTestId('detalhe-status')).toContainText('Adicionado ao carrinho.')
}

const mockOrders = (page: Page): Promise<unknown[]> =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    return (JSON.parse(raw) as { orders?: unknown[] }).orders ?? []
  }, MOCK_DB_KEY)

/** One purchase from the catalog to the confirmed order (session already open). */
const buyNft = async (page: Page) => {
  await addToCart(page)
  await page.goto('/checkout')
  await page.getByTestId('checkout-conectar').click()
  await expect(page.getByTestId('checkout-desconectar')).toBeVisible()
  await page.getByTestId('checkout-revisar').click()
  await expect(page.getByRole('dialog', { name: 'Revisar pedido' })).toBeVisible()
  await page.getByTestId('checkout-confirmar').click()
}

test.describe('pedido e recibo', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('histórico: vazio, lista o pedido após a compra e abre o recibo', async ({ page }) => {
    await signIn(page, { email: 'ava@kurio.demo', redirect: '/account/orders' })
    await expect(page).toHaveURL(/\/account\/orders$/)
    await expect(page.getByTestId('pedidos-vazio')).toBeVisible()

    await buyNft(page)
    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute('data-status', 'confirmed')

    await page.goto('/account/orders')
    const row = page.getByTestId('pedidos-linha-ord_0001')
    await expect(row).toBeVisible()
    await expect(row).toContainText('Confirmado')
    await expect(row).toContainText('1.2905 ETH')

    await row.click()
    await expect(page).toHaveURL(/\/orders\/ord_0001$/)
    await expect(page.getByTestId('recibo-pedido')).toHaveAttribute('data-status', 'confirmed')
  })

  test('recibo reproduz o snapshot e não muda com o catálogo', async ({ page }) => {
    await signIn(page, { email: 'ava@kurio.demo' })
    await buyNft(page)
    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute('data-status', 'confirmed')

    await page.getByRole('link', { name: 'Ver recibo completo' }).click()
    await expect(page).toHaveURL(/\/orders\/ord_0001$/)

    await expect(page.getByTestId('recibo-total')).toHaveText('1.2905 ETH')
    await expect(page.getByTestId('recibo-transacao')).toHaveText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)
    await expect(page.getByTestId('recibo-linha-nft_004')).toContainText('1.29 ETH')
    const hash = await page.getByTestId('recibo-transacao').textContent()

    // The catalog gains 10% *after* the purchase…
    await setScenario(page, 'price-changed')

    // …and a refresh (plus a fresh direct URL) still answers with the snapshot.
    await page.goto('/orders/ord_0001')
    await expect(page.getByTestId('recibo-pedido')).toHaveAttribute('data-status', 'confirmed')
    await expect(page.getByTestId('recibo-total')).toHaveText('1.2905 ETH')
    await expect(page.getByTestId('recibo-transacao')).toHaveText(hash ?? '')
    await expect(page.getByTestId('recibo-linha-nft_004')).toContainText('1.29 ETH')

    // The history row keeps the same frozen total too.
    await page.goto('/account/orders')
    await expect(page.getByTestId('pedidos-linha-ord_0001')).toContainText('1.2905 ETH')
  })

  test('pedido pendente abre pelo recibo e vira confirmado sem duplicar', async ({ page }) => {
    await signIn(page, { email: 'ava@kurio.demo' })
    await addToCart(page)
    await page.goto('/checkout')
    await page.getByTestId('checkout-conectar').click()
    await expect(page.getByTestId('checkout-desconectar')).toBeVisible()
    await page.getByTestId('checkout-revisar').click()
    await expect(page.getByRole('dialog', { name: 'Revisar pedido' })).toBeVisible()
    await page.getByTestId('checkout-confirmar').click()

    // Open the receipt immediately: it polls the same resource until terminal.
    await page.getByRole('link', { name: 'Ver recibo completo' }).click()
    await expect(page).toHaveURL(/\/orders\/ord_0001$/)
    await expect(page.getByTestId('recibo-pedido')).toHaveAttribute(
      'data-status',
      'confirmed',
      { timeout: 5_000 },
    )
    // The receipt path created nothing: still a single order in the mock.
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('recibo de pagamento recusado não tem transação nem explorador', async ({ page }) => {
    await signIn(page, { email: 'ava@kurio.demo' })
    await setScenario(page, 'payment-declined')
    await buyNft(page)

    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute('data-status', 'declined')
    await page.getByRole('link', { name: 'Ver recibo completo' }).click()

    await expect(page).toHaveURL(/\/orders\/ord_0001$/)
    await expect(page.getByTestId('recibo-pedido')).toHaveAttribute('data-status', 'declined')
    await expect(page.getByTestId('recibo-transacao')).toHaveText('aguardando')
    await expect(page.getByTestId('recibo-explorador')).toHaveCount(0)

    await page.goto('/account/orders')
    await expect(page.getByTestId('pedidos-linha-ord_0001')).toContainText('Recusado')
  })

  test('pedido de outro usuário e id inexistente respondem como não encontrado', async ({
    page,
  }) => {
    // User A buys one piece.
    await signIn(page, { email: 'ava@kurio.demo' })
    await buyNft(page)
    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute('data-status', 'confirmed')

    // User B signs in: A's receipt and A's history must not exist for them.
    await page.getByRole('button', { name: 'Ava' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await signIn(page, { email: 'noah@kurio.demo' })

    await page.goto('/orders/ord_0001')
    await expect(page.getByTestId('recibo-nao-encontrado')).toBeVisible()
    await expect(page.getByTestId('recibo-pedido')).toHaveCount(0)

    await page.goto('/account/orders')
    await expect(page.getByTestId('pedidos-vazio')).toBeVisible()

    // A made-up id behaves exactly like a foreign one (no existence leak).
    await page.getByRole('button', { name: 'Noah' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await signIn(page, { email: 'ava@kurio.demo' })
    await page.goto('/orders/ord_9999')
    await expect(page.getByTestId('recibo-nao-encontrado')).toBeVisible()
  })

  test('acesso direto sem sessão volta ao login preservando o recibo', async ({ page }) => {
    await page.goto('/orders/ord_0001')

    await expect(page).toHaveURL(/\/login\?redirect=%2Forders%2Ford_0001/)

    await signIn(page, { email: 'ava@kurio.demo' })
    await expect(page).toHaveURL('/orders/ord_0001')
    // Signed in, but the seed has no orders yet: honest "not found".
    await expect(page.getByTestId('recibo-nao-encontrado')).toBeVisible()
  })
})
