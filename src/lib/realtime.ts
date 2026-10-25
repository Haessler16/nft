/**
 * Realtime contract (docs/PLAN.md → Seção 10).
 *
 * Shared by the simulated server (`src/mocks/realtime.ts`, running inside the
 * MSW worker) and the browser client (`src/app/realtime/provider.tsx`, which
 * talks through `socket.io-client`). Nothing here reads the Query cache: events
 * only say *what changed*, and the client always reconciles through REST.
 *
 * Every event carries:
 *
 * - `resourceId` — the stable identity of the affected resource;
 * - `version` — a monotonically increasing number per resource (wall-clock
 *   based, persisted with the mock db). The client discards any event whose
 *   version is not newer than the last one applied, which covers duplicates
 *   and out-of-order delivery;
 * - `occurredAt` — when the server produced it;
 * - `userId` — owner for private resources (`order.updated`); `null` for
 *   public ones. The simulated server filters by the receiving tab's session,
 *   so events from another account are never delivered.
 */

export const REALTIME_EVENT_NAMES = ['nft.updated', 'order.updated'] as const
export type RealtimeEventName = (typeof REALTIME_EVENT_NAMES)[number]

/** Price/availability snapshot for `nft.updated`. */
export interface NftUpdatedPayload {
  priceEth: string
  available: number
}

/**
 * Settlement state for `order.updated`. Typed as plain `string` on purpose:
 * the client never trusts it to render the receipt — it only uses it to decide
 * that it must refetch `GET /api/orders/:id`, and the REST answer is the truth.
 */
export interface OrderUpdatedPayload {
  status: string
}

export interface RealtimeEventBase<TName extends RealtimeEventName, TPayload> {
  type: TName
  resourceId: string
  version: number
  occurredAt: string
  userId: string | null
  payload: TPayload
}

export type NftUpdatedEvent = RealtimeEventBase<'nft.updated', NftUpdatedPayload>
export type OrderUpdatedEvent = RealtimeEventBase<'order.updated', OrderUpdatedPayload>
export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** Structural check for events arriving from the socket or a BroadcastChannel. */
export const isRealtimeEvent = (value: unknown): value is RealtimeEvent => {
  if (!isRecord(value)) return false
  if (typeof value.type !== 'string' || !REALTIME_EVENT_NAMES.includes(value.type as RealtimeEventName)) {
    return false
  }
  if (typeof value.resourceId !== 'string' || value.resourceId.length === 0) return false
  if (typeof value.version !== 'number' || !Number.isFinite(value.version)) return false
  if (typeof value.occurredAt !== 'string') return false
  if (value.userId !== null && typeof value.userId !== 'string') return false
  if (!isRecord(value.payload)) return false

  if (value.type === 'nft.updated') {
    const payload = value.payload as Record<string, unknown>
    return (
      typeof payload.priceEth === 'string' &&
      typeof payload.available === 'number' &&
      Number.isInteger(payload.available) &&
      payload.available >= 0
    )
  }
  return typeof (value.payload as Record<string, unknown>).status === 'string'
}

/**
 * Last version applied per resource (page scope).
 *
 * Versions are wall-clock based, so the guard stays monotonic even after
 * `POST /api/__mock/reset` restores the seed (new versions are always in the
 * future). An event is applied only when it is strictly newer.
 */
const lastApplied = new Map<string, number>()

export const acceptRealtimeEvent = (event: RealtimeEvent): boolean => {
  const previous = lastApplied.get(event.resourceId)
  if (previous !== undefined && event.version <= previous) return false
  lastApplied.set(event.resourceId, event.version)
  return true
}

/** Drops the guard history (used when the socket layer shuts down). */
export const resetRealtimeVersions = (): void => {
  lastApplied.clear()
}

/**
 * Connection status of the mocked Socket.IO client, readable synchronously
 * anywhere (the order query consults it to decide between event-driven updates
 * and the REST poll fallback).
 */
export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

let realtimeStatusValue: RealtimeStatus = 'idle'
const statusListeners = new Set<() => void>()

export const getRealtimeStatus = (): RealtimeStatus => realtimeStatusValue

export const setRealtimeStatus = (next: RealtimeStatus): void => {
  if (next === realtimeStatusValue) return
  realtimeStatusValue = next
  for (const listener of statusListeners) listener()
}

export const subscribeRealtimeStatus = (listener: () => void): (() => void) => {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}
