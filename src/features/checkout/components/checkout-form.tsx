import type { ReactNode } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CheckoutValues } from '@/features/checkout/schema'
import { NFT_NETWORKS } from '@/features/nfts/api/contracts'
import { WALLET_PROVIDER_LABELS, WALLET_PROVIDERS } from '@/features/wallets/api/contracts'
import { cn } from '@/lib/utils'

interface CheckoutFormProps {
  form: UseFormReturn<CheckoutValues>
  /** True while the order is being created — the form is then read-only. */
  locked: boolean
  onUseCustomWalletChange: (custom: boolean) => void
}

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: (aria: {
    invalid: true | undefined
    describedBy: string | undefined
  }) => ReactNode
}

/**
 * Form field wrapper: label, optional hint and error, and the ARIA wiring
 * (`aria-describedby` pointing at both hint and error) so screen readers
 * announce the message together with the input it belongs to.
 */
const Field = ({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: FieldProps) => {
  const hintId = hint ? `${id}-ajuda` : null
  const errorId = error ? `${id}-erro` : null
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden className="text-primary">
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        )}
      </Label>
      {children({ invalid: error ? true : undefined, describedBy })}
      {hint ? (
        <p id={hintId ?? undefined} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId ?? undefined} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const selectClass =
  'h-9 w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive'

/**
 * "Perfil do colecionador" (docs/PLAN.md → Seção 8).
 *
 * Follows the Pagamento frame: two columns on desktop, one on mobile, with the
 * wallet fields mirroring the selected registered wallet until "Usar outra
 * carteira?" is checked — at which point the address and provider become
 * editable and the connection must be made again.
 */
export const CheckoutForm = ({
  form,
  locked,
  onUseCustomWalletChange,
}: CheckoutFormProps) => {
  const {
    register,
    control,
    formState: { errors },
  } = form

  const useCustomWallet = useWatch({ control, name: 'useCustomWallet' })

  return (
    <section aria-labelledby="perfil-titulo" className="flex flex-col gap-5">
      <div>
        <h2 id="perfil-titulo" className="text-display text-lg">
          Perfil do colecionador
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Os dados ficam no snapshot do pedido e aparecem no recibo.
        </p>
      </div>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field
          id="checkout-nome-exibicao"
          label="Nome de exibição"
          required
          error={errors.displayName?.message}
        >
          {(aria) => (
            <Input
              id="checkout-nome-exibicao"
              autoComplete="name"
              disabled={locked}
              {...aria}
              {...register('displayName')}
            />
          )}
        </Field>

        <Field
          id="checkout-usuario"
          label="Nome de usuário"
          required
          error={errors.username?.message}
        >
          {(aria) => (
            <Input
              id="checkout-usuario"
              autoComplete="username"
              disabled={locked}
              {...aria}
              {...register('username')}
            />
          )}
        </Field>

        <Field id="checkout-rede" label="Rede" required error={errors.network?.message}>
          {(aria) => (
            <select
              id="checkout-rede"
              className={selectClass}
              disabled={locked}
              {...aria}
              {...register('network')}
            >
              {NFT_NETWORKS.map((network) => (
                <option key={network} value={network}>
                  {network}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          id="checkout-perfil"
          label="Nome do perfil"
          required
          error={errors.profileName?.message}
        >
          {(aria) => (
            <Input
              id="checkout-perfil"
              disabled={locked}
              {...aria}
              {...register('profileName')}
            />
          )}
        </Field>

        <Field
          id="checkout-endereco"
          label="Endereço da carteira"
          required
          hint={
            useCustomWallet
              ? 'Endereço da carteira que será conectada.'
              : 'Preenchido pela carteira registrada selecionada.'
          }
          error={errors.walletAddress?.message}
        >
          {(aria) => (
            <Input
              id="checkout-endereco"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              readOnly={!useCustomWallet}
              disabled={locked}
              className={cn(!useCustomWallet && 'bg-muted/40 text-muted-foreground')}
              {...aria}
              {...register('walletAddress')}
            />
          )}
        </Field>

        <Field
          id="checkout-carteira-secundaria"
          label="ENS ou carteira secundária"
          error={errors.secondaryWallet?.message}
        >
          {(aria) => (
            <Input
              id="checkout-carteira-secundaria"
              autoComplete="off"
              placeholder="nome.eth ou 0x…"
              disabled={locked}
              {...aria}
              {...register('secondaryWallet')}
            />
          )}
        </Field>

        <Field
          id="checkout-tipo-carteira"
          label="Tipo de carteira"
          required
          error={errors.walletProvider?.message}
        >
          {(aria) => (
            <select
              id="checkout-tipo-carteira"
              className={selectClass}
              disabled={locked || !useCustomWallet}
              {...aria}
              {...register('walletProvider')}
            >
              {WALLET_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {WALLET_PROVIDER_LABELS[provider]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          id="checkout-indicacao"
          label="Código de indicação"
          error={errors.referralCode?.message}
        >
          {(aria) => (
            <Input
              id="checkout-indicacao"
              autoComplete="off"
              placeholder="KURIO-2026"
              disabled={locked}
              {...aria}
              {...register('referralCode')}
            />
          )}
        </Field>

        <Field
          id="checkout-email"
          label="E-mail"
          required
          error={errors.email?.message}
        >
          {(aria) => (
            <Input
              id="checkout-email"
              type="email"
              autoComplete="email"
              disabled={locked}
              {...aria}
              {...register('email')}
            />
          )}
        </Field>

        <Field id="checkout-ens" label="Nome ENS" error={errors.ensName?.message}>
          {(aria) => (
            <div className="flex">
              <Input
                id="checkout-ens"
                autoComplete="off"
                placeholder="colecionador"
                disabled={locked}
                className="rounded-r-none"
                {...aria}
                {...register('ensName')}
              />
              <span
                aria-hidden
                className="flex h-9 items-center rounded-r-sm border border-l-0 border-input px-2.5 text-sm text-muted-foreground"
              >
                .eth
              </span>
            </div>
          )}
        </Field>

        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id="checkout-outra-carteira"
            checked={useCustomWallet}
            disabled={locked}
            onCheckedChange={(checked) => onUseCustomWalletChange(checked === true)}
          />
          <Label htmlFor="checkout-outra-carteira" className="font-normal">
            Usar outra carteira
          </Label>
        </div>

        <Field
          id="checkout-observacao"
          label="Observação do colecionador"
          error={errors.note?.message}
          className="sm:col-span-2"
        >
          {(aria) => (
            <Textarea
              id="checkout-observacao"
              rows={4}
              placeholder="Instruções para este pedido (opcional)"
              disabled={locked}
              {...aria}
              {...register('note')}
            />
          )}
        </Field>
      </div>
    </section>
  )
}
