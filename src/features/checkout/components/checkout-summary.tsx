import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlertIcon, Link2Icon, PlugIcon, RotateCwIcon, UnplugIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CartItem, QuoteResponse } from '@/features/cart/api/contracts'
import type { Wallet, WalletConnection } from '@/features/wallets/api/contracts'
import { WALLET_PROVIDER_LABELS } from '@/features/wallets/api/contracts'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

interface CheckoutSummaryProps {
  quote: UseQueryResult<QuoteResponse, unknown>
  items: CartItem[]
  count: number
  coupon: string | undefined
  wallets: Wallet[]
  walletsPending: boolean
  walletsError: boolean
  selectedWalletId: string | null
  useCustomWallet: boolean
  customAddress: string
  connection: WalletConnection | null
  connecting: boolean
  connectError: string | null
  onSelectWallet: (wallet: Wallet) => void
  onConnect: () => void
  onDisconnect: () => void
  submitting: boolean
  /** Why the review button is disabled, shown next to the CTA. */
  blockedReason: string | null
}

const shortAddress = (address: string): string =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address

const SummaryRow = ({
  label,
  value,
  testId,
  strong,
}: {
  label: string
  value: string
  testId: string
  strong?: boolean
}) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className={cn(!strong && 'text-muted-foreground')}>{label}</dt>
    <dd
      data-testid={testId}
      className={cn('tabular-nums', strong && 'font-semibold')}
    >
      {value}
    </dd>
  </div>
)

/**
 * Right column of `/checkout` (docs/PLAN.md → Seção 8).
 *
 * It mirrors the Pagamento frame: the pieces with their line totals, the coupon
 * shortcut, the money broken down by the API, the wallet/network block and the
 * primary action. Every number comes from `GET /api/quote`; the component never
 * sums anything, so the review dialog can compare its snapshot with a fresh
 * quote using the very same source.
 */
export const CheckoutSummary = ({
  quote,
  items,
  count,
  coupon,
  wallets,
  walletsPending,
  walletsError,
  selectedWalletId,
  useCustomWallet,
  customAddress,
  connection,
  connecting,
  connectError,
  onSelectWallet,
  onConnect,
  onDisconnect,
  submitting,
  blockedReason,
}: CheckoutSummaryProps) => {
  const connected = connection?.status === 'connected'
  const refused = connection?.status === 'refused'
  const quoteError = quote.isError
    ? isApiError(quote.error)
      ? (quote.error.fields.coupon ??
        quote.error.fields.items ??
        quote.error.message)
      : 'Não foi possível confirmar os valores.'
    : null

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="itens-titulo" className="rounded-md border bg-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="itens-titulo" className="text-sm font-bold">
            Seus NFTs
          </h2>
          <span className="text-xs text-muted-foreground">Subtotal</span>
        </div>

        <ul className="mt-3 flex flex-col divide-y divide-border/60">
          {items.map((item) => {
            const line = quote.data?.lines.find(
              (candidate) => candidate.nftId === item.nftId,
            )
            return (
              <li
                key={item.nftId}
                data-testid={`checkout-item-${item.nftId}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <img
                  src={item.imageUrl}
                  alt=""
                  width={44}
                  height={44}
                  loading="lazy"
                  className="size-11 shrink-0 rounded-sm object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.edition.number}/{item.edition.of} · ×{item.quantity}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums">
                  {quote.isPending ? (
                    <Skeleton className="inline-block h-4 w-16" />
                  ) : line ? (
                    formatEth(line.lineTotal)
                  ) : (
                    '—'
                  )}
                </span>
              </li>
            )
          })}
        </ul>

        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
          {coupon ? (
            <>
              Cupom <span className="text-foreground">{coupon}</span> aplicado.{' '}
              <Link to="/cart" search={{ coupon }} className="underline underline-offset-4">
                Alterar no carrinho
              </Link>
            </>
          ) : (
            <>
              Tem um código promocional?{' '}
              <Link to="/cart" className="underline underline-offset-4">
                Aplique no carrinho
              </Link>
            </>
          )}
        </p>
      </section>

      <section aria-labelledby="valores-titulo" className="rounded-md border bg-card p-4">
        <h2 id="valores-titulo" className="sr-only">
          Resumo dos valores
        </h2>

        {quote.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {['a', 'b', 'c', 'd'].map((key) => (
              <div key={key} className="flex justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : quoteError ? (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-sm text-destructive">{quoteError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void quote.refetch()}>
              <RotateCwIcon aria-hidden />
              Tentar de novo
            </Button>
          </div>
        ) : quote.data ? (
          <dl className="flex flex-col gap-2 text-sm">
            <SummaryRow
              label={`Subtotal (${count} ${count === 1 ? 'peça' : 'peças'})`}
              value={formatEth(quote.data.subtotal)}
              testId="checkout-subtotal"
            />
            {quote.data.discount !== '0' && quote.data.coupon ? (
              <SummaryRow
                label={`Desconto ${quote.data.coupon.code} (−${quote.data.coupon.percent}%)`}
                value={`− ${formatEth(quote.data.discount)}`}
                testId="checkout-desconto"
              />
            ) : null}
            <SummaryRow
              label="Taxa de rede"
              value={formatEth(quote.data.networkFee)}
              testId="checkout-taxa"
            />
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-3">
              <span className="font-bold">Total</span>
              <strong
                data-testid="checkout-total"
                className="text-lg text-primary tabular-nums"
              >
                {formatEth(quote.data.total)}
              </strong>
            </div>
          </dl>
        ) : null}
      </section>

      <fieldset className="rounded-md border bg-card p-4">
        <legend className="px-1 text-display text-base">Carteira e rede</legend>

        {walletsPending ? (
          <div className="mt-2 flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : walletsError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Não foi possível carregar suas carteiras. Recarregue a página para
            tentar de novo.
          </p>
        ) : wallets.length === 0 ? (
          <div className="mt-2 flex flex-col items-start gap-2 text-sm">
            <p>Nenhuma carteira registrada.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/account/wallets">Cadastrar carteira</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {wallets.map((wallet) => {
              const selected = !useCustomWallet && selectedWalletId === wallet.id
              return (
                <label
                  key={wallet.id}
                  data-testid={`checkout-carteira-${wallet.id}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition-colors',
                    selected ? 'border-primary/70 bg-primary/5' : 'hover:bg-muted/40',
                  )}
                >
                  <input
                    type="radio"
                    name="carteira-selecionada"
                    value={wallet.id}
                    checked={selected}
                    onChange={() => onSelectWallet(wallet)}
                    disabled={submitting}
                    className="mt-1 size-4 shrink-0 accent-(--primary)"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-bold">
                      {wallet.label}
                      {wallet.primary ? <Badge variant="secondary">principal</Badge> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {WALLET_PROVIDER_LABELS[wallet.provider]} · {shortAddress(wallet.address)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Redes: {wallet.supportedNetworks.join(' · ')}
                    </span>
                  </span>
                </label>
              )
            })}

            {useCustomWallet ? (
              <p className="text-xs text-muted-foreground">
                Usando o endereço informado no formulário:{' '}
                <span className="text-foreground">{customAddress || '—'}</span>
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2" aria-live="polite">
          {connected ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-primary/40 bg-primary/5 px-3 py-2">
              <p className="flex items-center gap-2 text-sm">
                <Link2Icon aria-hidden className="size-4 text-primary" />
                Carteira conectada · {connection.network}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                disabled={submitting}
                data-testid="checkout-desconectar"
              >
                <UnplugIcon aria-hidden />
                Desconectar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onConnect}
              disabled={connecting || submitting || wallets.length === 0}
              data-testid="checkout-conectar"
            >
              <PlugIcon aria-hidden />
              {connecting ? 'Conectando à carteira…' : 'Conectar carteira'}
            </Button>
          )}

          {refused && connection.reason ? (
            <Alert variant="destructive" data-testid="checkout-carteira-recusada">
              <CircleAlertIcon aria-hidden />
              <AlertTitle>Conexão recusada</AlertTitle>
              <AlertDescription>{connection.reason}</AlertDescription>
            </Alert>
          ) : null}

          {connectError ? (
            <Alert variant="destructive" data-testid="checkout-conexao-erro">
              <CircleAlertIcon aria-hidden />
              <AlertTitle>Falha ao conectar</AlertTitle>
              <AlertDescription>{connectError}</AlertDescription>
            </Alert>
          ) : null}

          {!connected && !refused && !connectError ? (
            <p className="text-xs text-muted-foreground">
              A conexão é simulada: escolher uma rede que a carteira não assina
              faz a extensão recusar.
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || Boolean(blockedReason)}
          data-testid="checkout-revisar"
        >
          {submitting ? 'Enviando pedido…' : 'Revisar pedido'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {blockedReason ??
            'A cotação é revalidada antes do envio: se algo mudar, você confirma de novo.'}
        </p>
      </div>
    </div>
  )
}
