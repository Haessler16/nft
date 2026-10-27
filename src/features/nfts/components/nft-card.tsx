import { Link } from '@tanstack/react-router'
import { HeartIcon, SearchIcon, ShoppingBagIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useSession } from '@/app/session/hooks'
import { Badge } from '@/components/ui/badge'
import { useCartMutations } from '@/features/cart/api/mutations'
import { useFavoriteToggle } from '@/features/favorites/hooks'
import type { Nft } from '@/features/nfts/api/contracts'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

const hoverActionClass =
  'grid size-7 place-items-center rounded-full bg-background/85 text-foreground transition-[color,background-color,scale] duration-200 ease-soft focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none enabled:hover:bg-primary enabled:hover:text-primary-foreground enabled:motion-safe:active:scale-90 disabled:cursor-not-allowed disabled:opacity-45'

interface NftCardProps {
  nft: Nft
  /** Hides the hover actions in contexts where they make no sense (e.g. cart). */
  showActions?: boolean
  className?: string
}

/**
 * Catalog card.
 *
 * Price is always rendered from the API string (never recomputed). The two
 * actions are the same mutations the detail screen uses: the favorite is
 * optimistic with rollback and, for a visitor, goes through `/login` with a
 * return URL; adding to the cart reports its outcome with a toast, because a
 * card has no room for an inline status.
 */
export const NftCard = ({ nft, showActions = true, className }: NftCardProps) => {
  const { scope } = useSession()
  const favorite = useFavoriteToggle(nft.id)
  const cart = useCartMutations(scope)

  const addToCart = () => {
    cart.addItem.mutate(
      { nftId: nft.id, quantity: 1 },
      {
        onSuccess: () => toast.success(`${nft.name} foi adicionado ao carrinho.`),
        onError: (error) =>
          toast.error(
            isApiError(error) ? error.message : 'Não foi possível adicionar ao carrinho.',
          ),
      },
    )
  }

  return (
    <article
      className={cn(
        'group/card flex flex-col gap-2 transition-transform duration-300 ease-soft motion-safe:hover:-translate-y-1',
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-xl bg-card ring-1 ring-border/40 transition-[box-shadow] duration-300 ease-soft group-hover/card:ring-primary/40 group-hover/card:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.7)] md:rounded-md">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          aria-label={`Ver ${nft.name}`}
          className="block focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
        >
          <img
            src={nft.imageUrl}
            alt={`${nft.name} — peça da coleção ${nft.collection}, categoria ${nft.category}`}
            width={255}
            height={247}
            loading="lazy"
            decoding="async"
            className="aspect-[255/247] w-full object-cover transition-transform duration-700 ease-soft group-hover/card:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
          />
        </Link>

        {nft.rarity ? (
          <Badge
            variant="outline"
            className="absolute top-2 right-2 rounded-sm border-primary/50 bg-background/80 text-[0.6rem] tracking-[0.14em] text-primary uppercase max-md:right-auto max-md:left-2"
          >
            {nft.rarity}
          </Badge>
        ) : null}

        {showActions ? (
          <div className="absolute inset-x-0 bottom-0 flex translate-y-2 justify-center gap-2 pb-2 opacity-0 transition-[opacity,translate] duration-300 ease-soft focus-within:translate-y-0 focus-within:opacity-100 group-hover/card:translate-y-0 group-hover/card:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none max-md:inset-x-auto max-md:top-2 max-md:right-2 max-md:bottom-auto max-md:translate-y-0 max-md:pb-0 max-md:opacity-100">
            <button
              type="button"
              className={cn(hoverActionClass, 'max-md:hidden')}
              disabled={cart.addItem.isPending}
              onClick={addToCart}
              aria-label={`Adicionar ${nft.name} ao carrinho`}
            >
              <ShoppingBagIcon aria-hidden className="size-3.5" />
            </button>
            <button
              type="button"
              className={cn(
                hoverActionClass,
                'max-md:size-8 max-md:bg-background/80 max-md:shadow-sm',
                favorite.favorited && 'text-primary',
              )}
              disabled={favorite.isPending}
              aria-pressed={favorite.favorited}
              aria-label={
                favorite.favorited
                  ? `Remover ${nft.name} dos favoritos`
                  : `Favoritar ${nft.name}`
              }
              onClick={favorite.toggle}
            >
              <HeartIcon aria-hidden className={cn('size-3.5 max-md:size-4', favorite.favorited && 'fill-current')} />
            </button>
            <Link
              to="/nfts/$nftId"
              params={{ nftId: nft.id }}
              className={cn(hoverActionClass, 'max-md:hidden')}
              aria-label={`Ver detalhes de ${nft.name}`}
            >
              <SearchIcon aria-hidden className="size-3.5" />
            </Link>
          </div>
        ) : null}
      </div>

      <h3 className="text-[0.8125rem] text-foreground transition-colors duration-200 group-hover/card:text-primary">
        {nft.name}
      </h3>
      <p className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem] font-bold text-primary tabular-nums">
        <span>{formatEth(nft.priceEth, { maxFractionDigits: 2 })}</span>
        {nft.compareAtPriceEth ? (
          <s className="text-[0.75rem] font-normal text-muted-foreground">
            {formatEth(nft.compareAtPriceEth, { maxFractionDigits: 2 })}
          </s>
        ) : null}
      </p>
    </article>
  )
}
