import { ChevronDownIcon } from 'lucide-react'

import { SORT_OPTIONS, type NftSort } from '@/features/nfts/api/contracts'
import { CATALOG_TABS, type CatalogTab } from '@/features/nfts/catalog-search'
import { cn } from '@/lib/utils'

interface CatalogToolbarProps {
  tab: CatalogTab
  sort: NftSort
  onTabChange: (tab: CatalogTab) => void
  onSortChange: (sort: NftSort) => void
}

/**
 * Tabs are catalog views:
 * - "novos" orders by listing date (the newest first);
 * - "alta" orders by price, the closest signal to demand the mock exposes.
 * Both reset the page so the URL stays coherent.
 */
export const CatalogToolbar = ({ tab, sort, onTabChange, onSortChange }: CatalogToolbarProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div role="tablist" aria-label="Visões do catálogo" className="flex flex-wrap items-center gap-5">
      {CATALOG_TABS.map((item) => {
        const isActive = tab === item.value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(item.value)}
            className={cn(
              'border-b-2 pb-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground/70 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>

    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Ordenar por:</span>
      <span className="relative inline-flex items-center">
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as NftSort)}
          className="cursor-pointer appearance-none bg-transparent pr-5 text-xs text-foreground/85 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-card text-foreground">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon aria-hidden className="pointer-events-none absolute right-0 size-3.5" />
      </span>
    </label>
  </div>
)
