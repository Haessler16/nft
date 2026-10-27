import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { useLayoutEffect, useRef } from 'react'

import type { RouterContext } from '@/app/router-context'
import { NotFoundState, RouteErrorState } from '@/components/feedback/route-states'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { title: 'KURIO — marketplace de NFTs' },
      {
        name: 'description',
        content:
          'Explore, favorite e compre NFTs na KURIO: catálogo com curadoria, carrinho, checkout e conta do colecionador — tudo com dados simulados.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'KURIO — marketplace de NFTs' },
      { property: 'og:locale', content: 'pt_BR' },
    ],
    // Canonical must be absolute; deriving it from the current origin keeps the
    // demo correct locally and on whatever host it is published to.
    links:
      typeof window === 'undefined'
        ? []
        : [
            {
              rel: 'canonical',
              href: `${window.location.origin}${window.location.pathname}`,
            },
          ],
  }),
  component: RootLayout,
  notFoundComponent: NotFoundState,
  errorComponent: ({ error, reset }) => <RouteErrorState error={error} reset={reset} />,
})

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const pageRef = useRef<HTMLDivElement>(null)

  /*
   * Replays the route fade on every path change *without* remounting the
   * Outlet: remounting the subtree disturbs the auth/guard redirect flow, so we
   * only restart the CSS animation on the stable wrapper.
   */
  useLayoutEffect(() => {
    const node = pageRef.current
    if (!node) return
    node.classList.remove('animate-page-in')
    void node.offsetWidth // force reflow so the animation restarts
    node.classList.add('animate-page-in')
  }, [pathname])

  /**
   * Screens with their own mobile frame (auth, home, detail, cart, checkout).
   * The desktop header/footer stay mounted for their tests and desktop layout,
   * but are removed from the mobile visual flow.
   */
  const immersive =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname.startsWith('/nfts/')

  const isHome = pathname === '/'
  const needsAccountShim =
    pathname === '/cart' || pathname === '/checkout' || pathname.startsWith('/nfts/')
  const hideFooterOnMobile = immersive && !isHome

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <HeadContent />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <div className={immersive ? 'hidden md:block' : undefined}>
        <SiteHeader />
      </div>
      <main
        id="conteudo"
        className={
          isHome ? 'flex-1 max-md:pb-24' : needsAccountShim ? 'flex-1 max-md:pb-10' : 'flex-1'
        }
      >
        {/* Soft cross-fade whenever the path changes; search/hash updates keep it mounted. */}
        <div ref={pageRef} className="animate-page-in">
          <Outlet />
        </div>
      </main>
      <div className={hideFooterOnMobile ? 'hidden md:block' : undefined}>
        <SiteFooter />
      </div>
      {isHome ? <MobileTabBar /> : null}
    </div>
  )
}
