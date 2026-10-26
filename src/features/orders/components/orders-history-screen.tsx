import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, RotateCwIcon } from 'lucide-react'

import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ordersListQueryOptions } from '@/features/orders/api/queries'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/money'
import type { UserScope } from '@/lib/query/keys'

/**
 * `/account/orders` (docs/PLAN.md → Seção 9).
 *
 * The collector's order history, answered by `GET /api/orders` scoped to the
 * session. The list reads only the snapshot each order already stored (status,
 * date, total, first line), so a catalog change can never rewrite an old row.
 *
 * States: skeleton while loading, empty invitation when the account has no
 * purchase yet, error with retry, and the rows themselves — each one links to
 * the receipt at `/orders/:orderId`.
 */

const MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const formatListDate = (iso: string): string => {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  return `${day} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}

const STATUS_LABEL = {
  pending: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  declined: { label: 'Recusado', variant: 'destructive' },
} as const

export const OrdersHistoryScreen = ({ scope }: { scope: UserScope }) => {
  const query = useQuery(ordersListQueryOptions(scope))
  const orders = query.data?.orders ?? []

  return (
    <section className="shell py-10">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Meus pedidos' }]} />
      <h1 className="mt-6 text-display text-3xl">Meus pedidos</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Cada pedido guarda o recibo do momento da compra: os valores exibidos aqui
        não mudam com o catálogo.
      </p>

      {query.isPending ? (
        <div aria-busy="true" className="mt-8 flex flex-col gap-3" data-testid="pedidos-skeleton">
          <span className="sr-only">Carregando seus pedidos…</span>
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-4 rounded-md border bg-card p-4">
              <Skeleton className="size-12 shrink-0 rounded-sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="mt-8 flex flex-col items-start gap-4">
          <Alert variant="destructive" role="alert" data-testid="pedidos-erro">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Não foi possível carregar seus pedidos</AlertTitle>
            <AlertDescription>
              {isApiError(query.error)
                ? query.error.message
                : 'Falha de conexão ao consultar o histórico.'}
            </AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            <RotateCwIcon aria-hidden />
            Tentar de novo
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div
          className="mt-8 flex flex-col items-start gap-3 rounded-md border bg-card p-8"
          data-testid="pedidos-vazio"
        >
          <h2 className="text-lg font-bold">Nenhum pedido ainda</h2>
          <p className="text-sm text-muted-foreground">
            Quando você concluir uma compra, o recibo aparece aqui.
          </p>
          <Button asChild>
            <Link to="/">Explorar o catálogo</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3" data-testid="pedidos-lista">
          {orders.map((order) => {
            const status = STATUS_LABEL[order.status]
            return (
              <li key={order.id}>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: order.id }}
                  data-testid={`pedidos-linha-${order.id}`}
                  className="flex flex-col gap-3 rounded-md border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="flex min-w-0 items-center gap-3 sm:flex-1">
                    <img
                      src={order.lines[0]?.imageUrl ?? ''}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      className="size-12 shrink-0 rounded-sm object-cover"
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-bold">
                        {order.lines[0]?.name ?? 'Pedido'}
                        {order.lines.length > 1 ? (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            e mais {order.lines.length - 1}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <span className="font-mono">{order.id}</span> ·{' '}
                        {formatListDate(order.createdAt)} · {order.lines.length}{' '}
                        {order.lines.length === 1 ? 'item' : 'itens'}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-3 pl-15 sm:justify-end sm:pl-0">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatEth(order.totals.total)}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
