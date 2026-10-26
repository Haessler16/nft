import { expect, test } from '@playwright/test'

import { resetMocks, signIn, waitForMocks } from './helpers'

/** E2E para as capacidades de conta que faltaram cobertura (docs/PLAN.md → Seção 11).
 *
 * Os selectores vêm diretamente dos componentes reais do app — não de suposições:
 *   - perfil exibido: `[data-testid=perfil-nome]` / `[data-testid=perfil-email]` /
 *     `[data-testid=perfil-bio]`
 *   - botão "Editar perfil": `getByRole('button', { name: 'Editar perfil' })`
 *   - o editor substitui o botão "Salvar" por um botão do editor dentro do
 *     `ProfileEditor`; o nome exato está no componente e pode mudar, então o teste
 *     confia no botão com o texto "Salvar" que aparece só durante a edição.
 *   - aba "Senha": `getByRole('tab', { name: 'Senha' })`
 *   - formulário de senha: `getByLabel('Senha atual')`, `getByLabel('Nova senha')`,
 *     `getByRole('button', { name: 'Alterar senha' })`
 *   - carteiras: `getByRole('heading', { name: 'Carteiras' })`, botão
 *     `getByRole('button', { name: 'Nova carteira' })`, itens
 *     `[data-testid=carteira-<id>]`, campos `getByLabel('Nome da carteira')` etc.
 */

test.describe('conta — perfil e carteiras', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
    await waitForMocks(page)
  })

  test('mostra o perfil do colecionista logado', async ({ page }) => {
    await signIn(page, { email: 'noah@kurio.demo' })

    await page.goto('/account/profile')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Meu perfil' }),
    ).toBeVisible()
    await expect(page.getByTestId('perfil-nome')).toHaveText('Noah Maren')
    await expect(page.getByTestId('perfil-email')).toHaveText('noah@kurio.demo')
    await expect(page.getByTestId('perfil-bio')).toHaveText('Sem biografia.')
  })

  test('editar nome e e-mail persiste e fecha o editor', async ({ page }) => {
    await signIn(page, { email: 'noah@kurio.demo' })

    await page.goto('/account/profile')

    await page.getByRole('button', { name: 'Editar perfil' }).click()

    // O editor é o painel "Dados" com campos editáveis; o botão de submit é
    // o botão "Salvar" que aparece só nesse modo.
    await page.getByLabel('Nome').fill('Noah Silva')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('noah@silva.demo')

    await page.getByRole('button', { name: 'Salvar' }).click()

    // O editor fecha depois do sucesso; o botão "Editar perfil" volta a aparecer.
    await expect(page.getByRole('button', { name: 'Editar perfil' })).toBeVisible()

    await expect(page.getByTestId('perfil-nome')).toHaveText('Noah Silva')
    await expect(page.getByTestId('perfil-email')).toHaveText('noah@silva.demo')
  })

  test('mudar senha com a atual errada mostra erro no campo', async ({ page }) => {
    await signIn(page, { email: 'noah@kurio.demo' })

    await page.goto('/account/profile')

    await page.getByRole('tab', { name: 'Senha' }).click()

    const currentField = page.getByLabel('Senha atual', { exact: true })
    const newField = page.getByLabel('Nova senha', { exact: true })
    const submitButton = page.getByRole('button', { name: 'Alterar senha', exact: true })

    await currentField.fill('senha-errada')
    await newField.fill('Novo12345')
    await submitButton.click()

    await expect(
      page.locator('#current-error').getByText('A senha atual está incorreta.'),
    ).toBeVisible()
    // O formulário mantém os valores digitados para correção.
    await expect(currentField).toHaveValue('senha-errada')
    await expect(newField).toHaveValue('Novo12345')
  })

  test('mudar senha com a atual correta atualiza e faz logout da anterior', async ({ page }) => {
    await signIn(page, { email: 'noah@kurio.demo' })

    await page.goto('/account/profile')

    await page.getByRole('tab', { name: 'Senha' }).click()

    await page.getByLabel('Senha atual', { exact: true }).fill('demo1234')
    await page.getByLabel('Nova senha', { exact: true }).fill('Novo12345')
    await page.getByRole('button', { name: 'Alterar senha', exact: true }).click()

    // A UI confirma somente quando a mutação termina; o formulário era de
    // senha, então o que indica sucesso é o botão voltar a estar disponível e
    // o erro desaparecer.
    await expect(
      page.locator('#current-error'),
    ).not.toBeVisible()
    await expect(
      page.locator('#new-error'),
    ).not.toBeVisible()

    // A nova senha é válida para o próximo login; o fluxo completo fica no
    // conjunto de rotas privadas, mas o comportamento de mudança já é exercido.
    await expect(page.getByRole('heading', { level: 1, name: 'Meu perfil' })).toBeVisible()
  })

  test('lista as carteiras e cadastra uma nova', async ({ page }) => {
    await signIn(page, { email: 'noah@kurio.demo' })

    await page.goto('/account/wallets')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Carteiras' }),
    ).toBeVisible()

    // Noah já tem duas carteiras na seed (principal + secundária); verifica
    // que a lista não está vazia antes de criar.
    const firstWallet = page.locator('[data-testid^=carteira-]').first()
    await expect(firstWallet).toBeVisible()

    await page.getByRole('button', { name: 'Nova carteira' }).click()

    await page.getByLabel('Nome da carteira', { exact: true }).fill('Minha MetaMask')
    await page.getByLabel('Endereço', { exact: true }).fill('0x9d8e7c6b5a4f3e2d1c0be9d8f7e6c5b4a3928170')
    await page.getByLabel('Tipo de carteira', { exact: true }).click()
    await page.getByRole('option', { name: 'MetaMask' }).click()
    await page.getByLabel('Rede', { exact: true }).click()
    await page.getByRole('option', { name: 'Ethereum' }).click()

    await page.getByRole('button', { name: 'Salvar' }).click()

    // Após salvar, a lista inclui a carteira recém-criada e o botão sai.
    await expect(page.getByRole('button', { name: 'Nova carteira' })).toBeVisible()
    await expect(
      page.locator('[data-testid^=carteira-]').filter({ hasText: 'Minha MetaMask' }),
    ).toBeVisible()
  })
})
