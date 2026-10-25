import { Link } from '@tanstack/react-router'

import type { Nft } from '@/features/nfts/api/contracts'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Highlighted offer in the filter column (design: "NFT em destaque"). */
export const FeaturedNftCard = ({ nft, className }: { nft: Nft; className?: string }) => (
  <aside className={cn('flex flex-col gap-2.5 rounded-md bg-card p-4', className)}>
    <p className="text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
      NFT em destaque
    </p>
    <h2 className="text-[0.8125rem] leading-tight font-bold uppercase">Oferta limitada</h2>

    <Link
      to="/nfts/$nftId"
      params={{ nftId: nft.id }}
      className="mt-1 block overflow-hidden rounded-sm focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
    >
      <img
        src={nft.imageUrl}
        alt={`${nft.name} em destaque`}
        width={255}
        height={247}
        loading="lazy"
        className="aspect-[255/247] w-full object-cover transition-transform duration-500 hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
      />
    </Link>

    <Link
      to="/nfts/$nftId"
      params={{ nftId: nft.id }}
      className="text-[0.8125rem] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
    >
      {nft.name}
    </Link>
    <p className="flex items-baseline gap-2 text-[0.8125rem] font-bold text-primary">
      {formatEth(nft.priceEth, { maxFractionDigits: 2 })}
      {nft.compareAtPriceEth ? (
        <s className="text-[0.7rem] font-normal text-muted-foreground">
          {formatEth(nft.compareAtPriceEth, { maxFractionDigits: 2 })}
        </s>
      ) : null}
    </p>
  </aside>
)
