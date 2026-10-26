import { useCallback, useState } from 'react'

import { useSession } from '@/app/session/hooks'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useWallets } from '@/features/wallets/hooks'
import {
  useCreateWallet,
  useUpdateWallet,
} from '@/features/wallets/api/mutations'
import { WalletFormItem, WalletForm, type WalletFormValues } from '@/features/wallets/components/wallet-form-item'
import { WalletCommand } from '@/features/wallets/components/wallet-command'
import type { Wallet } from '@/features/wallets/api/contracts'
import type { NftNetwork } from '@/features/nfts/api/contracts'

/**
 * `/account/wallets` (docs/PLAN.md → Seção 11).
 *
 * Wallets are read through the same scoped query the checkout uses, so the
 * account screen and the payment screen can never disagree. Creating and
 * editing share one form component; it owns its submit/cancel buttons and only
 * leaves the screen after the mutation succeeds.
 */
export const WalletsPage = () => {
  const { scope } = useSession()
  const { query, wallets } = useWallets()
  const createMutation = useCreateWallet(scope)
  const updateMutation = useUpdateWallet(scope)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Wallet | null>(null)

  const handleCreate = useCallback(
    (values: WalletFormValues) => {
      createMutation.mutate(
        {
          label: values.label,
          address: values.address,
          provider: values.provider,
          network: values.network as NftNetwork,
          primary: values.primary,
        },
        { onSuccess: () => setCreating(false) },
      )
    },
    [createMutation],
  )

  const handleUpdate = useCallback(
    (values: WalletFormValues) => {
      if (!editing) return
      updateMutation.mutate(
        {
          walletId: editing.id,
          label: values.label,
          address: values.address,
          provider: values.provider,
          network: values.network as NftNetwork,
          primary: values.primary,
        },
        { onSuccess: () => setEditing(null) },
      )
    },
    [editing, updateMutation],
  )

  return (
    <section className="shell py-10">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Carteiras' }]} />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display text-3xl">Carteiras</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            A carteira principal é oferecida primeiro no checkout. Só é possível
            remover uma carteira secundária.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md border border-input bg-transparent px-4 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Nova carteira
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-8 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-bold">Nova carteira</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O endereço é simulado, mas precisa ter o formato 0x + 40 hexadecimais.
          </p>
          <div className="mt-4">
            <WalletForm
              defaultValues={{
                id: '',
                label: '',
                address: '',
                provider: 'metamask',
                network: 'Ethereum',
                supportedNetworks: [],
                primary: false,
              }}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
              disabled={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {query.isPending ? (
        <div className="mt-8 flex flex-col gap-3" aria-busy="true">
          <span className="sr-only">Carregando carteiras…</span>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      ) : query.isError ? (
        <div className="mt-8 rounded-md border border-destructive/40 bg-card p-6" role="alert">
          <h2 className="text-lg font-bold">Não foi possível carregar suas carteiras</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente de novo em instantes.
          </p>
          <button
            type="button"
            className="mt-4 rounded-md border border-input px-4 py-2 text-sm hover:bg-muted/50"
            onClick={() => void query.refetch()}
          >
            Tentar de novo
          </button>
        </div>
      ) : editing ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-bold">Editar carteira</h2>
          <div className="mt-4">
            <WalletForm
              defaultValues={editing}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {wallets.length === 0 ? (
            <p className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
              Nenhuma carteira cadastrada. Cadastre uma para concluir o checkout.
            </p>
          ) : (
            wallets.map((wallet) => (
              <WalletFormItem key={wallet.id} wallet={wallet} onEdit={() => setEditing(wallet)} />
            ))
          )}
        </div>
      )}

      {!creating && !editing && wallets.length > 0 && (
        <div className="mt-6 hidden md:block">
          <WalletCommand wallets={wallets} onSelect={setEditing} />
        </div>
      )}
    </section>
  )
}
