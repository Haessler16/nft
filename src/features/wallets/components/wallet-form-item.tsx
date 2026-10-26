import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import {
  WALLET_PROVIDER_LABELS,
  PROVIDER_NETWORKS,
  type WalletProvider,
  type Wallet,
} from '@/features/wallets/api/contracts'
import { useSession } from '@/app/session/hooks'
import {
  useUpdateWallet,
  useDeleteWallet,
} from '@/features/wallets/api/mutations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  provider: z.nativeEnum(WALLET_PROVIDER_LABELS, {
    message: 'Escolha o tipo de carteira.',
  }),
  network: z.string().min(1, 'Escolha uma rede.'),
  primary: z.boolean(),
}).refine(
  (data) => {
    if (!data.provider || !data.network) return true
    return supportsNetwork(data.provider, data.network)
  },
  {
    message:
      'Este provedor não dá suporte à rede escolhida. Escolha outra combinação.',
    path: ['network'],
  },
)

type WalletFormValues = z.infer<typeof walletSchema>

export interface WalletFormItemProps {
  wallet: Wallet
  onEdit(): void
}

/** Display card for one registered wallet (Seção 11). */
export function WalletFormItem({ wallet, onEdit }: WalletFormItemProps) {
  const updateMutation = useUpdateWallet()
  const deleteMutation = useDeleteWallet()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const handleDelete = () => setDeleteConfirmOpen(true)
  const confirmDelete = () => {
    deleteMutation.mutate({ walletId: wallet.id })
    setDeleteConfirmOpen(false)
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-offset-background ring-1 ring-ring/50">
                {wallet.primary ? 'Principal' : 'Secundária'}
              </span>
              {wallet.primary ? (
                <span className="text-xs text-muted-foreground">Carteira por padrão</span>
              ) : (
                <span className="text-xs text-muted-foreground">Carteira secundária</span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {wallet.label} — {wallet.address}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border-border bg-muted/50 p-2">
                <dt className="text-muted-foreground">Provedor</dt>
                <dd className="font-medium">{wallet.provider}</dd>
              </div>
              <div className="rounded-md border-border bg-muted/50 p-2">
                <dt className="text-muted-foreground">Rede</dt>
                <dd className="font-medium">{wallet.network}</dd>
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
          <p className="mt-3 text-xs text-muted-foreground">
            Esta carteira é a principal para este colecionador.
          </p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Editar carteira</DialogTitle>
          </DialogHeader>
          <WalletForm
            defaultValues={wallet}
            onSubmit={(values) => {
              updateMutation.mutate({ walletId: wallet.id, label: values.label, address: values.address, provider: values.provider, network: values.network, primary: values.primary })
              setDialogOpen(false)
            }}
            onCancel={() => setDialogOpen(false)}
            disabled={updateMutation.isPending}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  disabled = false,
}: WalletFormProps) {
  const { control, handleSubmit, formState } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      label: defaultValues.label || 'Nova carteira',
      address: defaultValues.address || '',
      provider: defaultValues.provider || 'metamask',
      network: defaultValues.network || 'Ethereum',
      primary: defaultValues.primary ?? false,
    },
  })

  const provider = useWatch({ control, name: 'provider' })

  const providerNetworks = PROVIDER_NETWORKS[provider as WalletProvider] ?? []

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Controller name="label" control={control} render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="wallet-label">Nome da carteira</FieldLabel>
          <FieldContent>
            <Input
              id="wallet-label"
              {...field}
              placeholder="Ex: Carteira pessoal"
              disabled={disabled}
              aria-describedby={formState.errors.label ? 'wallet-label-desc' : undefined}
            />
            <FieldDescription id="wallet-label-desc">
              Nome curto para identificar esta carteira.
            </FieldDescription>
            {formState.errors.label && (
              <FieldError errors={[{ message: formState.errors.label.message }]} />
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
                aria-describedby={formState.errors.address ? 'wallet-address-desc' : undefined}
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
              <FieldError errors={[{ message: formState.errors.address.message }]} />
            )}
          </FieldContent>
        </Field>
      )} />

      <div className="grid grid-cols-2 gap-4">
        <Controller name="provider" control={control} render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="wallet-provider">Tipo de carteira</FieldLabel>
            <FieldContent>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha o tipo de carteira" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WALLET_PROVIDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState.errors.provider && (
                <FieldError errors={[{ message: formState.errors.provider.message }]} />
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha uma rede" />
                </SelectTrigger>
                <SelectContent>
                  {providerNetworks.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState.errors.network && (
                <FieldError errors={[{ message: formState.errors.network.message }]} />
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
    </form>
  )
}
