import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query/client'

/**
 * Global providers. Order matters:
 * QueryClientProvider wraps the router so route loaders and components share the
 * same cache. Session and socket providers will be nested here (sections 4 and 10
 * of docs/PLAN.md) — inside Query, because they read from it.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
    <Toaster position="top-right" closeButton />
    {import.meta.env.DEV ? (
      <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
    ) : null}
  </QueryClientProvider>
)
