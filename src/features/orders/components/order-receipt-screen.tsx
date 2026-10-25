import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, RotateCwIcon } from 'lucide-react'

import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderReceipt } from '@/features/orders/components/order-receipt'
import { orderQueryOptions } from '@/features/orders/api/queries'
import { isApiError } from '@/lib/api/errors'
import type { UserScope } from '@/lib/query/keys'

/**
 * `/orders/:orderId` (docs/PLAN.md → Seção 9).
 *
 * Direct access by URL, guarded by the session: the mock answers `404` for an
 * order that does not exist *or* belongs to another collector (its existence is
 * private), and the screen shows that as "not found" instead of leaking a
 * difference between the two cases.
 *
 * While the order is pending the query polls (see `orderQueryOptions`) and the
 * same page later shows the terminal receipt — a refresh always lands on the
 * same resource, which is what recovers a purchase interrupted mid-payment.
 */
export const OrderReceiptScreen = ({
  orderId,
  scope,
}: {
  orderId: string
  scope: UserScope
}) => {
  const query = useQuery(orderQueryOptions(scope, orderId))
  const order = query.data

  const notFound = query.isError && isApiError(query.error) && query.error.status === 404

  return (
    <section className="shell max-w-3xl py-10">
      <Breadcrumb
        items={[
          { label: 'Início', to: '/' },
          { label: 'Meus pedidos', to: '/account/orders' },
          { label: `Pedido ${orderId}` },
        ]}
      />
      <h1 className="mt-6 text-display text-3xl">Confirmação de pedido</h1>

      {query.isPending ? (
        <div aria-busy="true" className="mt-6 flex flex-col gap-4">
          <span className="sr-only">Consultando o pedido na API…</span>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : notFound ? (
        <div className="mt-6 flex flex-col items-start gap-4">
          <Alert variant="destructive" role="alert" data-testid="recibo-nao-encontrado">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Pedido não encontrado</AlertTitle>
            <AlertDescription>
              Este pedido não existe ou pertence a outra conta.
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link to="/account/orders">Ver meus pedidos</Link>
          </Button>
        </div>
      ) : query.isError ? (
        <div className="mt-6 flex flex-col items-start gap-4">
          <Alert variant="destructive" role="alert">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Não foi possível consultar o pedido</AlertTitle>
            <AlertDescription>
              {isApiError(query.error)
                ? query.error.message
                : 'Falha de conexão ao consultar o pedido.'}
            </AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            <RotateCwIcon aria-hidden />
            Tentar de novo
          </Button>
        </div>
      ) : order ? (
        <>
          <div className="mt-6">
            <OrderReceipt order={order} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/account/orders">Meus pedidos</Link>
            </Button>
            <Button asChild>
              <Link to="/">Explorar o catálogo</Link>
            </Button>
          </div>
        </>
      ) : null}
    </section>
  )
}
