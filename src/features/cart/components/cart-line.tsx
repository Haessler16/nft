import { Link } from '@tanstack/react-router'
import { MinusIcon, PlusIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CartItem, QuoteLine } from '@/features/cart/api/contracts'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

interface CartLineProps {
  item: CartItem
  /** Priced counterpart of this row; absent until the quote settles. */
  line: QuoteLine | undefined
  /** True while the quote is in flight (skeletons instead of prices). */
  moneyPending: boolean
  /** Any cart mutation running — freezes every control of every row. */
  busy: boolean
  onQuantity: (quantity: number) => void
  onRemove: () => void
}

/**
 * One cart row (docs/PLAN.md → Seção 7).
 *
 * Display data (artwork, name, availability) comes from `GET /api/cart` so the
 * row paints as soon as the cart loads; every price joins afterwards from the
 * quote and is rendered from that API answer only — the row never computes a
 * total.
 *
 * The stepper is capped by `available`, matching the rule the handler enforces
 * (409 when exceeded), so the UI refuses a request the API would reject.
 */
export const CartLine = ({
  item,
  line,
  moneyPending,
  busy,
  onQuantity,
  onRemove,
}: CartLineProps) => {
  const atTop = item.quantity >= item.available
  const soldOut = item.available === 0

  return (
    <li
      data-testid={`carrinho-linha-${item.nftId}`}
      className="flex flex-col gap-4 rounded-md border bg-card p-4 sm:flex-row sm:items-start"
    >
      <img
        src={item.imageUrl}
        alt={item.name}
        width={96}
        height={96}
        loading="lazy"
        className="size-24 shrink-0 rounded-sm object-cover"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: item.nftId }}
          className="truncate font-medium text-foreground hover:underline"
        >
          {item.name}
        </Link>

        <p
          className={cn(
            'text-xs',
            soldOut ? 'text-destructive' : 'text-muted-foreground',
          )}
          data-testid={`carrinho-disponibilidade-${item.nftId}`}
        >
          {soldOut
            ? 'Esgotada'
            : `Disponível: ${item.available} ${item.available === 1 ? 'unidade' : 'unidades'}`}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Diminuir quantidade de ${item.name}`}
              disabled={busy || item.quantity <= 1}
              onClick={() => onQuantity(item.quantity - 1)}
            >
              <MinusIcon aria-hidden />
            </Button>
            <output
              aria-label={`Quantidade de ${item.name}`}
              data-testid={`carrinho-quantidade-${item.nftId}`}
              className="w-8 text-center text-sm tabular-nums"
            >
              {item.quantity}
            </output>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Aumentar quantidade de ${item.name}`}
              disabled={busy || soldOut || atTop}
              onClick={() => onQuantity(item.quantity + 1)}
            >
              <PlusIcon aria-hidden />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remover ${item.name}`}
            disabled={busy}
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <XIcon aria-hidden />
            Remover
          </Button>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-6 border-t pt-3 text-right tabular-nums sm:mt-0 sm:block sm:border-0 sm:pt-0">
        <span className="block text-xs text-muted-foreground">
          {moneyPending ? (
            <Skeleton className="inline-block h-4 w-20" />
          ) : line ? (
            `${formatEth(line.unitPrice)} / un`
          ) : (
            '—'
          )}
        </span>
        <strong
          className="block text-base font-semibold text-foreground"
          data-testid={`carrinho-total-linha-${item.nftId}`}
        >
          {moneyPending ? (
            <Skeleton className="inline-block h-5 w-24" />
          ) : line ? (
            formatEth(line.lineTotal)
          ) : (
            '—'
          )}
        </strong>
      </div>
    </li>
  )
}
