import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/nfts/$nftId')({
  head: () => ({
    meta: [{ title: 'Detalhe do NFT — NFT Market' }],
  }),
  component: NftDetailRoute,
})

function NftDetailRoute() {
  const { nftId } = Route.useParams()

  return (
    <RoutePlaceholder
      title="Detalhes do NFT"
      path={`/nfts/${nftId}`}
      section="docs/PLAN.md → Seção 6"
      requirements={[
        'Galeria com imagem principal e miniaturas, informações, coleção e edição',
        'Acesso direto por URL, NFT inexistente (404) e edição indisponível',
        'Seletor de quantidade limitado pela disponibilidade do NFT',
        'Favoritar com atualização otimista e rollback em falha',
        'Adicionar ao carrinho e refletir nft.updated em preço e disponibilidade',
      ]}
    />
  )
}
