import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { RotateCwIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { QuoteResponse } from '@/features/cart/api/contracts'
import { SummarySkeleton } from '@/features/cart/components/summary-skeleton'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

interface CartSummaryProps {
  quote: UseQueryResult<QuoteResponse, unknown>
  /** Units in the cart — labels the subtotal while the quote is fresh. */
  count: number
  /** Applied coupon, carried into the checkout so the quote is identical. */
  coupon?: string
}

interface RowProps {
  label: string
  value: string
  testId: string
  strong?: boolean
  mobileLabel?: string
  hint?: string
}

const Row = ({ label, value, testId, strong, mobileLabel, hint }: RowProps) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className={cn(!strong && 'text-muted-foreground')}>
      {mobileLabel ? (
        <>
          <span className="max-md:hidden">{label}</span>
          <span className="md:hidden">{mobileLabel}</span>
        </>
      ) : (
        label
      )}
      {hint ? (
        <span className="mt-0.5 block text-[0.62rem] font-normal text-muted-foreground/80 md:hidden">
          {hint}
        </span>
      ) : null}
    </dt>
    <dd
      data-testid={testId}
      className={cn('tabular-nums', strong && 'font-semibold')}
    >
      {value}
    </dd>
  </div>
)

/**
 * Order summary (docs/PLAN.md → Seção 7).
 *
 * Every figure is rendered from `GET /api/quote` — subtotal, discount, network
 * fee and total are the API's answer, never recomputed on this side. The panel
 * distinguishes the three states the user can act on: quoting (skeleton),
 * quoted (numbers + CTA) and unquoted (reason + retry), including the
 * `422` of a coupon edited straight into the URL, which points at the field
 * instead of looking like a generic outage.
 */
export const CartSummary = ({ quote, count, coupon }: CartSummaryProps) => {
  if (quote.isPending) return <SummarySkeleton />

  if (quote.isError) {
    const message = isApiError(quote.error)
      ? (quote.error.fields.coupon ?? quote.error.message)
      : 'Não foi possível confirmar os valores.'
    const hint = isApiError(quote.error) && quote.error.fields.coupon
      ? 'Remova o cupom da barra de endereço ou escolha outro código.'
      : 'Confira sua conexão e tente de novo — nada é cobrado sem cotação.'

    return (
      <div role="alert" data-testid="carrinho-resumo-erro" className="flex flex-col gap-3">
        <Alert variant="destructive">
          <AlertTitle>Resumo indisponível</AlertTitle>
          <AlertDescription>
            {message} {hint}
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          onClick={() => void quote.refetch()}
        >
          <RotateCwIcon aria-hidden />
          Tentar de novo
        </Button>
      </div>
    )
  }

  const data = quote.data
  const withDiscount = data.discount !== '0'

  return (
    <div data-testid="carrinho-resumo" className="flex flex-col gap-3">
      <dl className="flex flex-col gap-2 text-sm">
        <Row
          label={`Subtotal (${count} ${count === 1 ? 'peça' : 'peças'})`}
          mobileLabel="Subtotal"
          value={formatEth(data.subtotal)}
          testId="carrinho-subtotal"
        />
        {withDiscount && data.coupon ? (
          <Row
            label={`Desconto ${data.coupon.code} (−${data.coupon.percent}%)`}
            mobileLabel={`Desconto ${data.coupon.code}`}
            value={`− ${formatEth(data.discount)}`}
            testId="carrinho-desconto"
          />
        ) : null}
        <Row
          label="Taxa de rede"
          hint="Taxa estimada"
          value={formatEth(data.networkFee)}
          testId="carrinho-taxa"
        />
      </dl>

      <div className="flex items-baseline justify-between gap-4 border-t pt-3">
        <span className="text-sm font-bold max-md:text-base">Total</span>
        <strong
          data-testid="carrinho-total"
          className="text-lg text-primary tabular-nums max-md:text-xl"
        >
          {formatEth(data.total)}
        </strong>
      </div>

      <Button
        asChild
        className="mt-1 w-full max-md:h-12 max-md:rounded-full max-md:text-sm"
        data-testid="carrinho-finalizar"
      >
        <Link to="/checkout" search={{ coupon }}>
          <span className="md:hidden">Conectar e finalizar</span>
          <span className="max-md:hidden">Finalizar compra</span>
        </Link>
      </Button>

      <p className="text-xs text-muted-foreground max-md:hidden">
        Valores confirmados pela API — a cotação é revalidada antes de criar o
        pedido.
      </p>
    </div>
  )
}
