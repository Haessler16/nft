import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  LogOutIcon,
  ReceiptTextIcon,
  UserRoundIcon,
  WalletIcon,
} from 'lucide-react'

import { useSession } from '@/app/session/hooks'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const ACCOUNT_LINKS = [
  { to: '/account/profile', label: 'Meu perfil', Icon: UserRoundIcon },
  { to: '/account/wallets', label: 'Carteiras', Icon: WalletIcon },
  { to: '/account/orders', label: 'Meus pedidos', Icon: ReceiptTextIcon },
] as const

const firstName = (name: string): string => name.split(' ')[0] ?? name

interface MobileAccountMenuProps {
  /**
   * `nav` is the visible icon in the bottom tab bar; `shim` is a focusable
   * account trigger on screens that hide the desktop header but still need the
   * session menu (detail, cart and checkout).
   */
  variant?: 'nav' | 'shim'
  className?: string
}

/**
 * Account entry point for the mobile shell. It mirrors the desktop dropdown so
 * logout and the private destinations behave exactly the same on both layouts.
 */
export const MobileAccountMenu = ({
  variant = 'nav',
  className,
}: MobileAccountMenuProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useSession()

  const triggerClass =
    variant === 'shim'
      ? 'sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-50'
      : 'size-11 rounded-full text-muted-foreground'

  if (!isAuthenticated || !user) {
    return (
      <Link
        to="/login"
        search={{ redirect: location.href }}
        aria-label="Entrar"
        className={cn(
          'grid place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none',
          triggerClass,
          className,
        )}
      >
        <UserRoundIcon aria-hidden className="size-5" />
      </Link>
    )
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => void navigate({ to: '/', replace: true }),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={firstName(user.name)}
          className={cn(triggerClass, className)}
        >
          <UserRoundIcon aria-hidden className="size-5" />
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
  )
}
