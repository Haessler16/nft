import { useState } from 'react'

import type { NftDetail } from '@/features/nfts/api/contracts'
import { cn } from '@/lib/utils'

/**
 * Gallery view: the artwork ships as a single asset (extracted from the design
 * frames), so the thumbnails switch between fixed zoom levels instead of
 * pretending there are four photos. The selection is real state — the main
 * image renders exactly the level the chosen thumbnail describes.
 */
const GALLERY_VIEWS = [
  { label: 'Vista completa', zoom: 1 },
  { label: 'Aproximação', zoom: 1.4 },
  { label: 'Detalhe', zoom: 1.9 },
  { label: 'Macro', zoom: 2.6 },
] as const

export const NftGallery = ({ nft }: { nft: NftDetail }) => {
  const [active, setActive] = useState(0)
  const view = GALLERY_VIEWS[active] ?? GALLERY_VIEWS[0]

  return (
    <div className="flex gap-4">
      <div role="group" aria-label="Vistas da imagem" className="hidden flex-col gap-3 sm:flex">
        {GALLERY_VIEWS.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={index === active}
            aria-label={`Ver ${item.label.toLowerCase()} de ${nft.name}`}
            onClick={() => setActive(index)}
            className={cn(
              'size-16 overflow-hidden rounded-sm border bg-card focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none',
              index === active ? 'border-primary' : 'border-border/70 hover:border-primary/50',
            )}
          >
            <img
              src={nft.imageUrl}
              alt=""
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              style={{ transform: `scale(${item.zoom})` }}
              className="size-full object-cover motion-reduce:transition-none"
            />
          </button>
        ))}
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-border/70 bg-card md:rounded-md">
        <img
          src={nft.imageUrl}
          alt={`${nft.name} — obra da coleção ${nft.collection}`}
          width={640}
          height={640}
          fetchPriority="high"
          decoding="async"
          style={{ transform: `scale(${view?.zoom ?? 1})` }}
          className="aspect-square w-full object-cover transition-transform duration-300 motion-reduce:transition-none"
        />
        <p className="absolute right-2 bottom-2 rounded-sm bg-background/85 px-2 py-1 text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
          {view?.label}
        </p>
      </div>
    </div>
  )
}
