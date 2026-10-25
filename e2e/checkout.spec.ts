import { expect, test, type Page } from '@playwright/test'

import { resetMocks, setScenario, signIn } from './helpers'

/**
 * Checkout (docs/PLAN.md → Seção 8).
 *
 * Everything runs through the real screens and the MSW layer; the only
 * white-box read is the mock's `localStorage`, used to prove that a repeated
 * click or a timeout did **not** create a second order (there is no order list
 * endpoint yet — that arrives with the receipt in Seção 9).
 *
 * Fixture facts used below (`nft_004` = Cosmic Bloom): price 1.29 ETH, 2 units
 * in the seed, network fee 0.0005 per unit → total 1.2905 ETH. The
 * `price-changed` scenario adds 10% → 1.419 + 0.0005 = 1.4195 ETH.
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

const connectWallet = async (page: Page) => {
  await page.getByTestId('checkout-conectar').click()
  await expect(page.getByTestId('checkout-desconectar')).toBeVisible()
}

const openReview = async (page: Page) => {
  await page.getByTestId('checkout-revisar').click()
  await expect(page.getByRole('dialog', { name: 'Revisar pedido' })).toBeVisible()
}

/** Signed in, one piece in the cart, wallet connected, review dialog open. */
const reachReview = async (page: Page) => {
  await signIn(page, { email: 'ava@kurio.demo', redirect: '/checkout' })
  await addToCart(page)
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-total')).toHaveText('1.2905 ETH')
  await connectWallet(page)
  await openReview(page)
}

test.describe('checkout', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('compra completa do carrinho ao pedido confirmado, com retomada após refresh', async ({
    page,
  }) => {
    await reachReview(page)

    await expect(page.getByTestId('checkout-revisao-total')).toHaveText('1.2905 ETH')
    await page.getByTestId('checkout-confirmar').click()

    // Pending is transient: the panel polls until the simulation settles.
    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute(
      'data-status',
      'confirmed',
    )
    await expect(page.getByTestId('checkout-pedido-total')).toHaveText('1.2905 ETH')

    // Confirmation removed only the bought units: the badge disappears.
    await expect(page.getByTestId('header-carrinho-badge')).toHaveCount(0)

    // A refresh reopens the same order instead of an empty cart.
    await page.reload()
    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute(
      'data-status',
      'confirmed',
    )

    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('clique repetido no confirmar cria um único pedido', async ({ page }) => {
    await reachReview(page)

    await page.getByTestId('checkout-confirmar').dblclick()

    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute(
      'data-status',
      'confirmed',
    )
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('cotação que muda durante a revisão exige nova confirmação', async ({ page }) => {
    await reachReview(page)

    // The catalog prices change while the dialog is open (in Seção 10 this is
    // delivered by `nft.updated`; here the deterministic scenario does it).
    await setScenario(page, 'price-changed')

    await page.getByTestId('checkout-confirmar').click()

    await expect(page.getByTestId('checkout-cotacao-alterada')).toBeVisible()
    await expect(page.getByTestId('checkout-confirmar')).toHaveText(
      'Confirmar novo total',
    )
    // The summary behind the dialog also reflects the revalidated quote.
    await expect(page.getByTestId('checkout-total')).toHaveText('1.4195 ETH')
    // Nothing was sent yet: the user has to accept the new amount.
    expect(await mockOrders(page)).toHaveLength(0)

    await page.getByTestId('checkout-confirmar').click()

    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute(
      'data-status',
      'confirmed',
    )
    await expect(page.getByTestId('checkout-pedido-total')).toHaveText('1.4195 ETH')
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('pagamento recusado preserva os itens e não gera recibo confirmado', async ({
    page,
  }) => {
    await reachReview(page)
    await setScenario(page, 'payment-declined')

    await page.getByTestId('checkout-confirmar').click()

    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute(
      'data-status',
      'declined',
    )
    await expect(page.getByTestId('checkout-pedido-status')).toContainText(
      'Pagamento recusado pela simulação.',
    )
    await expect(page.getByRole('link', { name: 'Revisar carrinho' })).toBeVisible()
    await expect(page.getByTestId('header-carrinho-badge')).toHaveText('1')

    await page.goto('/cart')
    await expect(page.getByTestId('carrinho-linha-nft_004')).toBeVisible()
  })

  test('timeout na criação recupera o mesmo pedido pela chave de idempotência', async ({
    page,
  }) => {
    await reachReview(page)
    await setScenario(page, 'order-timeout')

    await page.getByTestId('checkout-confirmar').click()

    // The POST answered 504 after creating the order; the mutation recovered it
    // by key and the panel settled normally.
    await expect(page.getByTestId('checkout-pedido')).toHaveAttribute(
      'data-status',
      'confirmed',
    )
    expect(await mockOrders(page)).toHaveLength(1)
  })

  test('a carteira recusa uma rede que não assina e aceita a suportada', async ({
    page,
  }) => {
    await signIn(page, { email: 'ava@kurio.demo', redirect: '/checkout' })
    await addToCart(page)
    await page.goto('/checkout')

    // MetaMask wallet + Solana → deterministic refusal from the API.
    await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('Solana')
    await page.getByTestId('checkout-conectar').click()
    await expect(page.getByTestId('checkout-carteira-recusada')).toContainText(
      'não assina na rede Solana',
    )
    await expect(page.getByTestId('checkout-revisar')).toBeDisabled()

    await page.getByRole('combobox', { name: 'Rede', exact: true }).selectOption('Ethereum')
    await connectWallet(page)
    await expect(page.getByTestId('checkout-revisar')).toBeEnabled()
  })

  test('validação do formulário aponta os campos antes de revisar', async ({ page }) => {
    await signIn(page, { email: 'ava@kurio.demo', redirect: '/checkout' })
    await addToCart(page)
    await page.goto('/checkout')
    await connectWallet(page)

    await page.getByRole('textbox', { name: 'Nome de usuário', exact: true }).fill('ab')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('sem-arroba')
    await page.getByTestId('checkout-revisar').click()

    await expect(page.getByText('Use de 3 a 32 caracteres')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Revisar pedido' })).toHaveCount(0)
    expect(await mockOrders(page)).toHaveLength(0)
  })

  test('sessão expirada no envio volta ao login preservando o checkout', async ({
    page,
  }) => {
    await reachReview(page)
    await setScenario(page, 'session-expired')

    await page.getByTestId('checkout-confirmar').click()

    // The guard's destination is the checkout itself, so the purchase resumes.
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    expect(await mockOrders(page)).toHaveLength(0)

    await setScenario(page, 'default')
    await signIn(page, { email: 'ava@kurio.demo' })

    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByTestId('checkout-item-nft_004')).toBeVisible()
    await expect(page.getByTestId('header-carrinho-badge')).toHaveText('1')
  })
})
