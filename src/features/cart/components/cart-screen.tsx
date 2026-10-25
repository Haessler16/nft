import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { RotateCwIcon } from 'lucide-react'

import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CartLine } from '@/features/cart/components/cart-line'
import { CartSkeleton } from '@/features/cart/components/cart-skeleton'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { CouponForm } from '@/features/cart/components/coupon-form'
import type { CartItem } from '@/features/cart/api/contracts'
import { useCart, useQuote } from '@/features/cart/hooks'
import { isApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

interface CartScreenProps {
  /** Coupon committed to the URL (`/cart?coupon=…`), owned by the route. */
  coupon: string | undefined
  onApplyCoupon: (code: string) => void
  onRemoveCoupon: () => void
}

interface Notice {
  tone: 'ok' | 'error'
  text: string
}

const errorMessage = (error: unknown, fallback: string): string =>
  isApiError(error) ? error.message : fallback

const PageHeader = () => (
  <>
    <Breadcrumb items={[{ label: 'Mercado', to: '/' }, { label: 'Carrinho' }]} />
    <h1 className="mt-6 text-3xl font-semibold tracking-tight">Carrinho</h1>
  </>
)

/**
 * Cart screen (docs/PLAN.md → Seção 7).
 *
 * Rendering is a two-step contract on purpose: `GET /api/cart` supplies the
 * rows (artwork, availability) as soon as it lands, then `GET /api/quote`
 * supplies the money for that exact snapshot — quantities, coupon and totals
 * are never derived locally, so the screen cannot promise a price the API
 * would not honour at checkout.
 *
 * The coupon lives in the URL (owned by the route), which makes apply/remove
 * survive a refresh and keeps the quote cache key in one place. Mutations
 * report through a polite live region, mirroring the detail screen.
 */
export const CartScreen = ({
  coupon,
  onApplyCoupon,
  onRemoveCoupon,
}: CartScreenProps) => {
  const cart = useCart()
  const quote = useQuote(cart.items, coupon)
  const [notice, setNotice] = useState<Notice | null>(null)

  const busy = cart.updateItem.isPending || cart.removeItem.isPending

  /**
   * Polite live region shared by the list and the empty state: removing the
   * last item swaps the screen, and the confirmation must not vanish with it.
   */
  const statusRegion = (
    <p
      role="status"
      aria-live="polite"
      data-testid="carrinho-status"
      className={cn(
        'mt-4 min-h-5 text-sm',
        notice?.tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {notice?.text ?? ''}
    </p>
  )

  const handleQuantity = (item: CartItem, quantity: number) =>
    cart.updateItem.mutate(
      { nftId: item.nftId, quantity },
      {
        onSuccess: () =>
          setNotice({ tone: 'ok', text: 'Quantidade atualizada.' }),
        onError: (error) =>
          setNotice({
            tone: 'error',
            text: errorMessage(
              error,
              'Não foi possível atualizar a quantidade.',
            ),
          }),
      },
    )

  const handleRemove = (item: CartItem) =>
    cart.removeItem.mutate(
      { nftId: item.nftId },
      {
        onSuccess: () => setNotice({ tone: 'ok', text: 'Item removido.' }),
        onError: (error) =>
          setNotice({
            tone: 'error',
            text: errorMessage(error, 'Não foi possível remover o item.'),
          }),
      },
    )

  if (cart.query.isPending) return <CartSkeleton />

  if (cart.query.isError) {
    return (
      <section className="shell py-10">
        <PageHeader />
        <div role="alert" className="mt-8 flex flex-col items-start gap-4">
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar o carrinho</AlertTitle>
            <AlertDescription>
              {errorMessage(
                cart.query.error,
                'Falha de conexão ao consultar seus itens.',
              )}
            </AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={() => void cart.query.refetch()}>
            <RotateCwIcon aria-hidden />
            Tentar de novo
          </Button>
        </div>
      </section>
    )
  }

  if (cart.items.length === 0) {
    return (
      <section className="shell py-10" data-testid="carrinho-vazio">
        <PageHeader />
        {statusRegion}
        <div className="mt-6 flex flex-col items-start gap-3 rounded-md border bg-card p-8">
          <h2 className="text-lg font-bold">Seu carrinho está vazio</h2>
          <p className="text-sm text-muted-foreground">
            Explore o catálogo e adicione peças para cotar seu pedido.
          </p>
          <Button asChild>
            <Link to="/">Explorar o catálogo</Link>
          </Button>
        </div>
      </section>
    )
  }

  const alerts = quote.data?.alerts ?? []

  return (
    <section className="shell py-10">
      <PageHeader />

      {statusRegion}

      {alerts.length > 0 ? (
        <div className="mt-2 flex flex-col gap-3">
          {alerts.includes('price-changed') ? (
            <Alert data-testid="carrinho-alerta-preco">
              <AlertTitle>Preços atualizados</AlertTitle>
              <AlertDescription>
                Os valores destas peças mudaram desde que entraram no carrinho.
                O resumo abaixo já usa o preço atual da API.
              </AlertDescription>
            </Alert>
          ) : null}
          {alerts.includes('availability-changed') ? (
            <Alert variant="destructive" data-testid="carrinho-alerta-disponibilidade">
              <AlertTitle>Disponibilidade alterada</AlertTitle>
              <AlertDescription>
                Algumas unidades deixaram de estar disponíveis. Ajuste as
                quantidades antes de finalizar a compra.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="flex flex-col gap-4">
          {cart.items.map((item) => (
            <CartLine
              key={item.nftId}
              item={item}
              line={quote.data?.lines.find(
                (candidate) => candidate.nftId === item.nftId,
              )}
              moneyPending={quote.isPending}
              busy={busy}
              onQuantity={(quantity) => handleQuantity(item, quantity)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </ul>

        <aside className="flex h-fit flex-col gap-4">
          <CouponForm
            coupon={coupon}
            onApply={onApplyCoupon}
            onRemove={onRemoveCoupon}
          />
          <section
            aria-labelledby="resumo-titulo"
            className="rounded-md border bg-card p-4"
          >
            <h2 id="resumo-titulo" className="text-sm font-bold">
              Resumo do pedido
            </h2>
            <div className="mt-3">
              <CartSummary quote={quote} count={cart.count} coupon={coupon} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}
