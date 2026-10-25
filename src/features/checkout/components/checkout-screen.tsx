import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { CircleAlertIcon, RotateCwIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { useSession } from '@/app/session/hooks'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { QuoteResponse } from '@/features/cart/api/contracts'
import { quoteQueryOptions } from '@/features/cart/api/queries'
import { useCart, useQuote } from '@/features/cart/hooks'
import { CheckoutForm } from '@/features/checkout/components/checkout-form'
import { CheckoutSummary } from '@/features/checkout/components/checkout-summary'
import { OrderOutcome } from '@/features/checkout/components/order-outcome'
import { ReviewDialog } from '@/features/checkout/components/review-dialog'
import {
  API_FIELD_ALIAS,
  checkoutSchema,
  type CheckoutValues,
} from '@/features/checkout/schema'
import {
  checkoutFingerprint,
  clearActiveOrderId,
  ensureIdempotencyKey,
  readActiveOrderId,
  saveActiveOrderId,
} from '@/features/checkout/storage'
import type { SessionUser } from '@/features/auth/api/contracts'
import { quotesMatch, type OrderCustomer } from '@/features/orders/api/contracts'
import { useCreateOrder } from '@/features/orders/api/mutations'
import type { Wallet, WalletConnection } from '@/features/wallets/api/contracts'
import { useConnectWallet } from '@/features/wallets/api/mutations'
import { useWallets } from '@/features/wallets/hooks'
import { isApiError } from '@/lib/api/errors'
import { formatEth } from '@/lib/money'
import { GUEST_SCOPE, queryKeys } from '@/lib/query/keys'

/**
 * `/checkout` (docs/PLAN.md → Seção 8).
 *
 * The flow, in order:
 *
 * 1. **Form** — the collector profile, validated with the same rules as the
 *    mocked API. Field messages returned by the API land on the matching input.
 * 2. **Wallet** — registered wallets come from `GET /api/wallets`; the chosen
 *    one is connected through `POST /api/wallets/connect`, which may refuse a
 *    network the provider cannot sign for. Nothing can be reviewed unconnected.
 * 3. **Review** — the dialog shows the order snapshot (customer, wallet, items,
 *    fees, total). Confirming re-fetches the quote and compares it with the
 *    snapshot: a changed total turns the button into "Confirmar novo total"
 *    (explicit second confirmation) and an unavailable edition sends the user
 *    back to the cart.
 * 4. **Send** — an idempotency key is persisted *before* the POST; repeated
 *    clicks are blocked while pending, and a timeout is recovered by querying
 *    the order with that same key.
 * 5. **Outcome** — pending polls the order until confirmed/declined. The active
 *    order id survives a refresh, so a reload reopens the same purchase (never
 *    an empty cart that invites a second buy).
 */

const buildDefaults = (user: SessionUser | null): CheckoutValues => {
  const email = user?.email ?? ''
  const local = (email.split('@')[0] ?? '')
    .replace(/[^a-z0-9._-]/gi, '')
    .toLowerCase()
  const firstName = user?.name.trim().split(/\s+/)[0] ?? ''

  return {
    displayName: user?.name ?? '',
    username: local || 'colecionador',
    profileName: firstName,
    network: 'Ethereum',
    walletAddress: '',
    secondaryWallet: '',
    walletProvider: 'metamask',
    referralCode: '',
    email,
    ensName: local.replace(/[^a-z0-9-]/g, ''),
    note: '',
    useCustomWallet: false,
  }
}

const CheckoutHeader = () => (
  <>
    <Breadcrumb
      items={[
        { label: 'Início', to: '/' },
        { label: 'Mercado', to: '/' },
        { label: 'Pagamento' },
      ]}
    />
    <h1 className="mt-6 text-display text-3xl">Pagamento</h1>
  </>
)

export const CheckoutScreen = ({ coupon }: { coupon?: string }) => {
  const { user, scope } = useSession()
  const cart = useCart()
  const quote = useQuote(cart.items, coupon)
  const wallets = useWallets()
  const connect = useConnectWallet()
  const createOrder = useCreateOrder(scope)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewSnapshot, setReviewSnapshot] = useState<QuoteResponse | null>(null)
  const [reviewCustomer, setReviewCustomer] = useState<CheckoutValues | null>(null)
  const [staleNotice, setStaleNotice] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [revalidating, setRevalidating] = useState(false)
  const submittingRef = useRef(false)

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onBlur',
    defaultValues: buildDefaults(null),
  })

  // Fill the profile once per signed-in collector (never on every refetch, so a
  // session revalidation cannot wipe what the user typed).
  const initialisedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!user || initialisedFor.current === user.id) return
    initialisedFor.current = user.id
    form.reset(buildDefaults(user))
  }, [user, form])

  const useCustomWallet = useWatch({ control: form.control, name: 'useCustomWallet' })
  const network = useWatch({ control: form.control, name: 'network' })
  const customAddress = useWatch({ control: form.control, name: 'walletAddress' })

  // A connection belongs to one network: changing it requires a new handshake.
  useEffect(() => {
    setConnection(null)
  }, [network])

  const defaultWallet = wallets.primary ?? wallets.wallets[0] ?? null

  useEffect(() => {
    if (!defaultWallet || selectedWalletId) return
    if (form.getValues('useCustomWallet')) return
    setSelectedWalletId(defaultWallet.id)
    form.setValue('walletAddress', defaultWallet.address, { shouldValidate: true })
    form.setValue('walletProvider', defaultWallet.provider)
    form.setValue('network', defaultWallet.network)
  }, [defaultWallet, selectedWalletId, form])

  // Reopen a purchase that was already sent before a refresh.
  useEffect(() => {
    if (!user || activeOrderId) return
    const stored = readActiveOrderId(scope)
    if (stored) setActiveOrderId(stored)
  }, [user, scope, activeOrderId])

  const selectWallet = (wallet: Wallet) => {
    setSelectedWalletId(wallet.id)
    setConnection(null)
    connect.reset()
    form.setValue('useCustomWallet', false)
    form.setValue('walletAddress', wallet.address, { shouldValidate: true })
    form.setValue('walletProvider', wallet.provider)
    form.setValue('network', wallet.network)
  }

  const handleUseCustomWallet = (custom: boolean) => {
    setConnection(null)
    connect.reset()
    form.setValue('useCustomWallet', custom)
    if (custom) {
      setSelectedWalletId(null)
      form.setValue('walletAddress', '', { shouldValidate: false })
      return
    }
    const wallet = wallets.primary ?? wallets.wallets[0] ?? null
    if (!wallet) return
    setSelectedWalletId(wallet.id)
    form.setValue('walletAddress', wallet.address, { shouldValidate: true })
    form.setValue('walletProvider', wallet.provider)
    form.setValue('network', wallet.network)
  }

  const handleConnect = () => {
    const values = form.getValues()
    connect.mutate(
      {
        walletId: values.useCustomWallet ? null : selectedWalletId,
        address: values.useCustomWallet ? values.walletAddress : undefined,
        provider: values.walletProvider,
        network: values.network,
      },
      { onSuccess: setConnection },
    )
  }

  const handleDisconnect = () => {
    setConnection(null)
    connect.reset()
  }

  const connectError = connect.isError
    ? isApiError(connect.error)
      ? connect.error.message
      : 'Não foi possível conectar a carteira.'
    : null

  const submitting = revalidating || createOrder.isPending
  const walletReady = connection?.status === 'connected'

  const blockedReason = cart.query.isPending
    ? 'Carregando o carrinho…'
    : cart.items.length === 0
      ? 'Seu carrinho está vazio.'
      : quote.isError
        ? 'O resumo de valores não está disponível.'
        : !quote.data
          ? 'Aguardando a cotação da API…'
          : quote.data.alerts.includes('availability-changed')
            ? 'Uma edição ficou indisponível: ajuste as quantidades no carrinho.'
            : !walletReady
              ? 'Conecte a carteira para revisar o pedido.'
              : null

  const handleReview = (values: CheckoutValues) => {
    if (!quote.data || blockedReason) return
    setSubmitError(null)
    setStaleNotice(null)
    setReviewSnapshot(quote.data)
    setReviewCustomer(values)
    setReviewOpen(true)
  }

  const handleConfirm = async () => {
    if (!reviewSnapshot || !reviewCustomer || !connection) return
    // Hard guard against double clicks/repeated Enter, in addition to the
    // disabled button: the second call would otherwise reuse the mutation.
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitError(null)

    try {
      setRevalidating(true)
      // Bypass the cache: the point is to know whether the API still agrees.
      const fresh = await queryClient.fetchQuery({
        ...quoteQueryOptions(scope, cart.items, coupon),
        staleTime: 0,
      })
      setRevalidating(false)
      // The summary behind the dialog must show the same numbers as the review,
      // so a revalidated quote replaces the cached entry it belongs to.
      queryClient.setQueryData(
        quoteQueryOptions(scope, cart.items, coupon).queryKey,
        fresh,
      )
      setReviewSnapshot(fresh)

      if (fresh.alerts.includes('availability-changed')) {
        setStaleNotice(
          'Uma das edições deixou de estar disponível na quantidade pedida. Ajuste o carrinho antes de enviar.',
        )
        return
      }

      if (!quotesMatch(reviewSnapshot, fresh)) {
        setStaleNotice(
          `Os valores mudaram: o total agora é ${formatEth(fresh.total)}. Confirme novamente para enviar com o novo valor.`,
        )
        return
      }

      const customer: OrderCustomer = {
        displayName: reviewCustomer.displayName,
        username: reviewCustomer.username,
        profileName: reviewCustomer.profileName,
        email: reviewCustomer.email,
        network: connection.network,
        walletAddress: connection.address,
        secondaryWallet: reviewCustomer.secondaryWallet?.trim() || null,
        walletProvider: connection.provider,
        referralCode: reviewCustomer.referralCode?.trim() || null,
        ensName: reviewCustomer.ensName?.trim()
          ? `${reviewCustomer.ensName.trim()}.eth`
          : null,
        note: reviewCustomer.note?.trim() || null,
      }

      // Persisted before the POST, so a reload mid-send reuses the same key.
      const idempotencyKey = ensureIdempotencyKey(
        scope,
        checkoutFingerprint(cart.items, coupon, fresh.total),
      )

      const order = await createOrder.mutateAsync({
        idempotencyKey,
        items: cart.items.map(({ nftId, quantity }) => ({ nftId, quantity })),
        coupon: coupon ?? null,
        expectedTotal: fresh.total,
        customer,
        wallet: {
          id: reviewCustomer.useCustomWallet ? null : selectedWalletId,
          address: connection.address,
          provider: connection.provider,
          network: connection.network,
        },
      })

      saveActiveOrderId(scope, order.id)
      setActiveOrderId(order.id)
      setReviewOpen(false)
      setStaleNotice(null)
    } catch (error) {
      setRevalidating(false)

      // The session expired while the user was filling the form: drop the stale
      // session from the cache (so /login does not bounce right back) and send
      // them to authenticate with this checkout as the return destination.
      if (isApiError(error) && error.isUnauthorized) {
        setSubmitError(error.message)
        queryClient.removeQueries({ queryKey: queryKeys.session() })
        await navigate({
          to: '/login',
          search: { redirect: coupon ? `/checkout?coupon=${coupon}` : '/checkout' },
        })
        return
      }

      if (isApiError(error) && error.hasFieldErrors) {
        for (const [field, message] of Object.entries(error.fields)) {
          const key = API_FIELD_ALIAS[field]
          if (key) form.setError(key, { message })
        }
        if (error.fields.cotacao) {
          setStaleNotice(error.fields.cotacao)
          void queryClient.invalidateQueries({ queryKey: ['quote'] })
        } else {
          setSubmitError(error.message)
        }
      } else {
        setSubmitError(
          isApiError(error)
            ? error.message
            : 'Não foi possível enviar o pedido. Nada foi cobrado.',
        )
      }
    } finally {
      submittingRef.current = false
    }
  }

  const handleNewOrder = () => {
    if (scope !== GUEST_SCOPE) clearActiveOrderId(scope)
    setActiveOrderId(null)
    setConnection(null)
    setReviewSnapshot(null)
    setReviewCustomer(null)
    setStaleNotice(null)
    setSubmitError(null)
    form.reset(buildDefaults(user))

    const wallet = wallets.primary ?? wallets.wallets[0] ?? null
    if (wallet) {
      setSelectedWalletId(wallet.id)
      form.setValue('walletAddress', wallet.address, { shouldValidate: true })
      form.setValue('walletProvider', wallet.provider)
      form.setValue('network', wallet.network)
    } else {
      setSelectedWalletId(null)
    }
  }

  if (activeOrderId) {
    return (
      <section className="shell py-10">
        <CheckoutHeader />
        <div className="mt-6">
          <OrderOutcome
            orderId={activeOrderId}
            scope={scope}
            onNewOrder={handleNewOrder}
          />
        </div>
      </section>
    )
  }

  if (cart.query.isPending) {
    return (
      <section className="shell py-10" aria-busy="true">
        <CheckoutHeader />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-52" />
            <div className="grid gap-4 sm:grid-cols-2">
              {['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
                <div key={key} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-md border bg-card p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </section>
    )
  }

  if (cart.query.isError) {
    return (
      <section className="shell py-10">
        <CheckoutHeader />
        <div role="alert" className="mt-8 flex flex-col items-start gap-4">
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar o carrinho</AlertTitle>
            <AlertDescription>
              {isApiError(cart.query.error)
                ? cart.query.error.message
                : 'Falha de conexão ao consultar seus itens.'}
            </AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={() => void cart.query.refetch()}>
            <RotateCwIcon aria-hidden />
            Tentar de novo
          </Button>
        </div>
      </section>
    )
  }

  if (cart.items.length === 0) {
    return (
      <section className="shell py-10" data-testid="checkout-vazio">
        <CheckoutHeader />
        <div className="mt-6 flex flex-col items-start gap-3 rounded-md border bg-card p-8">
          <h2 className="text-lg font-bold">Nada para pagar</h2>
          <p className="text-sm text-muted-foreground">
            Seu carrinho está vazio. Explore o catálogo e adicione peças para
            finalizar um pedido.
          </p>
          <Button asChild>
            <Link to="/">Explorar o catálogo</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="shell py-10">
      <CheckoutHeader />

      {submitError ? (
        <Alert
          variant="destructive"
          role="alert"
          data-testid="checkout-erro"
          className="mt-4"
        >
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Não foi possível continuar</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <form
        id="checkout-form"
        noValidate
        onSubmit={form.handleSubmit(handleReview)}
        className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]"
      >
        <CheckoutForm
          form={form}
          locked={submitting}
          onUseCustomWalletChange={handleUseCustomWallet}
        />

        <aside className="h-fit">
          <CheckoutSummary
            quote={quote}
            items={cart.items}
            count={cart.count}
            coupon={coupon}
            wallets={wallets.wallets}
            walletsPending={wallets.query.isPending}
            walletsError={wallets.query.isError}
            selectedWalletId={selectedWalletId}
            useCustomWallet={useCustomWallet}
            customAddress={customAddress}
            connection={connection}
            connecting={connect.isPending}
            connectError={connectError}
            onSelectWallet={selectWallet}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            submitting={submitting}
            blockedReason={blockedReason}
          />
        </aside>
      </form>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open)
          if (!open) setStaleNotice(null)
        }}
        quote={reviewSnapshot}
        items={cart.items}
        customer={reviewCustomer}
        connection={connection}
        walletLabel={
          reviewCustomer?.useCustomWallet
            ? 'Carteira informada'
            : (wallets.wallets.find((wallet) => wallet.id === selectedWalletId)?.label ??
              'Carteira registrada')
        }
        submitting={submitting}
        staleNotice={staleNotice}
        error={submitError}
        onConfirm={() => void handleConfirm()}
      />
    </section>
  )
}
