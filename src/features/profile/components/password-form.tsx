import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ChangePasswordInputSchema } from '@/features/profile/schema'
import { PASSWORD_FIELD_ERRORS } from '@/features/profile/api/contracts'
import { z } from 'zod'

interface PasswordFormProps {
  submitting: boolean
  onSubmit: (values: ChangePasswordInputSchema) => void
  onCancel: () => void
  currentPasswordPlaceholder?: string
  newPasswordPlaceholder?: string
}

export const PasswordForm = ({
  submitting,
  onSubmit,
  onCancel,
  currentPasswordPlaceholder = '••••••••',
  newPasswordPlaceholder = 'Nova senha',
}: PasswordFormProps) => {
  const {
    register,
    handleSubmit: hookHandleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInputSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  })

  const [wrong, setWrong] = useState(false)

  const handleSubmit = hookHandleSubmit((values) => {
    setWrong(false)
    onSubmit(values)
  })

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field>
        <FieldLabel htmlFor="currentPassword">Senha atual</FieldLabel>
        <FieldContent>
          <Input
            id="currentPassword"
            type="password"
            {...register('currentPassword')}
            placeholder={currentPasswordPlaceholder}
            className={cn(
              wrong ? 'border-destructive ring-2 ring-destructive/20' : '',
            )}
            aria-invalid={wrong ? 'true' : undefined}
            aria-describedby={wrong ? 'current-desc' : undefined}
          />
          <FieldDescription id="current-desc">
            para confirmar que é você.
          </FieldDescription>
          {wrong && (
            <FieldError errors={[{ message: PASSWORD_FIELD_ERRORS.current }]} />
          )}
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
        <FieldContent>
          <Input
            id="newPassword"
            type="password"
            {...register('newPassword')}
            placeholder={newPasswordPlaceholder}
            aria-describedby={
              errors.newPassword ? 'new-desc' : 'new-help'
            }
          />
          <FieldDescription id="new-help">
            ao menos 8 caracteres, com letras e números.
          </FieldDescription>
          {errors.newPassword && (
            <FieldError
              errors={[{ message: errors.newPassword.message }]}
            />
          )}
        </FieldContent>
      </Field>

      <div className="flex flex-wrap gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Alterando…' : 'Alterar senha'}
        </Button>
      </div>
    </form>
  )
}

function cn(...values: (string | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(8, 'A nova senha precisa ter ao menos 8 caracteres, com letras e números.')
      .regex(/[a-zA-Z]/, 'A nova senha precisa ter ao menos 8 caracteres, com letras e números.')
      .regex(/\d/, 'A nova senha precisa ter ao menos 8 caracteres, com letras e números.'),
  })
  .strict()
