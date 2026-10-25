import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  ReceiptTextIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserRoundIcon,
  WalletIcon,
} from 'lucide-react'
import { useState } from 'react'

import { useSession } from '@/app/session/hooks'
import { Button } from '@/components/ui/button'
import { useCartCount } from '@/features/cart/hooks'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useCatalogSearch } from '@/features/nfts/hooks'

/** Destinations that exist outside this delivery (editorial/support). */
const OUT_OF_SCOPE = ['Criadores', 'Aprender'] as const

/** Private screens reachable from the account menu (all guarded by Seção 4). */
const ACCOUNT_LINKS = [
  { to: '/account/profile', label: 'Meu perfil', Icon: UserRoundIcon },
  { to: '/account/wallets', label: 'Carteiras', Icon: WalletIcon },
  { to: '/account/orders', label: 'Meus pedidos', Icon: ReceiptTextIcon },
] as const

const firstName = (name: string): string => name.split(' ')[0] ?? name

const navLinkClass =
  'relative py-1 text-xs text-foreground/80 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-primary after:opacity-0'

const navLinkActiveClass = 'text-primary after:opacity-100'

export const SiteHeader = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useSession()
  const search = useCatalogSearch()
  const cartCount = useCartCount()
  const [menuOpen, setMenuOpen] = useState(false)

  /** Logout clears the private cache (hook) and leaves any private screen. */
  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => void navigate({ to: '/', replace: true }),
    })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="shell flex h-16 items-center gap-6">
        <Link
          to="/"
          className="rounded-sm text-sm font-bold tracking-[0.3em] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          KURIO
        </Link>

        <nav aria-label="Navegação principal" className="ml-auto hidden items-center gap-8 md:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className={navLinkClass}
            activeProps={{ className: navLinkActiveClass }}
          >
            Início
          </Link>
          <Link to="/" hash="catalogo" className={navLinkClass}>
            Mercado
          </Link>
          {OUT_OF_SCOPE.map((label) => (
            <span
              key={label}
              aria-disabled="true"
              title="Fora do escopo desta entrega"
              className="cursor-not-allowed py-1 text-xs text-foreground/35"
            >
              {label}
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-foreground/85"
            aria-label={search.open ? 'Fechar busca' : 'Buscar NFTs'}
            aria-expanded={search.open}
            aria-controls="busca-catalogo"
            onClick={search.toggle}
          >
            <SearchIcon aria-hidden />
          </Button>

          {/*
            Badge mirrors the shared cart cache: adding a piece in the detail
            (same scope, same key) updates this counter in the same commit,
            without a second request. Hidden while the count is zero so the
            icon never advertises an empty cart.
          */}
          <Button asChild variant="ghost" size="icon" className="relative text-foreground/85">
            <Link
              to="/cart"
              data-testid="header-carrinho"
              aria-label={
                cartCount > 0
                  ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`
                  : 'Carrinho'
              }
            >
              <ShoppingBagIcon aria-hidden />
              {cartCount > 0 ? (
                <span
                  aria-hidden="true"
                  data-testid="header-carrinho-badge"
                  className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground"
                >
                  {cartCount}
                </span>
              ) : null}
            </Link>
          </Button>

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="ml-1 gap-1.5">
                  <UserRoundIcon aria-hidden />
                  <span className="max-w-24 truncate">{firstName(user.name)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ACCOUNT_LINKS.map(({ to, label, Icon }) => (
                  <DropdownMenuItem key={to} asChild>
                    <Link to={to}>
                      <Icon aria-hidden />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={logout.isPending}
                  onSelect={handleLogout}
                >
                  <LogOutIcon aria-hidden />
                  {logout.isPending ? 'Saindo…' : 'Sair'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="ml-1 gap-1.5">
              <Link to="/login" search={{ redirect: location.href }}>
                <LogInIcon aria-hidden />
                Entrar
              </Link>
            </Button>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-foreground/85 md:hidden"
                aria-label="Abrir menu"
              >
                <MenuIcon aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="tracking-[0.3em]">KURIO</SheetTitle>
                <SheetDescription>Navegue pelo marketplace.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Navegação mobile" className="flex flex-col px-4">
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border/60 py-3 text-sm"
                >
                  Início
                </Link>
                <Link
                  to="/"
                  hash="catalogo"
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border/60 py-3 text-sm"
                >
                  Mercado
                </Link>
                {OUT_OF_SCOPE.map((label) => (
                  <span
                    key={label}
                    aria-disabled="true"
                    className="border-b border-border/60 py-3 text-sm text-foreground/35"
                  >
                    {label} (fora do escopo)
                  </span>
                ))}
                <Link
                  to="/cart"
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border/60 py-3 text-sm"
                >
                  Carrinho
                </Link>
                {isAuthenticated && user ? (
                  <>
                    {ACCOUNT_LINKS.map(({ to, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className="border-b border-border/60 py-3 text-sm"
                      >
                        {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        handleLogout()
                      }}
                      className="py-3 text-left text-sm text-destructive"
                    >
                      Sair da conta
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    search={{ redirect: location.href }}
                    onClick={() => setMenuOpen(false)}
                    className="py-3 text-sm text-primary"
                  >
                    Entrar
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {search.open ? (
        <form
          id="busca-catalogo"
          role="search"
          onSubmit={search.submit}
          className="shell flex items-center gap-2 pb-3"
        >
          <label htmlFor="busca-input" className="sr-only">
            Buscar NFTs por nome, coleção ou categoria
          </label>
          <Input
            id="busca-input"
            autoFocus
            value={search.term}
            onChange={(event) => search.changeTerm(event.target.value)}
            placeholder="Buscar por nome, coleção ou categoria…"
            className="h-9 max-w-md"
          />
          <Button type="submit" size="sm">
            Buscar
          </Button>
        </form>
      ) : null}
    </header>
  )
}
