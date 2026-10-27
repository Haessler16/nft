import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Loader2Icon,
  RotateCwIcon,
} from 'lucide-react'
import { useEffect } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { clearIdempotencyKey } from '@/features/checkout/storage'
import { orderQueryOptions } from '@/features/orders/api/queries'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/money'
import { queryKeys, type UserScope } from '@/lib/query/keys'

interface OrderOutcomeProps {
  orderId: string
  scope: UserScope
  /** Clears the stored purchase and returns to a fresh checkout form. */
  onNewOrder: () => void
}

const statusCopy = {
  pending: {
    title: 'Pedido em processamento',
    description:
      'A rede simulada está confirmando o pagamento. Você pode atualizar a página: este pedido continua sendo recuperado.',
  },
  confirmed: {
    title: 'Pedido confirmado',
    description: 'Pagamento confirmado na simulação. O recibo já é definitivo.',
  },
  declined: {
    title: 'Pagamento recusado',
    description: 'Nada foi cobrado e seus itens continuam no carrinho.',
  },
} as const

/**
 * Order outcome (docs/PLAN.md → Seção 8; a tela de recibo completa chega na
 * Seção 9).
 *
 * The panel polls the order while it is pending and stops the moment the status
 * is terminal. Because the active order id is persisted by the checkout, a
 * refresh (or a reconnection) reopens this same panel instead of an empty cart —
 * which is what prevents a second purchase.
 *
 * On confirmation it invalidates the cart, the catalog and the open quotes: the
 * server removed only the bought quantities and decremented stock, so every
 * screen has to read that answer again.
 */
export const OrderOutcome = ({ orderId, scope, onNewOrder }: OrderOutcomeProps) => {
  const queryClient = useQueryClient()
  const query = useQuery(orderQueryOptions(scope, orderId))
  const order = query.data

  const status = order?.status
  useEffect(() => {
    if (!status || status === 'pending') return

    // Terminal: the key must never be reused for another purchase.
    clearIdempotencyKey(scope)
    // The history screen must show the settled state on its next visit.
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(scope) })

    if (status === 'confirmed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all() })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    }
  }, [status, queryClient, scope])

  if (query.isPending) {
    return (
      <section className="flex flex-col gap-3 rounded-md border bg-card p-6" aria-busy="true">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-24 w-full" />
      </section>
    )
  }

  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404
    return (
      <section className="flex flex-col items-start gap-4 rounded-md border bg-card p-6">
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>{notFound ? 'Pedido não encontrado' : 'Não foi possível consultar o pedido'}</AlertTitle>
          <AlertDescription>
            {notFound
              ? 'Este pedido não existe ou pertence a outra conta.'
              : isApiError(query.error)
                ? query.error.message
                : 'Falha de conexão ao consultar o pedido.'}
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          {!notFound ? (
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              <RotateCwIcon aria-hidden />
              Tentar de novo
            </Button>
          ) : null}
          <Button type="button" onClick={onNewOrder}>
            Fazer outro pedido
          </Button>
        </div>
      </section>
    )
  }

  if (!order) return null

  const copy = statusCopy[order.status]

  return (
    <section
      data-testid="checkout-pedido"
      data-status={order.status}
      aria-labelledby="pedido-titulo"
      className="flex flex-col gap-5 rounded-md border bg-card p-6"
    >
      <header className="flex items-start gap-3">
        {order.status === 'pending' ? (
          <Loader2Icon
            aria-hidden
            className="mt-1 size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none"
          />
        ) : order.status === 'confirmed' ? (
          <CheckCircle2Icon aria-hidden className="animate-pop mt-1 size-5 shrink-0 text-primary" />
        ) : (
          <CircleAlertIcon aria-hidden className="mt-1 size-5 shrink-0 text-destructive" />
        )}
        <div>
          <h2 id="pedido-titulo" className="text-display text-xl">
            {copy.title}
          </h2>
          <p
            role="status"
            aria-live="polite"
            data-testid="checkout-pedido-status"
            className="mt-1 text-sm text-muted-foreground"
          >
            {order.status === 'declined' && order.failureReason
              ? order.failureReason
              : copy.description}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pedido <span className="text-foreground">{order.id}</span>
          </p>
        </div>
      </header>

      <ul className="flex flex-col gap-2 border-y py-3 text-sm">
        {order.lines.map((line) => (
          <li key={line.nftId} className="flex items-center gap-3">
            <img
              src={line.imageUrl}
              alt=""
              width={36}
              height={36}
              loading="lazy"
              className="size-9 rounded-sm object-cover"
            />
            <span className="min-w-0 flex-1 truncate">
              {line.name} <span className="text-muted-foreground">×{line.quantity}</span>
            </span>
            <span className="tabular-nums">{formatEth(line.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatEth(order.totals.subtotal)}</dd>
        </div>
        {order.totals.discount !== '0' ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">
              Desconto{order.totals.coupon ? ` ${order.totals.coupon.code}` : ''}
            </dt>
            <dd className="tabular-nums">− {formatEth(order.totals.discount)}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Taxa de rede</dt>
          <dd className="tabular-nums">{formatEth(order.totals.networkFee)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t pt-2">
          <dt className="font-bold">Total</dt>
          <dd className="font-semibold text-primary tabular-nums" data-testid="checkout-pedido-total">
            {formatEth(order.totals.total)}
          </dd>
        </div>
      </dl>

      {order.transaction ? (
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Transação simulada</span>
          <span className="break-all font-mono text-foreground">{order.transaction.hash}</span>
          <a
            href={order.transaction.explorerUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex w-fit items-center gap-1 underline underline-offset-4 hover:text-foreground"
          >
            Abrir no explorador (link simulado)
            <ArrowUpRightIcon aria-hidden className="size-3" />
          </a>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {order.status === 'pending' ? (
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            <RotateCwIcon aria-hidden />
            Atualizar agora
          </Button>
        ) : null}

        <Button asChild>
          <Link to="/orders/$orderId" params={{ orderId: order.id }}>
            Ver recibo completo
          </Link>
        </Button>

        {order.status === 'declined' ? (
          <Button asChild variant="outline">
            <Link to="/cart">Revisar carrinho</Link>
          </Button>
        ) : null}

        {order.status !== 'pending' ? (
          <Button type="button" variant="ghost" onClick={onNewOrder}>
            Fazer outro pedido
          </Button>
        ) : null}
      </div>
    </section>
  )
}
