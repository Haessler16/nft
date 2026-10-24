import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [{ title: 'Entrar — NFT Market' }],
  }),
  component: LoginRoute,
})

function LoginRoute() {
  return (
    <RoutePlaceholder
      title="Login"
      path="/login"
      section="docs/PLAN.md → Seção 4"
      requirements={[
        'Formulário validado com erros de campo e erro retornado pela API',
        'Retorno ao fluxo anterior após autenticar (redirect em search param)',
        'Sessão recuperável após refresh',
        'Logout limpa cache privado e subscriptions do usuário anterior',
      ]}
    />
  )
}
