import { queryOptions } from '@tanstack/react-query'

import { fetchSession } from '@/features/auth/api/endpoints'
import { queryKeys } from '@/lib/query/keys'

/**
 * Session query.
 *
 * A visitor gets 401, which is a normal answer, not a failure: retries are off
 * and the hooks treat `UNAUTHORIZED` as "signed out" instead of an error state.
 */
export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => fetchSession(signal),
    retry: false,
    staleTime: 60_000,
  })
