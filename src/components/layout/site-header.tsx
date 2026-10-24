import { Link } from '@tanstack/react-router'
import { ShoppingBagIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Explorar', to: '/', activeOptions: { exact: true } },
] as const

/**
 * Application header shared by every route.
 *
 * Authentication state is not wired yet (docs/PLAN.md → Seção 4), so the
 * session controls are static links to the auth screens.
 */
export const SiteHeader = () => (
  <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
    <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-md text-base font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-lg bg-foreground text-xs font-bold text-background"
        >
          NM
        </span>
        NFT Market
      </Link>

      <nav aria-label="Navegação principal" className="hidden items-center gap-1 sm:flex">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={item.activeOptions}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-[status=active]:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild variant="ghost" size="icon" aria-label="Carrinho">
          <Link to="/cart">
            <ShoppingBagIcon aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="ghost" className="hidden sm:inline-flex">
          <Link to="/login">Entrar</Link>
        </Button>
        <Button asChild>
          <Link to="/register">Criar conta</Link>
        </Button>
      </div>
    </div>
  </header>
)
