import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/account/profile')({
  head: () => ({
    meta: [{ title: 'Perfil — NFT Market' }],
  }),
  component: ProfileRoute,
})

function ProfileRoute() {
  return (
    <RoutePlaceholder
      title="Perfil do colecionador"
      path="/account/profile"
      section="docs/PLAN.md → Seção 11"
      requirements={[
        'Rota privada com layout responsivo (inclui mobile sem frame no Figma)',
        'Edição de nome, bio e e-mail com validação e erros da API',
        'Alteração de avatar com pré-visualização e persistência',
        'Alteração de senha com validação e reautenticação',
        'Alterações confirmadas permanecem após refresh',
      ]}
    />
  )
}
