import { ChevronLeftIcon } from 'lucide-react'

import { MobileAccountMenu } from '@/components/layout/mobile-account-menu'

/**
 * Back + centred title used by the app-style mobile screens (cart/checkout).
 * The account menu on the right replaces the spacer and keeps sign-out
 * reachable without the desktop header.
 */
export const MobilePageHeader = ({ title }: { title: string }) => (
  <header role="banner" className="flex items-center gap-2 md:hidden">
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => window.history.back()}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-border/70 bg-card text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      <ChevronLeftIcon aria-hidden className="size-5" />
    </button>
    <h1 className="flex-1 text-center text-sm font-bold tracking-[0.02em]">{title}</h1>
    <MobileAccountMenu className="size-10 shrink-0 rounded-full border border-border/70 bg-card" />
  </header>
)
