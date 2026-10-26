import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface AuthFrameProps {
  active: 'login' | 'register'
  title: string
  description: string
  /** Destination kept in the URL so login/register return to the guarded flow. */
  redirect?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shared frame for `/login` and `/register`, following the KURIO design: the
 * two screens are one flow, so they are switchable from the top and keep the
 * `redirect` search param — closing the loop opened by the route guard.
 *
 * On mobile the frame drops the desktop card/nav and becomes the standalone
 * form from the app frames: centred wordmark, no chrome, full-width fields.
 */
export const AuthFrame = ({
  active,
  title,
  description,
  redirect,
  children,
  footer,
}: AuthFrameProps) => {
  const tabClass = (isActive: boolean) =>
    cn(
      'rounded-sm px-1 py-1 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none',
      isActive
        ? 'text-primary underline underline-offset-8'
        : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6 max-md:px-6 max-md:py-0">
      <div className="pt-28 pb-24 text-center md:hidden">
        <Link
          to="/"
          className="rounded-sm text-sm font-bold tracking-[0.3em] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          KURIO
        </Link>
      </div>

      <nav
        aria-label="Autenticação"
        className="flex items-center justify-center gap-3 text-base font-bold uppercase max-md:hidden"
      >
        <Link
          to="/login"
          search={{ redirect }}
          aria-current={active === 'login' ? 'page' : undefined}
          className={tabClass(active === 'login')}
        >
          Entrar
        </Link>
        <span aria-hidden className="text-muted-foreground/50">
          |
        </span>
        <Link
          to="/register"
          search={{ redirect }}
          aria-current={active === 'register' ? 'page' : undefined}
          className={tabClass(active === 'register')}
        >
          Criar conta
        </Link>
      </nav>

      <div className="mt-8 rounded-md border border-border/70 bg-card p-6 sm:p-8 max-md:mt-0 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0">
        <h1 className="text-display text-2xl max-md:font-sans max-md:text-[1.4rem] max-md:font-bold max-md:normal-case max-md:tracking-normal max-md:text-center">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-md:hidden">{description}</p>
        <div className="mt-6 max-md:mt-8">{children}</div>
      </div>

      {footer ? (
        <div className="mt-4 text-center text-sm text-muted-foreground max-md:hidden">
          {footer}
        </div>
      ) : null}
    </section>
  )
}
