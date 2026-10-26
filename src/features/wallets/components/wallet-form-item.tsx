import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { NftNetwork } from '@/features/nfts/api/contracts'
import {
  WALLET_PROVIDER_LABELS,
  WALLET_PROVIDERS,
  PROVIDER_NETWORKS,
  supportsNetwork,
  type WalletProvider,
  type Wallet,
} from '@/features/wallets/api/contracts'
import { useSession } from '@/app/session/hooks'
import { useDeleteWallet } from '@/features/wallets/api/mutations'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { z } from 'zod'

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

const walletSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, 'O nome precisa ter ao menos 2 caracteres.')
    .max(60, 'Máximo de 60 caracteres.'),
  address: z
    .string()
    .trim()
    .min(1, 'Informe o endereço da carteira.')
    .regex(ADDRESS_PATTERN, 'Use um endereço 0x com 40 caracteres hexadecimais.'),
  provider: z.enum(WALLET_PROVIDERS, {
    message: 'Escolha o tipo de carteira.',
  }),
  network: z.string().min(1, 'Escolha uma rede.'),
  primary: z.boolean(),
}).refine(
  (data) => {
    if (!data.provider || !data.network) return true
    return supportsNetwork(data.provider, data.network as NftNetwork)
  },
  {
    message:
      'Este provedor não dá suporte à rede escolhida. Escolha outra combinação.',
    path: ['network'],
  },
)

export type WalletFormValues = z.infer<typeof walletSchema>

export interface WalletFormItemProps {
  wallet: Wallet
  onEdit(): void
}

/** Display card for one registered wallet (Seção 11). */
export function WalletFormItem({ wallet, onEdit }: WalletFormItemProps) {
  const { scope } = useSession()
  const deleteMutation = useDeleteWallet(scope)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const handleDelete = () => setDeleteConfirmOpen(true)
  const confirmDelete = () => {
    deleteMutation.mutate(
      { walletId: wallet.id },
      { onSuccess: () => setDeleteConfirmOpen(false) },
    )
  }

  return (
    <>
      <div
        className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        data-testid={`carteira-${wallet.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-offset-background ring-1 ring-ring/50',
                wallet.primary
                  ? 'bg-primary/10 text-primary ring-primary/20'
                  : 'bg-secondary/10 text-secondary-foreground ring-secondary/20',
              )}>
                {wallet.primary ? 'Principal' : 'Secundária'}
              </span>
              <span className="text-xs text-muted-foreground">
                {wallet.primary ? 'Carteira por padrão' : 'Carteira secundária'}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              {wallet.label}
            </p>
            <p className="mt-0.5 text-xs font-mono text-muted-foreground">
              {wallet.address}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-border bg-muted/30 p-2">
                <dt className="text-muted-foreground">Provedor</dt>
                <dd className="font-medium text-foreground">
                  {WALLET_PROVIDER_LABELS[wallet.provider]}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-2">
                <dt className="text-muted-foreground">Rede</dt>
                <dd className="font-medium text-foreground">{wallet.network}</dd>
              </div>
            </dl>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              Editar
            </Button>
            {!wallet.primary && (
              <Button size="sm" variant="destructive" onClick={handleDelete}>
                Remover
              </Button>
            )}
          </div>
        </div>
        {wallet.primary && (
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            Esta carteira é a principal para este colecionador.
          </p>
        )}
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Remover carteira</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. A carteira{' '}
            <span className="font-medium">{wallet.label}</span> será removida
            permanentemente.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export interface WalletFormProps {
  defaultValues: Wallet
  onSubmit(values: WalletFormValues): void
  onCancel(): void
  disabled?: boolean
}

/** Edição de carteira (Seção 11). O formulário aceita novo registro quando
 * `defaultValues.id` está vazio — o mesmo componente serve para criar e editar. */
export function WalletForm({
  defaultValues,
  onSubmit,
  onCancel,
  disabled = false,
}: WalletFormProps) {
  const { control, handleSubmit, formState } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      label: defaultValues.label || 'Nova carteira',
      address: defaultValues.address || '',
      provider: defaultValues.provider ?? ('metamask' as WalletProvider),
      network: defaultValues.network ?? ('Ethereum' as NftNetwork),
      primary: defaultValues.primary ?? false,
    },
  })

  const provider = useWatch({ control, name: 'provider' })

  const providerNetworks = (PROVIDER_NETWORKS[provider as WalletProvider] ?? []) as readonly NftNetwork[]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Controller name="label" control={control} render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="wallet-label">Nome da carteira</FieldLabel>
          <FieldContent>              <Input
                id="wallet-label"
                {...field}
                placeholder="Ex: Carteira pessoal"
                disabled={disabled}
                aria-invalid={formState.errors.label ? true : undefined}
                aria-describedby={
                  formState.errors.label
                    ? 'wallet-label-desc wallet-label-error'
                    : 'wallet-label-desc'
                }
              />
              <FieldDescription id="wallet-label-desc">
                Nome curto para identificar esta carteira.
              </FieldDescription>
              {formState.errors.label && (
                <FieldError
                  id="wallet-label-error"
                  errors={[{ message: formState.errors.label.message }]}
                />
              )}
          </FieldContent>
        </Field>
      )} />

      <Controller name="address" control={control} render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="wallet-address">Endereço</FieldLabel>
          <FieldContent>
            <div className="relative">
              <Input
                id="wallet-address"
                {...field}
                placeholder="0x..."
                className="font-mono text-sm"
                disabled={disabled}
                aria-invalid={formState.errors.address ? true : undefined}
                aria-describedby={
                  formState.errors.address
                    ? 'wallet-address-desc wallet-address-error'
                    : 'wallet-address-desc'
                }
              />
              {field.value && (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => field.onChange('')}
                  aria-label="Limpar endereço"
                >
                  <X className="size-4" />
                  <span className="sr-only">Limpar</span>
                </button>
              )}
            </div>
            <FieldDescription id="wallet-address-desc">
              Endereço do wallet (0x + 40 caracteres hex).
            </FieldDescription>
            {formState.errors.address && (
              <FieldError
                id="wallet-address-error"
                errors={[{ message: formState.errors.address.message }]}
              />
            )}
          </FieldContent>
        </Field>
      )} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller name="provider" control={control} render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="wallet-provider">Tipo de carteira</FieldLabel>
            <FieldContent>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id="wallet-provider"
                  className="w-full"
                  aria-label="Tipo de carteira"
                  aria-invalid={formState.errors.provider ? true : undefined}
                  aria-describedby={
                    formState.errors.provider ? 'wallet-provider-error' : undefined
                  }
                >
                  <SelectValue placeholder="Escolha o tipo de carteira" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WALLET_PROVIDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value as WalletProvider}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState.errors.provider && (
                <FieldError
                  id="wallet-provider-error"
                  errors={[{ message: formState.errors.provider.message }]}
                />
              )}
            </FieldContent>
          </Field>
        )} />

        <Controller name="network" control={control} render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="wallet-network">Rede</FieldLabel>
            <FieldContent>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id="wallet-network"
                  className="w-full"
                  aria-label="Rede"
                  aria-invalid={formState.errors.network ? true : undefined}
                  aria-describedby={
                    formState.errors.network ? 'wallet-network-error' : undefined
                  }
                >
                  <SelectValue placeholder="Escolha uma rede" />
                </SelectTrigger>
                <SelectContent>
                  {providerNetworks.map((network) => (
                    <SelectItem key={network} value={network as string}>
                      {network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState.errors.network && (
                <FieldError
                  id="wallet-network-error"
                  errors={[{ message: formState.errors.network.message }]}
                />
              )}
            </FieldContent>
          </Field>
        )} />
      </div>

      <Controller name="primary" control={control} render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="wallet-primary">Principal</FieldLabel>
          <FieldContent>
            <Label
              htmlFor="wallet-primary"
              className={cn(
                'cursor-pointer flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                field.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-input text-muted-foreground',
              )}
            >
              <input
                id="wallet-primary"
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="sr-only"
                disabled={disabled}
              />
              <Check
                className={cn(
                  'size-4',
                  field.value ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              Marcar como carteira principal
            </Label>
          </FieldContent>
        </Field>
      )} />

      <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {disabled ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
