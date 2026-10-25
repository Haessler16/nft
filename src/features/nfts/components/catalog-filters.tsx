import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { NftFacets } from '@/features/nfts/api/contracts'
import { cn } from '@/lib/utils'

export interface PriceRange {
  min: string | null
  max: string | null
}

interface CatalogFiltersProps {
  facets: NftFacets | undefined
  selectedCategories: string[]
  selectedNetworks: string[]
  price: PriceRange
  onToggleCategory: (value: string) => void
  onToggleNetwork: (value: string) => void
  onApplyPrice: (range: PriceRange) => void
  onClear: () => void
}

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',')

const FacetList = ({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string
  items: { value: string; count: number }[]
  selected: string[]
  onToggle: (value: string) => void
}) => (
  <fieldset className="flex flex-col gap-2.5">
    <legend className="mb-1 text-[0.8125rem] font-bold text-foreground">{title}</legend>
    {items.map((item) => {
      const isSelected = selected.includes(item.value)
      return (
        <label
          key={item.value}
          className={cn(
            'flex cursor-pointer items-center justify-between gap-2 text-xs transition-colors',
            isSelected ? 'text-primary' : 'text-foreground/80 hover:text-foreground',
          )}
        >
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(item.value)}
              className="size-3 shrink-0 appearance-none rounded-[2px] border border-input checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            />
            {item.value}
          </span>
          <span className="text-muted-foreground">({item.count})</span>
        </label>
      )
    })}
  </fieldset>
)

/**
 * Sidebar filters (desktop) and the content of the mobile filter drawer.
 *
 * Category and network changes are applied immediately as URL state; the price
 * range is applied on submit so dragging the handle doesn't fire a request per
 * pixel.
 */
export const CatalogFilters = ({
  facets,
  selectedCategories,
  selectedNetworks,
  price,
  onToggleCategory,
  onToggleNetwork,
  onApplyPrice,
  onClear,
}: CatalogFiltersProps) => {
  const bounds = {
    min: Number(facets?.priceRange.min ?? 0),
    max: Number(facets?.priceRange.max ?? 12.38),
  }
  // The slider owns the in-progress value; the applied range lives in the URL.
  // The parent remounts this component (keyed by the applied range) when the URL
  // changes elsewhere, which resets the handles without a state-sync effect.
  const [range, setRange] = useState<[number, number]>([
    Number(price.min ?? bounds.min),
    Number(price.max ?? bounds.max),
  ])

  const hasFilters =
    selectedCategories.length > 0 || selectedNetworks.length > 0 || Boolean(price.min || price.max)

  return (
    <div className="flex flex-col gap-6">
      {facets ? (
        <FacetList
          title="Coleções"
          items={facets.categories}
          selected={selectedCategories}
          onToggle={onToggleCategory}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          <span className="text-[0.8125rem] font-bold">Coleções</span>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton-shimmer h-3 w-full rounded-sm" />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
        <span className="text-[0.8125rem] font-bold">Faixa de preço</span>
        <Slider
          min={bounds.min}
          max={bounds.max}
          step={0.01}
          value={range}
          onValueChange={(value) => setRange([value[0] ?? bounds.min, value[1] ?? bounds.max])}
          aria-label="Faixa de preço em ETH"
          className="[&_[data-slot=slider-thumb]]:size-2.5 [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-thumb]]:bg-primary [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-track]]:bg-foreground/15 [&_[data-slot=slider-range]]:bg-primary"
        />
        <p className="text-xs text-foreground/80">
          Preço: {formatPrice(range[0])} – {formatPrice(range[1])} ETH
        </p>
        <Button
          type="button"
          size="sm"
          className="self-start px-3"
          onClick={() =>
            onApplyPrice({
              min: range[0] <= bounds.min ? null : range[0].toFixed(2),
              max: range[1] >= bounds.max ? null : range[1].toFixed(2),
            })
          }
        >
          Aplicar
        </Button>
      </div>

      {facets ? (
        <div className="border-t border-border/60 pt-5">
          <FacetList
            title="Rede"
            items={facets.networks}
            selected={selectedNetworks}
            onToggle={onToggleNetwork}
          />
        </div>
      ) : null}

      {hasFilters ? (
        <Button type="button" variant="ghost" size="sm" className="self-start px-0" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  )
}
