import { useCallback, useState } from 'react'

import { useSession } from '@/app/session/hooks'
import { useWallets, useCreateWallet, useUpdateWallet } from '@/features/wallets/api/mutations'
import { WalletFormItem } from '@/features/wallets/components/wallet-form-item'
import { WalletForm, type WalletFormValues } from '@/features/wallets/components/wallet-form-item'
import { WalletCommand } from '@/features/wallets/components/wallet-command'
import type { Wallet } from '@/features/wallets/api/contracts'
import type { NftNetwork } from '@/features/nfts/api/contracts'

export const WalletsPage = () => {
  const { scope } = useSession()
  const { data: wallets, isLoading } = useWallets(scope)
  const createMutation = useCreateWallet(scope)
  const updateMutation = useUpdateWallet(scope)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Wallet | null>(null)

  const handleCreate = useCallback(
    (values: WalletFormValues) => {
      createMutation.mutate({
        label: values.label,
        address: values.address,
        provider: values.provider,                network: values.network as NftNetwork,
        primary: values.primary,
      })
      setCreating(false)
    },
    [createMutation],
  )

  const handleCancelCreate = useCallback(() => {
    setCreating(false)
  }, [])

  const handleEdit = useCallback((wallet: Wallet) => {
    setEditing(wallet)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditing(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3 justify-end">
        {creating ? (
          <>
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
              onCancel={handleCancelCreate}
              disabled={createMutation.isPending}
            />
            <button
              type="button"
              onClick={handleCancelCreate}
              className="rounded-md border border-input bg-transparent px-4 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md border border-input bg-transparent px-4 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Nova carteira
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <WalletForm
            defaultValues={editing}
            onSubmit={(values) => {
              updateMutation.mutate({
                walletId: editing.id,
                label: values.label,
                address: values.address,
                provider: values.provider,
                network: values.network as NftNetwork,
                primary: values.primary,
              })
              setEditing(null)
            }}
            onCancel={handleCancelEdit}
            disabled={updateMutation.isPending || createMutation.isPending}
          />
          <button
            type="button"
            onClick={handleCancelEdit}
            className="rounded-md border border-input bg-transparent px-4 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {wallets?.wallets.map((wallet: Wallet) => (
            <WalletFormItem key={wallet.id} wallet={wallet} onEdit={() => handleEdit(wallet)} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-end">
        <WalletCommand
          wallets={wallets?.wallets ?? []}
          onSelect={(wallet: Wallet) => {
            setEditing(wallet)
          }}
        />
      </div>
    </div>
  )
}
