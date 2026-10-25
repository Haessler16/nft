import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useSession } from '@/app/session/hooks'
import type { NftDetail } from '@/features/nfts/api/contracts'
import {
  acceptRealtimeEvent,
  getRealtimeStatus,
  isRealtimeEvent,
  resetRealtimeVersions,
  setRealtimeStatus,
  subscribeRealtimeStatus,
} from '@/lib/realtime'
import { queryKeys } from '@/lib/query/keys'

/**
 * Realtime client (docs/PLAN.md → Seção 10).
 *
 * A real `socket.io-client` talks to the simulated server in the MSW worker —
 * the UI never receives an event through setters, callbacks or a direct cache
 * write; every event arrives through the socket and is reconciled with REST.
 *
 * Responsibilities:
 *
 * 1. **Connection.** Websocket transport only (the interceptor does not speak
 *    Engine.IO polling). Status is mirrored on `<html data-realtime>` and in
 *    the status store that the order query reads to choose between
 *    event-driven updates and its poll fallback.
 * 2. **Ordering.** `acceptRealtimeEvent` drops duplicates and out-of-order
 *    events before anything touches the cache.
 * 3. **Reconciliation.** Every (re)connect invalidates the *active* queries, so
 *    anything missed while the socket was down is re-read from REST — including
 *    a pending order that settled during the gap.
 * 4. **Isolation.** Events scoped to a user are ignored unless they belong to
 *    the current session (the server already filters; this is defense in depth).
 * 5. **Feedback.** A polite live region announces realtime changes, coalescing
 *    catalog bursts into a single message.
 */

const ORDER_COPY: Record<string, (id: string) => string> = {
  pending: (id) => `Pedido ${id} em processamento.`,
  confirmed: (id) => `Pedido ${id} confirmado. O recibo está disponível.`,
  declined: (id) => `Pedido ${id} recusado. Os itens seguem no carrinho.`,
}

const NFT_ANNOUNCEMENT_DEBOUNCE_MS = 400

export const RealtimeProvider = ({ children }: { children?: ReactNode }) => {
  const queryClient = useQueryClient()
  const { user, scope } = useSession()
  const [announcement, setAnnouncement] = useState<string | null>(null)

  // Handlers must see the latest session without re-subscribing the socket.
  const sessionRef = useRef({ userId: user?.id ?? null, scope })
  sessionRef.current = { userId: user?.id ?? null, scope }

  // Coalesce catalog bursts (a scenario can touch every edition at once).
  const nftBatchRef = useRef(0)
  const nftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Mirror the status for CSS/tests: `connecting | connected | disconnected`.
    const mirror = () => {
      document.documentElement.dataset.realtime = getRealtimeStatus()
    }
    mirror()
    return subscribeRealtimeStatus(mirror)
  }, [])

  useEffect(() => {
    const announceNftBatch = () => {
      const count = nftBatchRef.current
      nftBatchRef.current = 0
      nftTimerRef.current = null
      setAnnouncement(
        count === 1
          ? 'Catálogo atualizado em tempo real: preço ou disponibilidade de uma peça mudou.'
          : `Catálogo atualizado em tempo real: preço ou disponibilidade mudou em ${count} peças.`,
      )
    }

    const queueNftAnnouncement = () => {
      nftBatchRef.current += 1
      if (nftTimerRef.current !== null) return
      nftTimerRef.current = setTimeout(announceNftBatch, NFT_ANNOUNCEMENT_DEBOUNCE_MS)
    }

    const handleEvent = (raw: unknown): void => {
      if (!isRealtimeEvent(raw)) return
      const event = raw
      const { userId, scope: currentScope } = sessionRef.current
      // An event from another account never touches this session's data.
      if (event.userId !== null && event.userId !== userId) return
      if (!acceptRealtimeEvent(event)) return

      if (event.type === 'nft.updated') {
        // Instant feedback on the detail screen, then REST re-reads everything
        // that depends on the catalog (lists, cart lines, open quotes).
        queryClient.setQueryData<NftDetail>(
          queryKeys.nfts.detail(event.resourceId),
          (previous) =>
            previous && previous.id === event.resourceId
              ? {
                  ...previous,
                  priceEth: event.payload.priceEth,
                  available: event.payload.available,
                }
              : previous,
        )
        void queryClient.invalidateQueries({
          queryKey: queryKeys.nfts.all(),
          refetchType: 'active',
        })
        void queryClient.invalidateQueries({
          queryKey: queryKeys.cart.all(),
          refetchType: 'active',
        })
        void queryClient.invalidateQueries({
          queryKey: ['quote'],
          refetchType: 'active',
        })
        queueNftAnnouncement()
        return
      }

      // Order: the payload only announces *that* something happened — the
      // receipt renders what `GET /api/orders/:id` answers.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(currentScope, event.resourceId),
        refetchType: 'active',
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.list(currentScope),
        refetchType: 'active',
      })
      const copy = ORDER_COPY[event.payload.status]
      setAnnouncement(copy ? copy(event.resourceId) : `Pedido ${event.resourceId} atualizado.`)
    }

    const socket: Socket = io({
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2_000,
      timeout: 4_000,
    })

    setRealtimeStatus('connecting')
    socket.on('connect', () => {
      setRealtimeStatus('connected')
      // Reconciliation after every (re)connection: active resources are re-read
      // from REST, so a change missed while offline cannot stay on screen.
      void queryClient.invalidateQueries({ refetchType: 'active' })
    })
    socket.on('disconnect', () => setRealtimeStatus('disconnected'))
    socket.on('connect_error', () => setRealtimeStatus('disconnected'))
    socket.on('nft.updated', handleEvent)
    socket.on('order.updated', handleEvent)
    socket.connect()

    return () => {
      if (nftTimerRef.current !== null) {
        clearTimeout(nftTimerRef.current)
        nftTimerRef.current = null
      }
      nftBatchRef.current = 0
      socket.removeAllListeners()
      socket.close()
      resetRealtimeVersions()
      setRealtimeStatus('idle')
    }
  }, [queryClient])

  return (
    <>
      {children}
      <div
        role="status"
        aria-live="polite"
        data-testid="realtime-status"
        className="sr-only"
      >
        {announcement ?? ''}
      </div>
    </>
  )
}
