import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/register')({
  head: () => ({
    meta: [{ title: 'Criar conta — NFT Market' }],
  }),
  component: RegisterRoute,
})

function RegisterRoute() {
  return (
    <RoutePlaceholder
      title="Cadastro"
      path="/register"
      section="docs/PLAN.md → Seção 4"
      requirements={[
        'Criação de conta com validação de todos os campos',
        'Tratamento de conflito de e-mail já cadastrado (409)',
        'Sessão iniciada ao concluir o cadastro, com retorno ao fluxo anterior',
        'Erros da API associados aos campos correspondentes',
      ]}
    />
  )
}
