import {
  CancelledError,
  type DefaultError,
  type EnsureQueryDataOptions,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'

/**
 * `queryClient.ensureQueryData` that tolerates React StrictMode
 * (docs/PLAN.md → Seções 4 e 6).
 *
 * In development StrictMode mounts, unmounts and mounts every component again.
 * When the *last* observer of a query unsubscribes while its fetch is still in
 * flight, React Query reverts that fetch with a `CancelledError`. Route guards
 * and loaders `await ensureQueryData(...)` imperatively, so that rejection used
 * to reach the route's error boundary and abort the navigation — a private route
 * showed `CancelledError` instead of redirecting to `/login`.
 *
 * A cancelled fetch is not a real failure: the cache entry is still empty, so
 * the same options are replayed once through `fetchQuery`, which joins a fetch
 * the observers already restarted instead of starting (and cancelling) another
 * one. Real failures (401, 404, network) are rethrown untouched, so guards keep
 * redirecting and loaders keep mapping errors.
 */
export const ensureQueryData = async <
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryClient: QueryClient,
  options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<TData> => {
  try {
    return await queryClient.ensureQueryData<TQueryFnData, TError, TData, TQueryKey>(options)
  } catch (error) {
    if (!(error instanceof CancelledError)) throw error
    return await queryClient.fetchQuery<TQueryFnData, TError, TData, TQueryKey>(options)
  }
}
