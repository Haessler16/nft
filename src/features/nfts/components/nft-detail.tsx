import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ChevronLeftIcon,
  CopyIcon,
  HeartIcon,
  MinusIcon,
  PlusIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  StarIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { useSession } from '@/app/session/hooks'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MobileAccountMenu } from '@/components/layout/mobile-account-menu'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCartMutations } from '@/features/cart/api/mutations'
import { useFavoriteToggle } from '@/features/favorites/hooks'
import type { NftDetail as NftDetailData, NftReview } from '@/features/nfts/api/contracts'
import { relatedNftsQueryOptions } from '@/features/nfts/api/queries'
import { NftCard } from '@/features/nfts/components/nft-card'
import { NftCardSkeleton } from '@/features/nfts/components/nft-card-skeleton'
import { NftGallery } from '@/features/nfts/components/nft-gallery'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/money'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/** Star row for the collector rating (average rounded to the nearest star). */
const Stars = ({ average }: { average: number }) => (
  <span role="img" aria-label={`Nota ${average} de 5`} className="flex items-center gap-0.5">
    {Array.from({ length: 5 }, (_, index) => (
      <StarIcon
        key={index}
        aria-hidden
        className={cn(
          'size-4',
          index < Math.round(average) ? 'fill-primary text-primary' : 'text-muted-foreground/50',
        )}
      />
    ))}
  </span>
)

const InfoRow = ({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) => (
  <div className={cn('flex flex-col gap-0.5 sm:flex-row sm:gap-2', className)}>
    <dt className="font-bold sm:w-40 sm:shrink-0">{label}</dt>
    <dd className="text-muted-foreground">{children}</dd>
  </div>
)

const ReviewCard = ({ review }: { review: NftReview }) => (
  <li className="flex flex-col gap-1 border-b border-border/60 pb-4 last:border-0">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-bold">{review.author}</p>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Stars average={review.rating} />
        <time dateTime={review.createdAt}>
          {new Date(review.createdAt).toLocaleDateString('pt-BR')}
        </time>
      </p>
    </div>
    <p className="text-sm text-muted-foreground">{review.comment}</p>
  </li>
)

interface NftDetailProps {
  nft: NftDetailData
}

/**
 * Detail screen (docs/PLAN.md → Seção 6).
 *
 * Everything shown here comes from `GET /nfts/:id`; the only client-side state
 * is the gallery view, the quantity (capped by availability) and the two
 * mutations — the optimistic favorite (`features/favorites`) and the add to
 * cart (`features/cart`), both of which report through the live region below
 * the buttons so screen readers hear the outcome without moving focus.
 */
export const NftDetail = ({ nft }: NftDetailProps) => {
  const { scope } = useSession()
  const favorite = useFavoriteToggle(nft.id)
  const cart = useCartMutations(scope)
  const isMobile = useIsMobile()

  const [requested, setRequested] = useState(1)
  const maxQuantity = Math.max(nft.available, 0)
  const soldOut = maxQuantity === 0
  const quantity = Math.min(Math.max(requested, 1), Math.max(maxQuantity, 1))

  const related = useQuery(relatedNftsQueryOptions(nft.collection))
  const relatedItems = (related.data?.items ?? [])
    .filter((item) => item.id !== nft.id)
    .slice(0, 5)

  const rating = nft.rating

  const addToCart = () => {
    cart.addItem.mutate({ nftId: nft.id, quantity })
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link do NFT copiado.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  /** Live region: success, failure and favorite rollback are all announced. */
  const cartStatus = cart.addItem.isError
    ? isApiError(cart.addItem.error)
      ? cart.addItem.error.message
      : 'Não foi possível adicionar ao carrinho.'
    : cart.addItem.isPending
      ? 'Adicionando ao carrinho…'
      : cart.addItem.isSuccess
        ? 'Adicionado ao carrinho.'
        : ''

  const favoriteStatus = favorite.isError
    ? 'Não foi possível atualizar o favorito. O estado anterior foi restaurado.'
    : favorite.isPending
      ? 'Atualizando favoritos…'
      : ''

  /** One live region, rendered either in the mobile action bar or in the page. */
  const statusNode = (
    <p
      role="status"
      aria-live="polite"
      data-testid="detalhe-status"
      className={cn(
        'text-sm',
        isMobile ? 'min-h-4 text-xs' : 'min-h-5',
        cart.addItem.isError || favorite.isError ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {cartStatus || favoriteStatus}
      {cart.addItem.isSuccess && !cart.addItem.isPending ? (
        <>
          {' '}
          <Link to="/cart" className="text-primary underline underline-offset-4">
            Ver carrinho
          </Link>
        </>
      ) : null}
    </p>
  )

  return (
    <section className="shell py-5 max-md:pb-44 md:py-8">
      {isMobile ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => window.history.back()}
            className="grid size-10 place-items-center rounded-full border border-border/70 bg-card text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <ChevronLeftIcon aria-hidden className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <MobileAccountMenu className="size-10 rounded-full border border-border/70 bg-card" />
            <button
              type="button"
              aria-pressed={favorite.favorited}
              aria-label={favorite.favorited ? 'Remover dos favoritos' : 'Favoritar'}
              onClick={favorite.toggle}
              disabled={favorite.isPending}
              data-testid="detalhe-favoritar"
              className={cn(
                'grid size-10 place-items-center rounded-full border border-border/70 bg-card focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:opacity-50',
                favorite.favorited && 'text-primary',
              )}
            >
              <HeartIcon
                aria-hidden
                className={cn('size-5', favorite.favorited && 'fill-current')}
              />
              <span className="sr-only">
                {favorite.favorited ? 'Favoritado' : 'Favoritar'}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <div className={isMobile ? 'sr-only' : undefined}>
        <Breadcrumb items={[{ label: 'Mercado', to: '/' }, { label: nft.name }]} />
      </div>

      <div className="mt-4 grid gap-8 md:mt-6 md:gap-10 lg:grid-cols-2">
        <NftGallery nft={nft} />

        <div className="flex flex-col gap-5">
          <div>
            <h1
              className={cn(
                'text-display',
                isMobile
                  ? 'font-sans text-[1.35rem] font-bold tracking-normal normal-case'
                  : 'text-3xl',
              )}
            >
              {nft.name}
            </h1>

            {isMobile ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{nft.collection}</p>
                {rating ? (
                  <p className="flex shrink-0 items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1 text-[0.68rem] font-bold text-primary">
                    <StarIcon aria-hidden className="size-3 fill-current" />
                    {Number(rating.average).toFixed(1)}
                    <span className="font-normal text-muted-foreground">({rating.count})</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-baseline gap-2 text-xl font-bold text-primary">
                  <span>{formatEth(nft.priceEth, { maxFractionDigits: 4 })}</span>
                  {nft.compareAtPriceEth ? (
                    <s className="text-sm font-normal text-muted-foreground">
                      {formatEth(nft.compareAtPriceEth, { maxFractionDigits: 4 })}
                    </s>
                  ) : null}
                </p>
                {rating ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Stars average={Number(rating.average)} />
                    <span>
                      {rating.count} avaliaç{rating.count === 1 ? 'ão' : 'ões'} de colecionadores
                    </span>
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold max-md:hidden">Sobre este NFT:</h2>
            <p className="mt-1 text-sm text-muted-foreground">{nft.description}</p>
          </div>

          <div>
            <h2 className="text-sm font-bold">Edição:</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {nft.edition.number}/{nft.edition.of}
              </Badge>
              <Badge variant={soldOut ? 'outline' : 'secondary'} data-testid="detalhe-edicao-estado">
                {soldOut ? 'Esgotada' : 'Aberta'}
              </Badge>
              <Badge variant="outline">{nft.network}</Badge>
              <span className="text-xs text-muted-foreground">
                {soldOut ? 'Nenhuma unidade disponível' : `${maxQuantity} unidade(s) disponível(eis)`}
              </span>
            </div>
          </div>

          {soldOut ? (
            <Alert variant="destructive" data-testid="detalhe-esgotado">
              <AlertTitle>Edição esgotada</AlertTitle>
              <AlertDescription>
                Não há unidades desta edição à venda. Você pode continuar explorando a coleção.
              </AlertDescription>
            </Alert>
          ) : !isMobile ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2" role="group" aria-label="Quantidade">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Diminuir quantidade"
                  disabled={quantity <= 1}
                  onClick={() => setRequested(quantity - 1)}
                >
                  <MinusIcon aria-hidden />
                </Button>
                <output
                  aria-live="polite"
                  className="w-6 text-center text-sm font-bold tabular-nums"
                >
                  {quantity}
                </output>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Aumentar quantidade"
                  disabled={quantity >= maxQuantity}
                  onClick={() => setRequested(quantity + 1)}
                >
                  <PlusIcon aria-hidden />
                </Button>
                <span className="text-xs text-muted-foreground">máx. {maxQuantity}</span>
              </div>

              <Button
                type="button"
                onClick={addToCart}
                disabled={cart.addItem.isPending}
                data-testid="detalhe-comprar"
              >
                {cart.addItem.isPending ? 'Adicionando…' : 'Comprar'}
              </Button>

              <Button
                type="button"
                variant="outline"
                aria-pressed={favorite.favorited}
                onClick={favorite.toggle}
                disabled={favorite.isPending}
                data-testid="detalhe-favoritar"
              >
                <HeartIcon aria-hidden className={favorite.favorited ? 'fill-current' : ''} />
                {favorite.favorited ? 'Favoritado' : 'Favoritar'}
              </Button>
            </div>
          ) : null}

          {!isMobile || soldOut ? statusNode : null}

          {isMobile && !soldOut ? (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-4 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
              <div className="mx-auto flex max-w-lg flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2" role="group" aria-label="Quantidade">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Diminuir quantidade"
                      disabled={quantity <= 1}
                      onClick={() => setRequested(quantity - 1)}
                      className="size-8 rounded-full"
                    >
                      <MinusIcon aria-hidden />
                    </Button>
                    <output
                      aria-live="polite"
                      className="w-6 text-center text-sm font-bold tabular-nums"
                    >
                      {quantity}
                    </output>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Aumentar quantidade"
                      disabled={quantity >= maxQuantity}
                      onClick={() => setRequested(quantity + 1)}
                      className="size-8 rounded-full"
                    >
                      <PlusIcon aria-hidden />
                    </Button>
                    <span className="text-[0.7rem] text-muted-foreground">
                      máx. {maxQuantity}
                    </span>
                  </div>

                  <p className="text-base font-bold text-primary tabular-nums">
                    {formatEth(nft.priceEth, { maxFractionDigits: 4 })}
                  </p>
                </div>

                {statusNode}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={addToCart}
                    disabled={cart.addItem.isPending}
                    data-testid="detalhe-comprar"
                    className="h-12 flex-1 rounded-xl text-sm"
                  >
                    {cart.addItem.isPending ? 'Adicionando…' : 'Comprar NFT'}
                  </Button>
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    className="size-12 shrink-0 rounded-xl p-0"
                  >
                    <Link to="/cart" aria-label="Abrir carrinho">
                      <ShoppingBagIcon aria-hidden className="size-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <dl className="flex flex-col gap-1.5 border-t pt-4 text-sm">
            <InfoRow label="ID do token:">#{nft.tokenId}</InfoRow>
            <InfoRow label="Coleção:">{nft.collection}</InfoRow>
            <InfoRow label="Criador:" className="max-md:hidden">
              {nft.creator.name}
            </InfoRow>
            <InfoRow label="Categoria:" className="max-md:hidden">
              {nft.category}
            </InfoRow>
            <InfoRow label="Atributos:">
              {nft.attributes.map((attribute) => attribute.value).join(', ')}
            </InfoRow>
          </dl>

          <div className="flex flex-wrap items-center gap-2 text-sm max-md:hidden">
            <span className="text-muted-foreground">Compartilhar este NFT:</span>
            <Button type="button" variant="ghost" size="xs" onClick={() => void copyLink()}>
              <CopyIcon aria-hidden />
              Copiar link
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="detalhes" className="mt-8 border-t pt-6 md:mt-12">
        <TabsList
          variant="line"
          className="h-auto w-full flex-wrap justify-start gap-4 rounded-none border-b border-border/70 p-0 md:flex-nowrap md:gap-6"
        >
          <TabsTrigger
            value="detalhes"
            className="flex-none rounded-none border-b-2 border-transparent px-0 pb-3 text-xs font-bold uppercase tracking-[0.1em] data-[state=active]:border-primary data-[state=active]:text-primary md:text-sm"
          >
            <span className="md:hidden">Descrição</span>
            <span className="max-md:hidden">Detalhes do NFT</span>
          </TabsTrigger>
          <TabsTrigger
            value="avaliacoes"
            aria-label={`Avaliações de colecionadores (${nft.reviews.length})`}
            className="flex-none rounded-none border-b-2 border-transparent px-0 pb-3 text-xs font-bold uppercase tracking-[0.1em] data-[state=active]:border-primary data-[state=active]:text-primary md:text-sm"
          >
            <span className="md:hidden">Avaliações ({nft.reviews.length})</span>
            <span className="max-md:hidden">
              Avaliações de colecionadores ({nft.reviews.length})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="pt-5">
          <div className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>
              <span className="font-bold text-foreground">{nft.name}</span> é uma peça digital da
              coleção {nft.collection}. Cada atributo fica armazenado nos metadados do token e
              verificado na {nft.network}.
            </p>
            <p>{nft.description}</p>
          </div>

          <dl className="mt-6 flex flex-col gap-4 text-sm">
            <InfoRow label="Rede:">{nft.info.provenance}</InfoRow>
            <InfoRow label="Contrato:">{nft.info.royalties}</InfoRow>
            <InfoRow label="Direitos autorais:">{nft.info.contracts}</InfoRow>
          </dl>
        </TabsContent>

        <TabsContent value="avaliacoes" className="pt-5">
          {nft.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esta peça ainda não recebeu avaliações de colecionadores.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {nft.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <section aria-labelledby="relacionados-titulo" className="mt-12 border-t pt-8">
        <h2 id="relacionados-titulo" className="text-display text-lg">
          Mais desta coleção
        </h2>

        {related.isPending ? (
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <NftCardSkeleton key={index} />
            ))}
          </div>
        ) : related.isError ? (
          <div
            role="alert"
            className="mt-6 flex flex-col items-start gap-3 rounded-md bg-card p-5 text-sm"
          >
            <p className="font-bold text-destructive">Não foi possível carregar a coleção</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void related.refetch()}>
              <RefreshCwIcon aria-hidden />
              Tentar novamente
            </Button>
          </div>
        ) : relatedItems.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Não há outras peças publicadas nesta coleção.
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {relatedItems.map((item) => (
              <li key={item.id}>
                <NftCard nft={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
