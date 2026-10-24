import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/api/errors'

/**
 * Cache + retry policy (documented in README → "Política de cache").
 *
 * - `staleTime: 30s` for everything by default; catalog stays snappy while
 *   Socket.IO keeps it fresh.
 * - `gcTime: 5min` so navigating back feels instant.
 * - retries only for network / 5xx errors, never for 4xx, and never for
 *   mutations (an order must not be created twice).
 * - no refetch on window focus: real-time events and explicit invalidation are
 *   the source of truth.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            if (!error.isRetryable) return false
            if (error.isUnauthorized) return false
          }
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
      },
      mutations: {
        retry: 0,
      },
    },
  })

/** Singleton used by the app; tests create their own via `createQueryClient()`. */
export const queryClient = createQueryClient()
