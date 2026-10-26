import { expect, test, type Page } from '@playwright/test'

import { resetMocks, signIn } from './helpers'

/**
 * Account screen (docs/PLAN.md → Seção 11).
 *
 * Everything runs through the real forms and the MSW handlers: profile read and
 * update, password reauthentication, wallet list/create/edit/delete and the
 * isolation between two demo accounts. Selectors come from what the components
 * actually render (labels, roles, headings and the wallet card test ids).
 */

const AVA = { email: 'ava@kurio.demo', password: 'demo1234' }
const NOAH = { email: 'noah@kurio.demo', password: 'demo1234' }

const signOut = async (page: Page, firstName: string) => {
  await page.getByRole('button', { name: firstName }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/account'))
}

const openProfile = async (page: Page) => {
  await page.goto('/account/profile')
  await expect(page.getByRole('heading', { level: 1, name: 'Meu perfil' })).toBeVisible()
}

test.describe('conta', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('perfil: rota privada, dados reais, validação e edição persistida', async ({ page }) => {
    // Direct access without a session goes to login and comes back afterwards.
    await page.goto('/account/profile')
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fprofile/)
    await signIn(page, AVA)
    await expect(page).toHaveURL('/account/profile')

    await expect(page.getByTestId('perfil-nome')).toHaveText('Ava Duarte')
    await expect(page.getByTestId('perfil-email')).toHaveText('ava@kurio.demo')
    await expect(page.getByTestId('perfil-bio')).toHaveText('Sem biografia.')

    // A malformed e-mail blocks the save and keeps the editor open.
    await page.getByRole('button', { name: 'Editar perfil' }).click()
    await page.getByLabel('E-mail', { exact: true }).fill('sem-arroba')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible()

    await page.getByLabel('E-mail', { exact: true }).fill('ava@kurio.demo')
    await page.getByLabel('Nome', { exact: true }).fill('Ava Duarte Lima')
    await page.getByLabel('Biografia').fill('Colecionadora de arte digital.')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByText('Dados atualizados.')).toBeVisible()
    await expect(page.getByTestId('perfil-nome')).toHaveText('Ava Duarte Lima')
    await expect(page.getByTestId('perfil-bio')).toHaveText('Colecionadora de arte digital.')

    // The confirmed update survives a refresh (persisted in the mock db).
    await page.reload()
    await expect(page.getByTestId('perfil-nome')).toHaveText('Ava Duarte Lima')
    await expect(page.getByTestId('perfil-bio')).toHaveText('Colecionadora de arte digital.')
  })

  test('senha: erro de senha atual e troca válida com login posterior', async ({ page }) => {
    await signIn(page, AVA)
    await openProfile(page)
    await page.getByRole('tab', { name: 'Senha' }).click()

    await page.getByLabel('Senha atual').fill('senha-errada')
    await page.getByLabel('Nova senha').fill('NovaSenha123')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('A senha atual está incorreta.')).toBeVisible()

    // Editing the field clears the API error; the new password is preserved.
    await page.getByLabel('Senha atual').fill('demo1234')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha atualizada.')).toBeVisible()

    await signOut(page, 'Ava')
    await signIn(page, { email: AVA.email, password: 'NovaSenha123' })
    await expect(page.getByRole('button', { name: 'Ava' })).toBeVisible()
  })

  test('carteiras: lista, criação, edição e remoção da secundária', async ({ page }) => {
    await signIn(page, { ...AVA, redirect: '/account/wallets' })
    await expect(page).toHaveURL('/account/wallets')
    await expect(page.getByRole('heading', { level: 1, name: 'Carteiras' })).toBeVisible()

    const primary = page.getByTestId('carteira-wal_ava_primary')
    const secondary = page.getByTestId('carteira-wal_ava_secondary')
    await expect(primary).toContainText('Carteira principal')
    await expect(primary).toContainText('MetaMask')
    await expect(primary).toContainText('Principal')
    await expect(secondary).toContainText('Coleção paralela')
    await expect(secondary).toContainText('Coinbase Wallet')
    await expect(secondary).toContainText('Secundária')

    // Create with a non-default provider/network, proving the labels work.
    await page.getByRole('button', { name: 'Nova carteira' }).click()
    await page.getByLabel('Nome da carteira').fill('Carteira do estúdio')
    await page.getByLabel('Endereço', { exact: true }).fill(`0x${'a'.repeat(40)}`)
    await page.getByRole('combobox', { name: 'Tipo de carteira' }).click()
    await page.getByRole('option', { name: 'WalletConnect' }).click()
    await page.getByRole('combobox', { name: 'Rede' }).click()
    await page.getByRole('option', { name: 'Solana' }).click()
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Carteira cadastrada.')).toBeVisible()
    const created = page.locator('[data-testid^="carteira-"]').filter({ hasText: 'Carteira do estúdio' })
    await expect(created).toContainText('WalletConnect')
    await expect(created).toContainText('Solana')

    // Creation is persisted and the card can be edited in place.
    await page.reload()
    const persisted = page
      .locator('[data-testid^="carteira-"]')
      .filter({ hasText: 'Carteira do estúdio' })
    await expect(persisted).toContainText('Solana')

    await persisted.getByRole('button', { name: 'Editar' }).click()
    const editHeading = page.getByRole('heading', { level: 2, name: 'Editar carteira' })
    await expect(editHeading).toBeVisible()
    await page.getByLabel('Nome da carteira').fill('Estúdio novo')
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Carteira atualizada.')).toBeVisible()
    await expect(editHeading).toBeHidden()
    await expect(
      page.locator('[data-testid^="carteira-"]').filter({ hasText: 'Estúdio novo' }),
    ).toBeVisible()

    // Only the secondary wallet can be removed; the primary keeps its action hidden.
    await expect(primary.getByRole('button', { name: 'Remover' })).toHaveCount(0)
    await secondary.getByRole('button', { name: 'Remover' }).click()
    const deleteDialog = page.getByRole('dialog', { name: 'Remover carteira' })
    await expect(deleteDialog).toBeVisible()
    await deleteDialog.getByRole('button', { name: 'Remover' }).click()

    await expect(page.getByText('Carteira removida.')).toBeVisible()
    await expect(secondary).toHaveCount(0)

    await page.reload()
    await expect(page.getByTestId('carteira-wal_ava_secondary')).toHaveCount(0)
    await expect(
      page.locator('[data-testid^="carteira-"]').filter({ hasText: 'Estúdio novo' }),
    ).toBeVisible()
  })

  test('isolamento: outra conta não vê perfil nem carteiras do usuário anterior', async ({
    page,
  }) => {
    await signIn(page, AVA)
    await openProfile(page)
    await expect(page.getByTestId('perfil-nome')).toHaveText('Ava Duarte')

    await signOut(page, 'Ava')
    await signIn(page, NOAH)

    await openProfile(page)
    await expect(page.getByTestId('perfil-nome')).toHaveText('Noah Maren')
    await expect(page.getByTestId('perfil-bio')).toHaveText('Sem biografia.')

    await page.goto('/account/wallets')
    await expect(page.getByTestId('carteira-wal_noah_primary')).toContainText('Carteira principal')
    await expect(page.getByTestId('carteira-wal_noah_secondary')).toContainText('Estúdio')
    await expect(page.getByTestId('carteira-wal_ava_primary')).toHaveCount(0)
    await expect(page.getByTestId('carteira-wal_ava_secondary')).toHaveCount(0)
    await expect(page.getByText('Coleção paralela')).toHaveCount(0)
  })
})
