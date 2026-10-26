import { queryOptions } from '@tanstack/react-query'

import { fetchProfile } from '@/features/profile/api/endpoints'
import { queryKeys, type UserScope } from '@/lib/query/keys'

export const profileQueryOptions = (scope: UserScope, enabled = true) =>
  queryOptions({
    queryKey: queryKeys.profile.byUser(scope),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled,
    staleTime: 30_000,
  })
