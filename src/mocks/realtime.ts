import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'

import type { NftDetail } from '@/features/nfts/api/contracts'
import type { RealtimeEvent } from '@/lib/realtime'
import { isRealtimeEvent } from '@/lib/realtime'
import { db, type StoredOrder } from '@/mocks/db'

/**
 * Simulated Socket.IO server (docs/PLAN.md → Seção 10).
 *
 * Transport, end to end:
 *
 * 1. The app opens a real `socket.io-client` connection (websocket transport
 *    only — the interceptor does not speak Engine.IO polling).
 * 2. MSW's WebSocket interceptor catches it in the page and hands the
 *    connection to the `ws.link('/')` handler below (Socket.IO's default path
 *    is stripped by MSW before matching, which is why the pattern is `/`).
 * 3. `@mswjs/socket.io-binding` encodes/decodes the Socket.IO frames, so the
 *    app talks the real protocol and nothing in the UI knows it is a mock.
 * 4. Handlers publish events here after mutating the db. The event is
 *    delivered to this tab's socket **and** relayed to the other tabs through
 *    a `BroadcastChannel`, where each tab's own mock server delivers it to its
 *    socket. The channel is the *server-side* bus between isolated mock
 *    instances — the client only ever receives events through socket.io.
 *
 * Limitations (documented in README → Tempo real): there is no real Socket.IO
 * server, no rooms/namespaces support in the binding, and the transport is
 * websocket-only. `POST /api/__mock/realtime` can simulate an outage, and
 * `POST /api/__mock/event` injects a crafted event for the deduplication /
 * out-of-order tests.
 */

const CHANNEL = 'kurio:realtime'

type Duplex = ReturnType<typeof toSocketIo>

const connections = new Set<Duplex>()

/** `false` during a simulated outage: nothing is delivered, nothing connects. */
let relayEnabled = true

/** An event only reaches the tab whose session owns it (orders are private). */
const isForThisSession = (event: RealtimeEvent): boolean =>
  event.userId === null || db.session?.userId === event.userId

const deliver = (event: RealtimeEvent): void => {
  for (const io of connections) {
    io.client.emit(event.type, event)
  }
}

/**
 * Publishes an event to this tab's socket and, through the channel, to every
 * other tab (which resyncs its db copy first, so the REST refetch the client
 * triggers next cannot answer with stale data).
 */
export const publishRealtime = (event: RealtimeEvent): void => {
  if (!relayEnabled || !isForThisSession(event)) return
  deliver(event)
  channel?.postMessage(event)
}

const publishNftUpdate = (nft: NftDetail): void => {
  publishRealtime({
    type: 'nft.updated',
    resourceId: nft.id,
    version: db.nextVersion(nft.id),
    occurredAt: new Date().toISOString(),
    userId: null,
    payload: { priceEth: nft.priceEth, available: nft.available },
  })
}

/** Emits `nft.updated` for every price/availability change between two snapshots. */
export const publishNftChanges = (
  before: readonly NftDetail[],
  after: readonly NftDetail[],
): void => {
  const previous = new Map(before.map((nft) => [nft.id, nft]))
  for (const nft of after) {
    const old = previous.get(nft.id)
    if (old && (old.priceEth !== nft.priceEth || old.available !== nft.available)) {
      publishNftUpdate(nft)
    }
  }
}

const publishOrderUpdate = (order: StoredOrder): void => {
  publishRealtime({
    type: 'order.updated',
    resourceId: order.id,
    version: db.nextVersion(order.id),
    occurredAt: new Date().toISOString(),
    userId: order.userId,
    payload: { status: order.status },
  })
}

/**
 * Settles every due payment and announces the result (Seções 8 e 10).
 *
 * The mock answers `confirmed` (stock leaves the catalog, only the bought
 * quantities leave the cart) or `declined` under the `payment-declined`
 * scenario. Confirmation also emits `nft.updated` for each edition whose stock
 * changed, so catalog, detail and cart agree everywhere without a reload.
 *
 * Idempotent: an order already settled by another read is not returned again.
 */
export const settleOrdersAndEmit = (): StoredOrder[] => {
  const settled = db.settleOrders()
  for (const order of settled) {
    if (order.status === 'confirmed') {
      for (const line of order.lines) {
        const nft = db.nfts.find((candidate) => candidate.id === line.nftId)
        if (nft) publishNftUpdate(nft)
      }
    }
    publishOrderUpdate(order)
  }
  return settled
}

/**
 * Settles a pending order when its due time arrives, without waiting for a
 * GET — the event has to fire even if nobody ever asks for the order again.
 * The timer lives in the tab that created the purchase; the lazy `db` reads in
 * the GET handlers remain as the recovery path.
 */
export const scheduleOrderSettlement = (order: StoredOrder): void => {
  const delay = Math.max(0, Date.parse(order.settleAt) - Date.now())
  setTimeout(() => settleOrdersAndEmit(), delay)
}

/** Simulated outage: existing sockets drop and new handshakes are refused. */
export const setRealtimeRelay = (enabled: boolean): void => {
  relayEnabled = enabled
  if (enabled) return
  for (const io of connections) {
    io.rawClient.close(1000, 'outage simulada')
  }
  connections.clear()
}

const socketHandler = ws.link('/')

socketHandler.addEventListener('connection', (connection) => {
  if (!relayEnabled) {
    // Outage window: refuse the handshake so socket.io keeps retrying with its
    // backoff instead of believing it is connected to a silent server.
    connection.client.close(1000, 'outage simulada')
    return
  }

  const io = toSocketIo(connection)
  connections.add(io)
  connection.client.addEventListener(
    'close',
    () => {
      connections.delete(io)
    },
    { once: true },
  )
})

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

if (channel) {
  channel.onmessage = (message) => {
    const event: unknown = message.data
    if (!isRealtimeEvent(event)) return
    // Another tab mutated the shared localStorage: resync before answering the
    // REST refetch this event is about to trigger in the client.
    db.reload()
    if (!relayEnabled || !isForThisSession(event)) return
    deliver(event)
  }
}

/** Registered with the MSW handlers (see `handlers/index.ts`). */
export const realtimeHandlers = [socketHandler]
