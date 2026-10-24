import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'Início — NFT Market' }],
  }),
  component: HomeRoute,
})

function HomeRoute() {
  return (
    <RoutePlaceholder
      title="Início"
      path="/"
      section="docs/PLAN.md → Seção 5"
      requirements={[
        'Destaques curados e catálogo completo com NFT cards responsivos',
        'Busca, filtros combináveis, ordenação e paginação com estado na URL',
        'Mudança de filtro reinicia a paginação; refresh e histórico restauram o estado',
        'Estados de carregamento (skeleton com shimmer), vazio, erro com retry e atualização em background',
        'Descarte de respostas fora de ordem e navegação para o detalhe do NFT',
      ]}
    />
  )
}
