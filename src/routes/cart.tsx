import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/cart')({
  head: () => ({
    meta: [{ title: 'Carrinho — NFT Market' }],
  }),
  component: CartRoute,
})

function CartRoute() {
  return (
    <RoutePlaceholder
      title="Carrinho de NFTs"
      path="/cart"
      section="docs/PLAN.md → Seção 7"
      requirements={[
        'Adicionar, alterar quantidades e remover itens respeitando a disponibilidade',
        'Aplicar e remover cupom com tratamento de código inválido ou expirado',
        'Resumo com subtotal, desconto, taxa de rede e total vindos da cotação da API',
        'Carrinho preservado após refresh e mantido ao autenticar',
        'Alterações de preço e disponibilidade recebidas em tempo real atualizam o resumo',
      ]}
    />
  )
}
