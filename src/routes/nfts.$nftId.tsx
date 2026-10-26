import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { nftDetailQueryOptions } from '@/features/nfts/api/queries'
import { DetailSkeleton } from '@/features/nfts/components/detail-skeleton'
import { NftDetail } from '@/features/nfts/components/nft-detail'
import { isApiError } from '@/lib/api/errors'
import { ensureQueryData } from '@/lib/query/ensure'

/**
 * `/nfts/$nftId` (docs/PLAN.md → Seção 6).
 *
 * - the loader prefetches into the same cache entry the component observes, so
 *   a direct URL paints the detail (or its skeleton) without a second request;
 * - a 404 from the API is turned into `notFound()` → the route renders the
 *   dedicated not-found screen inside the shell, never an error boundary;
 * - any other failure lands in the component's retry state.
 */

export const Route = createFileRoute('/nfts/$nftId')({
  loader: async ({ context, params }) => {
    try {
      return await ensureQueryData(context.queryClient, nftDetailQueryOptions(params.nftId))
    } catch (error) {
      if (isApiError(error) && error.status === 404) throw notFound()
      throw error
    }
  },
  notFoundComponent: NftNotFound,
  head: () => ({
    meta: [
      { title: 'Detalhe do NFT — KURIO' },
      { property: 'og:title', content: 'Detalhe do NFT — KURIO' },
    ],
  }),
  component: NftDetailRoute,
})

/** 404 inside the shell: the header keeps working, the message explains what happened. */
function NftNotFound() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 py-12 sm:px-6 sm:py-24">
      <Link
        to="/"
        className="rounded-sm text-xs font-bold tracking-[0.3em] md:hidden"
      >
        KURIO
      </Link>
      <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Este NFT não está disponível</h1>
      <p className="text-muted-foreground">
        A peça foi removida do catálogo ou o endereço está incorreto. Volte ao mercado para
        explorar outras obras.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao mercado</Link>
      </Button>
    </section>
  )
}

function NftDetailRoute() {
  const { nftId } = Route.useParams()
  const query = useQuery(nftDetailQueryOptions(nftId))

  if (query.isPending) return <DetailSkeleton />

  if (query.isError) {
    return (
      <section className="shell py-16" role="alert">
        <div className="flex max-w-xl flex-col items-start gap-3 rounded-md bg-card p-6 text-sm">
          <p className="font-bold text-destructive">Não foi possível carregar este NFT</p>
          <p className="text-muted-foreground">
            A conexão falhou ou o serviço está indisponível. Tente novamente em instantes.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RefreshCwIcon aria-hidden />
            Tentar novamente
          </Button>
        </div>
      </section>
    )
  }

  if (!query.data) return <DetailSkeleton />

  return <NftDetail nft={query.data} />
}
