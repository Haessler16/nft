import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, SearchIcon, SlidersHorizontalIcon } from 'lucide-react'
import type { FormEvent } from 'react'

import { Input } from '@/components/ui/input'
import { useCatalogSearch } from '@/features/nfts/hooks'
import { prefersReducedMotion } from '@/lib/motion'

interface MobileHomeHeaderProps {
  onOpenFilters: () => void
}

/**
 * Search/filter bar from the "Início" mobile frame. The desktop header is
 * hidden below `md`, so this becomes the banner landmark for screen readers.
 */
export const MobileHomeHeader = ({ onOpenFilters }: MobileHomeHeaderProps) => {
  const search = useCatalogSearch()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    search.submit(event)
    window.setTimeout(() => {
      document.getElementById('catalogo')?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
    }, 50)
  }

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 border-b border-border/40 bg-background/95 px-4 py-4 backdrop-blur md:hidden"
    >
      <Link to="/" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2">
        KURIO
      </Link>

      <form
        role="search"
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/80 p-1.5 pl-3"
      >
        <button
          type="button"
          aria-label="Buscar NFTs"
          onClick={() => document.getElementById('busca-mobile')?.focus()}
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <SearchIcon aria-hidden className="size-4" />
        </button>

        <label htmlFor="busca-mobile" className="sr-only">
          Buscar NFTs por nome, coleção ou categoria
        </label>
        <Input
          id="busca-mobile"
          value={search.term}
          onChange={(event) => search.changeTerm(event.target.value)}
          placeholder="Explorar coleções"
          className="h-9 flex-1 border-0 bg-transparent px-0 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-0"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary transition-[background-color,scale] duration-200 ease-soft motion-safe:active:scale-90 hover:bg-primary/25 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <ArrowRightIcon aria-hidden className="size-4" />
        </button>

        <button
          type="button"
          aria-label="Abrir filtros do catálogo"
          onClick={onOpenFilters}
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary transition-[background-color,scale] duration-200 ease-soft motion-safe:active:scale-90 hover:bg-primary/25 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <SlidersHorizontalIcon aria-hidden className="size-5" />
        </button>
      </form>
    </header>
  )
}
