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
  'grid size-7 place-items-center rounded-full bg-background/85 text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none enabled:hover:bg-primary enabled:hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45'

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
    <article className={cn('group/card flex flex-col gap-2', className)}>
      <div className="relative overflow-hidden rounded-md bg-card">
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
            className="aspect-[255/247] w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
          />
        </Link>

        {nft.rarity ? (
          <Badge
            variant="outline"
            className="absolute top-2 right-2 rounded-sm border-primary/50 bg-background/80 text-[0.6rem] tracking-[0.14em] text-primary uppercase"
          >
            {nft.rarity}
          </Badge>
        ) : null}

        {showActions ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 pb-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100 motion-reduce:transition-none">
            <button
              type="button"
              className={hoverActionClass}
              disabled={cart.addItem.isPending}
              onClick={addToCart}
              aria-label={`Adicionar ${nft.name} ao carrinho`}
            >
              <ShoppingBagIcon aria-hidden className="size-3.5" />
            </button>
            <button
              type="button"
              className={cn(hoverActionClass, favorite.favorited && 'text-primary')}
              disabled={favorite.isPending}
              aria-pressed={favorite.favorited}
              aria-label={
                favorite.favorited
                  ? `Remover ${nft.name} dos favoritos`
                  : `Favoritar ${nft.name}`
              }
              onClick={favorite.toggle}
            >
              <HeartIcon aria-hidden className={cn('size-3.5', favorite.favorited && 'fill-current')} />
            </button>
            <Link
              to="/nfts/$nftId"
              params={{ nftId: nft.id }}
              className={hoverActionClass}
              aria-label={`Ver detalhes de ${nft.name}`}
            >
              <SearchIcon aria-hidden className="size-3.5" />
            </Link>
          </div>
        ) : null}
      </div>

      <h3 className="text-[0.8125rem] text-foreground">{nft.name}</h3>
      <p className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem] font-bold text-primary">
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
