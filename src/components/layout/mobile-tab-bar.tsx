import { Link, useLocation } from '@tanstack/react-router'
import {
  HeartIcon,
  HomeIcon,
  ReceiptTextIcon,
  ShoppingBagIcon,
} from 'lucide-react'

import { MobileAccountMenu } from '@/components/layout/mobile-account-menu'
import { useCartCount } from '@/features/cart/hooks'
import { cn } from '@/lib/utils'

const itemClass =
  'flex size-11 flex-col items-center justify-center rounded-full text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none'

/**
 * App-style bottom navigation from the "Início" mobile frame. It replaces the
 * desktop header only on the home screen; detail/cart/checkout use their own
 * back headers and sticky actions.
 */
export const MobileTabBar = () => {
  const location = useLocation()
  const cartCount = useCartCount()
  const onHome = location.pathname === '/'

  return (
    <nav
      aria-label="Navegação do aplicativo"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-[#1b120d]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="relative mx-auto flex h-16 max-w-md items-center justify-around px-3">
        <Link
          to="/"
          aria-label="Início"
          aria-current={onHome ? 'page' : undefined}
          className={cn(itemClass, onHome && 'text-primary')}
        >
          <HomeIcon aria-hidden className="size-5" />
        </Link>

        <span
          aria-disabled="true"
          title="Favoritos ficam no perfil do colecionador"
          className={cn(itemClass, 'cursor-not-allowed opacity-60')}
        >
          <HeartIcon aria-hidden className="size-5" />
          <span className="sr-only">Favoritos</span>
        </span>

        <Link
          to="/cart"
          aria-label={
            cartCount > 0
              ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`
              : 'Carrinho'
          }
          className="absolute -top-6 left-1/2 grid size-14 -translate-x-1/2 place-items-center rounded-full border-4 border-[#1b120d] bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <ShoppingBagIcon aria-hidden className="size-6" />
          {cartCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-[10px] leading-5 font-bold text-primary">
              {cartCount}
            </span>
          ) : null}
        </Link>

        <Link to="/account/orders" aria-label="Meus pedidos" className={itemClass}>
          <ReceiptTextIcon aria-hidden className="size-5" />
        </Link>

        <MobileAccountMenu />
      </div>
    </nav>
  )
}
