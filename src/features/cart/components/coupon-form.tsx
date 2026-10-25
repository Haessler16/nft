import { useState, type FormEvent } from 'react'
import { TagIcon, XIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useValidateCoupon } from '@/features/cart/api/mutations'
import { isApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

interface CouponFormProps {
  /** Coupon already committed to the URL (`?coupon=`), if any. */
  coupon: string | undefined
  onApply: (code: string) => void
  onRemove: () => void
}

/**
 * Apply/remove a coupon (docs/PLAN.md → Seção 7).
 *
 * The code is confirmed with `POST /api/coupons/validate` *before* it reaches
 * the URL: an invalid or expired answer renders on the field while the summary
 * priced without it stays untouched. Only a confirmed code is written to the
 * search, which is what re-keys the quote query.
 *
 * The input stays uncontrolled on success (it is cleared and the applied code
 * is shown as a chip), so the router never fights the keyboard.
 */
export const CouponForm = ({ coupon, onApply, onRemove }: CouponFormProps) => {
  const [value, setValue] = useState('')
  const validate = useValidateCoupon()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = value.trim()
    if (!code || validate.isPending) return
    validate.mutate(
      code,
      {
        onSuccess: (result) => {
          setValue('')
          onApply(result.code)
        },
      },
    )
  }

  const error = validate.isError
    ? isApiError(validate.error)
      ? (validate.error.fields.coupon ?? validate.error.message)
      : 'Não foi possível validar o cupom.'
    : null

  return (
    <section
      aria-labelledby="cupom-titulo"
      data-testid="carrinho-cupom"
      className="rounded-md border bg-card p-4"
    >
      <h2 id="cupom-titulo" className="text-sm font-bold">
        Cupom
      </h2>

      {coupon ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Badge variant="secondary" data-testid="carrinho-cupom-aplicado">
            <TagIcon aria-hidden className="size-3" />
            {coupon}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="carrinho-cupom-remover"
            onClick={onRemove}
          >
            <XIcon aria-hidden />
            Remover
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <label htmlFor="cupom" className="sr-only">
            Código do cupom
          </label>
          <Input
            id="cupom"
            data-testid="carrinho-cupom-input"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              // A fresh keystroke clears the previous rejection so the form
              // never shows an error about a code the user already rewrote.
              if (validate.isError) validate.reset()
            }}
            placeholder="KURIO10"
            autoCapitalize="characters"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'cupom-erro' : undefined}
            className="h-9 uppercase"
          />
          <Button
            type="submit"
            size="sm"
            disabled={validate.isPending || !value.trim()}
            data-testid="carrinho-cupom-aplicar"
          >
            {validate.isPending ? 'Verificando…' : 'Aplicar'}
          </Button>
        </form>
      )}

      <p
        id="cupom-erro"
        data-testid="carrinho-cupom-erro"
        role="alert"
        className={cn('mt-2 text-xs text-destructive', !error && 'hidden')}
      >
        {error ?? ''}
      </p>
    </section>
  )
}
