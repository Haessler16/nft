import type { QueryClient } from '@tanstack/react-query'

/**
 * Context injected into every route.
 *
 * Loaders receive `queryClient`, so route-level data fetching can use
 * `queryClient.ensureQueryData(...)` and share the cache with the components.
 * Add here anything routes need (session, feature flags) instead of importing
 * singletons inside components.
 */
export interface RouterContext {
  queryClient: QueryClient
}
