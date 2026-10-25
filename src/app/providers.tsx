import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'

import { SessionProvider } from '@/app/session/provider'
import { RealtimeProvider } from '@/app/realtime/provider'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query/client'

/**
 * Global providers. Order matters:
 * QueryClientProvider wraps the router so route loaders and components share the
 * same cache; SessionProvider sits inside it because the session is a query and
 * is read by the header, the route guards and every private feature.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>
      {children}
      {/* Reads the session above; one socket per tab, torn down on unmount. */}
      <RealtimeProvider />
      <Toaster position="top-right" closeButton />
      {import.meta.env.DEV ? (
        <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
      ) : null}
    </SessionProvider>
  </QueryClientProvider>
)
