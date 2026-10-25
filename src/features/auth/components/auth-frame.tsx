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
      isActive ? 'text-primary underline underline-offset-8' : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <nav
        aria-label="Autenticação"
        className="flex items-center justify-center gap-3 text-base font-bold uppercase"
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

      <div className="mt-8 rounded-md border border-border/70 bg-card p-6 sm:p-8">
        <h1 className="text-display text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6">{children}</div>
      </div>

      {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </section>
  )
}
