import { redirect } from '@tanstack/react-router'

import type { RouterContext } from '@/app/router-context'
import { sessionQueryOptions } from '@/features/auth/api/queries'
import { isApiError } from '@/lib/api/errors'
import { ensureQueryData } from '@/lib/query/ensure'

/**
 * Private-route guard (docs/PLAN.md → Seção 4).
 *
 * `beforeLoad` runs before the route renders, so `/checkout`, `/account/*` and
 * the order pages never flash their content to a visitor. The session is read
 * through the same cache the app uses (`ensureQueryData`), which means:
 *
 * - a valid session (even a refreshed one) passes through;
 * - an expired session sends the user to `/login` **with the destination** in
 *   `redirect`, so login returns them exactly where they were.
 *
 * A real failure (network/5xx) is rethrown and handled by the route's error
 * boundary — only 401 means "signed out". `ensureQueryData` here is the wrapper
 * from `lib/query/ensure`, which ignores the `CancelledError` React StrictMode
 * causes on cold loads, so the guard always reaches its own decision.
 */
interface GuardArgs {
  context: RouterContext
  location: { href: string }
}

/** Only same-origin paths: `//host` and absolute URLs are rejected. */
export const safeInternalPath = (value: string | undefined): string => {
  if (!value) return '/'
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export const requireSession = async ({ context, location }: GuardArgs): Promise<void> => {
  try {
    await ensureQueryData(context.queryClient, {
      ...sessionQueryOptions(),
      revalidateIfStale: true,
    })
  } catch (error) {
    if (isApiError(error) && error.isUnauthorized) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
        replace: true,
      })
    }
    throw error
  }
}
