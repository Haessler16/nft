import { ArrowUpRightIcon, MailIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { Order } from '@/features/orders/api/contracts'
import { WALLET_PROVIDER_LABELS } from '@/features/wallets/api/contracts'
import { formatEth } from '@/lib/money'

/**
 * Receipt (docs/PLAN.md → Seção 9).
 *
 * Everything rendered here comes from the **snapshot** stored with the order:
 * the lines, prices, fees, coupon and wallet were frozen at creation, so a
 * later catalog change (or another scenario flipping prices) cannot rewrite a
 * receipt. The screen never joins live NFT data.
 *
 * The composition mirrors the Figma frame "Confirmação de Pedido": the thank-you
 * header, the four-cell meta strip (transaction, date, total, wallet), the
 * "Detalhes da transação" table and the explorer CTA. The explorer link is
 * simulated and labelled as such.
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

/** "29 Jul, 2026" — the format drawn in the frame, in local time. */
const formatReceiptDate = (iso: string): string => {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  return `${day} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}

/** `0x4f2a…e82c` keeps the identity without flooding the meta strip. */
const shortHash = (hash: string): string =>
  hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash

const STATUS_COPY = {
  pending: {
    label: 'Em processamento',
    title: 'Pagamento em processamento',
    note: 'A rede simulada ainda não concluiu a transação. Atualize a página ou aguarde: este pedido continua sendo o mesmo.',
  },
  confirmed: {
    label: 'Confirmado',
    title: 'Seus NFTs agora estão na sua carteira',
    note: 'Transação confirmada na simulação. A propriedade foi transferida para a carteira conectada e registrada na rede.',
  },
  declined: {
    label: 'Recusado',
    title: 'Pagamento recusado',
    note: 'Nenhum valor foi cobrado e os itens continuam no seu carrinho.',
  },
} as const

const MetaCell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5 px-4 py-3 first:pl-0 sm:border-l sm:border-border/60 sm:first:border-l-0">
    <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
    <dd className="truncate text-sm text-foreground">{children}</dd>
  </div>
)

export const OrderReceipt = ({ order }: { order: Order }) => {
  const copy = STATUS_COPY[order.status]

  return (
    <article
      data-testid="recibo-pedido"
      data-status={order.status}
      aria-labelledby="recibo-titulo"
      className="flex flex-col overflow-hidden rounded-md border bg-card"
    >
      <header className="flex flex-col items-center gap-3 border-b bg-muted/30 px-6 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-md border border-primary/40 bg-background">
          <MailIcon aria-hidden className="size-6 text-primary" />
        </span>
        <h2 id="recibo-titulo" className="text-display text-xl">
          {copy.title}
        </h2>
        <Badge variant={order.status === 'declined' ? 'destructive' : 'secondary'}>
          {copy.label}
        </Badge>
        <p
          role="status"
          aria-live="polite"
          data-testid="recibo-status"
          className="max-w-md text-sm text-muted-foreground"
        >
          {order.status === 'declined' && order.failureReason
            ? order.failureReason
            : copy.note}
        </p>
      </header>

      <dl className="grid grid-cols-2 divide-y divide-border/60 border-b sm:grid-cols-4 sm:divide-y-0">
        <MetaCell label="ID da transação">
          <span data-testid="recibo-transacao" className="font-mono text-xs">
            {order.transaction ? shortHash(order.transaction.hash) : 'aguardando'}
          </span>
        </MetaCell>
        <MetaCell label="Data">{formatReceiptDate(order.createdAt)}</MetaCell>
        <MetaCell label="Total">
          <span data-testid="recibo-total" className="font-semibold tabular-nums">
            {formatEth(order.totals.total)}
          </span>
        </MetaCell>
        <MetaCell label="Carteira">{WALLET_PROVIDER_LABELS[order.wallet.provider]}</MetaCell>
      </dl>

      <section className="flex flex-col gap-4 px-6 py-5">
        <h3 className="text-sm font-bold">Detalhes da transação</h3>

        <div className="flex flex-col">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b pb-2 text-xs font-bold text-muted-foreground uppercase sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem]">
            <span>NFTs</span>
            <span className="hidden text-center sm:block">Edições</span>
            <span className="text-right">Subtotal</span>
          </div>

          <ul className="divide-y divide-border/50">
            {order.lines.map((line) => (
              <li
                key={line.nftId}
                data-testid={`recibo-linha-${line.nftId}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <img
                    src={line.imageUrl}
                    alt=""
                    width={48}
                    height={48}
                    loading="lazy"
                    className="size-10 shrink-0 rounded-sm object-cover sm:size-12"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold">{line.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ID do token: #{String(line.edition.number).padStart(3, '0')}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatEth(line.unitPrice)} cada
                      <span className="sm:hidden"> · (x {line.quantity})</span>
                    </span>
                  </span>
                </span>
                <span className="hidden text-center text-sm tabular-nums sm:block">
                  (x {line.quantity})
                </span>
                <span className="text-right text-sm font-semibold text-primary tabular-nums">
                  {formatEth(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>

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
            <dd className="font-semibold text-primary tabular-nums">
              {formatEth(order.totals.total)}
            </dd>
          </div>
        </dl>

        <p className="text-center text-xs text-muted-foreground">{copy.note}</p>

        {order.transaction ? (
          <a
            href={order.transaction.explorerUrl}
            target="_blank"
            rel="noreferrer noopener"
            data-testid="recibo-explorador"
            className="mx-auto inline-flex items-center gap-1 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            Ver no explorador (link simulado)
            <ArrowUpRightIcon aria-hidden className="size-4" />
          </a>
        ) : null}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
        <span>
          Pedido <span className="font-mono text-foreground">{order.id}</span>
        </span>
        <span>
          Rede: <span className="text-foreground">{order.wallet.network}</span> · Endereço:{' '}
          <span className="font-mono text-foreground">{order.wallet.address}</span>
        </span>
      </footer>
    </article>
  )
}
