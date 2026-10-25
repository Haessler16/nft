import { CircleAlertIcon, ShieldCheckIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CartItem, QuoteResponse } from '@/features/cart/api/contracts'
import type { CheckoutValues } from '@/features/checkout/schema'
import type { WalletConnection } from '@/features/wallets/api/contracts'
import { WALLET_PROVIDER_LABELS } from '@/features/wallets/api/contracts'
import { formatEth } from '@/lib/money'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: QuoteResponse | null
  items: CartItem[]
  customer: CheckoutValues | null
  connection: WalletConnection | null
  walletLabel: string
  submitting: boolean
  /** Set when a fresh quote differs from what is on screen. */
  staleNotice: string | null
  error: string | null
  onConfirm: () => void
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
)

/**
 * Review step (docs/PLAN.md → Seção 8).
 *
 * Opens from "Revisar pedido" with the snapshot the user is about to buy. The
 * confirm button re-validates the quote first; when the total changed, the
 * dialog **does not submit** — it shows the new amount and turns the button into
 * "Confirmar novo total", so the extra click is the explicit new confirmation.
 * Availability loss sends the user back to the cart instead.
 *
 * Focus handling (trap, restore, Escape) comes from Radix Dialog; the error
 * regions are live so a screen reader hears the stale-price warning.
 */
export const ReviewDialog = ({
  open,
  onOpenChange,
  quote,
  items,
  customer,
  connection,
  walletLabel,
  submitting,
  staleNotice,
  error,
  onConfirm,
}: ReviewDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Revisar pedido</DialogTitle>
        <DialogDescription>
          Confira os dados, a carteira e os valores. A cotação será revalidada
          antes do envio.
        </DialogDescription>
      </DialogHeader>

      {customer ? (
        <section aria-labelledby="revisao-colecionador" className="flex flex-col gap-1">
          <h3 id="revisao-colecionador" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Colecionador
          </h3>
          <p className="text-sm">{customer.displayName}</p>
          <p className="text-xs text-muted-foreground">
            @{customer.username} · {customer.email}
          </p>
          {customer.note ? (
            <p className="text-xs text-muted-foreground">“{customer.note}”</p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="revisao-carteira" className="flex flex-col gap-1">
        <h3 id="revisao-carteira" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Carteira
        </h3>
        <p className="text-sm">
          {walletLabel}
          {connection ? ` · ${WALLET_PROVIDER_LABELS[connection.provider]}` : ''}
        </p>
        <p className="break-all text-xs text-muted-foreground">
          {connection?.address ?? '—'} · {connection?.network ?? '—'}
        </p>
      </section>

      {quote ? (
        <section aria-labelledby="revisao-itens" className="flex flex-col gap-2">
          <h3 id="revisao-itens" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Itens
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {quote.lines.map((line) => {
              const item = items.find((candidate) => candidate.nftId === line.nftId)
              return (
                <li key={line.nftId} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {item?.name ?? line.nftId}{' '}
                    <span className="text-muted-foreground">×{line.quantity}</span>
                  </span>
                  <span className="tabular-nums">{formatEth(line.lineTotal)}</span>
                </li>
              )
            })}
          </ul>

          <dl className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm">
            <Row label="Subtotal" value={formatEth(quote.subtotal)} />
            {quote.discount !== '0' && quote.coupon ? (
              <Row
                label={`Desconto ${quote.coupon.code}`}
                value={`− ${formatEth(quote.discount)}`}
              />
            ) : null}
            <Row label="Taxa de rede" value={formatEth(quote.networkFee)} />
            <div className="flex items-baseline justify-between gap-4 border-t pt-2">
              <dt className="font-bold">Total</dt>
              <dd className="text-base font-semibold text-primary tabular-nums" data-testid="checkout-revisao-total">
                {formatEth(quote.total)}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {staleNotice ? (
        <Alert data-testid="checkout-cotacao-alterada" aria-live="assertive">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>A cotação mudou</AlertTitle>
          <AlertDescription>{staleNotice}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" data-testid="checkout-pedido-erro" aria-live="assertive">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Não foi possível enviar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheckIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
        O envio usa uma chave de idempotência: cliques repetidos, reenvios ou um
        timeout recuperam este mesmo pedido.
      </p>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
        >
          Voltar e editar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          data-testid="checkout-confirmar"
        >
          {submitting
            ? 'Enviando…'
            : staleNotice
              ? 'Confirmar novo total'
              : 'Confirmar compra'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
