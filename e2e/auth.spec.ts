import { expect, test } from '@playwright/test'

import { resetMocks, setScenario, signIn } from './helpers'

/**
 * Authentication and session (docs/PLAN.md → Seção 4).
 *
 * The scenarios walk the real screens: guard → login → destination, the
 * registration conflict, refresh persistence, logout and user isolation.
 * Credentials come from the documented demo accounts.
 */

test.describe('sessão', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('rota privada leva ao login preservando o destino e volta após entrar', async ({
    page,
  }) => {
    await page.goto('/checkout')

    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()

    await signIn(page, { email: 'ava@kurio.demo' })

    await expect(page).toHaveURL('/checkout')
    await expect(page.getByRole('button', { name: 'Ava' })).toBeVisible()
  })

  test('sessão expirada no meio do fluxo volta ao login e devolve ao destino', async ({
    page,
  }) => {
    await signIn(page, { email: 'ava@kurio.demo' })
    await page.goto('/account/wallets')
    await expect(page).toHaveURL('/account/wallets')

    // The server revokes the session while the tab is still open (scenario
    // `session-expired`, Seção 2), so the next private navigation gets a 401.
    await setScenario(page, 'session-expired')
    await page.goto('/checkout')

    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()

    // A new sign-in issues a fresh session; the destination is not lost.
    await setScenario(page, 'default')
    await signIn(page, { email: 'ava@kurio.demo' })

    await expect(page).toHaveURL('/checkout')
    await expect(page.getByRole('button', { name: 'Ava' })).toBeVisible()
  })

  test('login com credenciais inválidas mostra o erro sem sair da tela', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('E-mail', { exact: true }).fill('ava@kurio.demo')
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled()
  })

  test('formulário de login valida os campos antes de chamar a API', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page.getByText('Informe seu e-mail.')).toBeVisible()
    await expect(page.getByText('Informe sua senha.')).toBeVisible()
    await expect(page.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  })

  test('cadastro cria a conta, inicia a sessão e retorna ao destino', async ({ page }) => {
    await page.goto('/register?redirect=%2Faccount%2Fwallets')

    await page.getByLabel('Nome', { exact: true }).fill('Lia Ferraz')
    await page.getByLabel('E-mail', { exact: true }).fill('lia@kurio.demo')
    await page.getByLabel('Senha', { exact: true }).fill('coleciona1')
    await page.getByLabel('Confirmar senha', { exact: true }).fill('coleciona1')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

    await expect(page).toHaveURL('/account/wallets')
    await expect(page.getByRole('button', { name: 'Lia' })).toBeVisible()
  })

  test('cadastro recusa e-mail já cadastrado apontando o campo', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Nome', { exact: true }).fill('Ava Clone')
    await page.getByLabel('E-mail', { exact: true }).fill('ava@kurio.demo')
    await page.getByLabel('Senha', { exact: true }).fill('outraSenha1')
    await page.getByLabel('Confirmar senha', { exact: true }).fill('outraSenha1')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByText('E-mail já cadastrado.')).toBeVisible()
    await expect(page.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  })

  test('senha fraca é bloqueada pelo próprio formulário', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Nome', { exact: true }).fill('Teste Kurio')
    await page.getByLabel('E-mail', { exact: true }).fill('teste@kurio.demo')
    await page.getByLabel('Senha', { exact: true }).fill('123')
    await page.getByLabel('Confirmar senha', { exact: true }).fill('123')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

    // The message also lives in the field's help text: target the error node.
    await expect(page.locator('#register-senha-erro')).toContainText(
      'A senha precisa ter ao menos 8 caracteres, com letras e números.',
    )
    await expect(page).toHaveURL(/\/register/)
  })

  test('a sessão sobrevive ao refresh e o logout limpa o cabeçalho', async ({ page }) => {
    await signIn(page, { email: 'noah@kurio.demo' })
    await expect(page.getByRole('button', { name: 'Noah' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: 'Noah' })).toBeVisible()

    await page.getByRole('button', { name: 'Noah' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()

    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByText('Sessão encerrada.')).toBeVisible()
  })

  test('visitante favoritando vai para o login com retorno ao detalhe', async ({ page }) => {
    await page.goto('/nfts/nft_001')
    await page.getByTestId('detalhe-favoritar').click()

    await expect(page).toHaveURL(/\/login\?redirect=/)
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()

    await signIn(page, { email: 'ava@kurio.demo', redirect: '/nfts/nft_001' })

    await expect(page).toHaveURL('/nfts/nft_001')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  })

  test('troca de usuário não herda carrinho nem favoritos do usuário anterior', async ({
    page,
  }) => {
    // User A adds a piece and favorites it through the detail screen.
    await signIn(page, { email: 'ava@kurio.demo' })
    await page.goto('/nfts/nft_001')
    await page.getByTestId('detalhe-comprar').click()
    await expect(page.getByTestId('detalhe-status')).toContainText('Adicionado ao carrinho.')
    await page.getByTestId('detalhe-favoritar').click()
    await expect(page.getByTestId('detalhe-favoritar')).toContainText('Favoritado')

    // Log out, then sign in as user B: private scope must start empty.
    await page.getByRole('button', { name: 'Ava' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await signIn(page, { email: 'noah@kurio.demo' })

    const bCart = await page.evaluate(async () => {
      const response = await fetch('/api/cart')
      return (await response.json()) as { count: number }
    })
    expect(bCart.count).toBe(0)

    await page.goto('/nfts/nft_001')
    await expect(page.getByTestId('detalhe-favoritar')).toContainText('Favoritar')
  })
})
