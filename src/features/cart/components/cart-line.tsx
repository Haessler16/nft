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
 * (409 when exceeded), so the UI refuses a request the API would reject. On
 * mobile the row compresses into the cart frame: small artwork, edition line,
 * compact stepper and the line total on the right.
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
      className="animate-enter-fade-in flex gap-3 rounded-xl bg-card p-3 md:gap-4 md:rounded-md md:border md:p-4"
    >
      <img
        src={item.imageUrl}
        alt={item.name}
        width={96}
        height={96}
        loading="lazy"
        className="size-20 shrink-0 rounded-lg object-cover md:size-24 md:rounded-sm"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: item.nftId }}
            className="truncate text-sm font-medium text-foreground hover:underline md:text-base"
          >
            {item.name}
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remover ${item.name}`}
            disabled={busy}
            onClick={onRemove}
            className="h-8 shrink-0 gap-1 px-2 text-destructive hover:text-destructive max-md:size-8 max-md:p-0"
          >
            <XIcon aria-hidden className="size-4" />
            <span className="max-md:sr-only">Remover</span>
          </Button>
        </div>

        <p className="text-[0.68rem] text-muted-foreground">
          Edição: {item.edition.number}/{item.edition.of}
        </p>

        <p
          className={cn(
            'text-[0.65rem]',
            soldOut ? 'text-destructive' : 'text-muted-foreground',
          )}
          data-testid={`carrinho-disponibilidade-${item.nftId}`}
        >
          {soldOut
            ? 'Esgotada'
            : `Disponível: ${item.available} ${item.available === 1 ? 'unidade' : 'unidades'}`}
        </p>

        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Diminuir quantidade de ${item.name}`}
              disabled={busy || item.quantity <= 1}
              onClick={() => onQuantity(item.quantity - 1)}
              className="size-7 rounded-full md:size-9 md:rounded-sm"
            >
              <MinusIcon aria-hidden className="size-3.5" />
            </Button>
            <output
              aria-label={`Quantidade de ${item.name}`}
              data-testid={`carrinho-quantidade-${item.nftId}`}
              className="w-6 text-center text-sm tabular-nums md:w-8"
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
              className="size-7 rounded-full md:size-9 md:rounded-sm"
            >
              <PlusIcon aria-hidden className="size-3.5" />
            </Button>
          </div>

          <div className="text-right tabular-nums">
            <span className="hidden text-xs text-muted-foreground md:block">
              {moneyPending ? (
                <Skeleton className="inline-block h-4 w-20" />
              ) : line ? (
                `${formatEth(line.unitPrice)} / un`
              ) : (
                '—'
              )}
            </span>
            <strong
              className="block text-sm font-semibold text-foreground md:text-base"
              data-testid={`carrinho-total-linha-${item.nftId}`}
            >
              {moneyPending ? (
                <Skeleton className="inline-block h-4 w-20 md:h-5 md:w-24" />
              ) : line ? (
                formatEth(line.lineTotal)
              ) : (
                '—'
              )}
            </strong>
          </div>
        </div>
      </div>
    </li>
  )
}
