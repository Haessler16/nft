import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ChangePasswordInputSchema } from '@/features/profile/schema'
import { changePasswordSchema } from '@/features/profile/schema'

interface PasswordFormProps {
  submitting: boolean
  onSubmit: (values: ChangePasswordInputSchema) => void
  onCancel: () => void
  /** Field messages answered by the API (e.g. `currentPassword` wrong). */
  fieldErrors?: Record<string, string>
  /** Clears the API error as soon as the collector edits a field. */
  onClearError?: () => void
  currentPasswordPlaceholder?: string
  newPasswordPlaceholder?: string
}

/**
 * Password change with reauthentication (docs/PLAN.md → Seção 11).
 *
 * The API answers `422` with the offending field, so a wrong current password
 * is shown under that input (`aria-invalid` + `aria-describedby`) instead of a
 * generic toast. The form clears itself only after a successful change; on a
 * failure the typed values stay so the collector can correct them.
 */
export const PasswordForm = ({
  submitting,
  onSubmit,
  onCancel,
  fieldErrors,
  onClearError,
  currentPasswordPlaceholder = '••••••••',
  newPasswordPlaceholder = 'Nova senha',
}: PasswordFormProps) => {
  const {
    register,
    handleSubmit: hookHandleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInputSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  })

  const currentError = fieldErrors?.currentPassword
  const newPasswordError = fieldErrors?.newPassword
  const wasSubmitting = useRef(false)

  useEffect(() => {
    if (submitting) {
      wasSubmitting.current = true
      return
    }
    if (!wasSubmitting.current) return
    wasSubmitting.current = false
    if (!currentError && !newPasswordError) reset()
  }, [submitting, currentError, newPasswordError, reset])

  const handleSubmit = hookHandleSubmit((values) => {
    onSubmit(values)
  })

  const describedBy = (field: 'current' | 'new', invalid: boolean) =>
    invalid ? `${field}-desc ${field}-error` : `${field}-desc`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field data-invalid={currentError ? true : undefined}>
        <FieldLabel htmlFor="currentPassword">Senha atual</FieldLabel>
        <FieldContent>
          <Input
            id="currentPassword"
            type="password"
            {...register('currentPassword', { onChange: onClearError })}
            placeholder={currentPasswordPlaceholder}
            className={cn(currentError ? 'border-destructive ring-2 ring-destructive/20' : '')}
            aria-invalid={currentError ? true : undefined}
            aria-describedby={describedBy('current', Boolean(currentError))}
          />
          <FieldDescription id="current-desc">para confirmar que é você.</FieldDescription>
          {currentError && (
            <FieldError id="current-error" errors={[{ message: currentError }]} />
          )}
        </FieldContent>
      </Field>

      <Field data-invalid={errors.newPassword || newPasswordError ? true : undefined}>
        <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
        <FieldContent>
          <Input
            id="newPassword"
            type="password"
            {...register('newPassword', { onChange: onClearError })}
            placeholder={newPasswordPlaceholder}
            aria-invalid={errors.newPassword || newPasswordError ? true : undefined}
            aria-describedby={describedBy(
              'new',
              Boolean(errors.newPassword || newPasswordError),
            )}
          />
          <FieldDescription id="new-desc">
            ao menos 8 caracteres, com letras e números.
          </FieldDescription>
          {errors.newPassword && (
            <FieldError id="new-error" errors={[{ message: errors.newPassword.message }]} />
          )}
          {!errors.newPassword && newPasswordError && (
            <FieldError id="new-error" errors={[{ message: newPasswordError }]} />
          )}
        </FieldContent>
      </Field>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Alterando…' : 'Alterar senha'}
        </Button>
      </div>
    </form>
  )
}
