import { Link, type RouteIds, type RegisteredRouter } from '@tanstack/react-router'
import { Fragment } from 'react'

/**
 * Every path in the route tree, so a crumb can only point at a real screen
 * (`__root__` is an id, not a path, and `/account/` is written `/account`).
 */
type RoutePath = Exclude<RouteIds<RegisteredRouter['routeTree']>, '__root__' | '/account/'>

export interface Crumb {
  label: string
  /** Route the crumb links to; the last crumb omits it and is the current page. */
  to?: RoutePath
}

/**
 * Shared breadcrumb (detail, cart and checkout follow the same trail).
 *
 * The last item is the current page: it is rendered as text with
 * `aria-current="page"` instead of a link, and the whole trail is a labelled
 * navigation landmark so screen readers can jump straight to it.
 */
export const Breadcrumb = ({ items }: { items: readonly Crumb[] }) => (
  <nav aria-label="Trilha de navegação" className="text-xs text-muted-foreground">
    <ol className="flex flex-wrap items-center gap-2">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <li aria-hidden className="text-muted-foreground/50">
                /
              </li>
            ) : null}
            <li>
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        )
      })}
    </ol>
  </nav>
)
