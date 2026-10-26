import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { ImageIcon } from 'lucide-react'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { UpdateProfileInput } from '@/features/profile/api/contracts'
import type { SessionUser } from '@/features/auth/api/contracts'
import { profileSchema } from '@/features/profile/schema'

interface ProfileEditorProps {
  user: SessionUser | null
  profile: {
    displayName: string
    email: string
    bio: string
    avatarUrl: string | null
  }
  submitting: boolean
  onSubmit: (values: UpdateProfileInput) => Promise<void> | void
  onCancel: () => void
}

/**
 * Editable profile form (docs/PLAN.md → Seção 11).
 *
 * The avatar is a simulated upload: the selected file is read as a data URL,
 * stored in the form field (`avatarUrl`) and previewed immediately. Keeping it
 * in react-hook-form (instead of local state alone) is what makes "Salvar"
 * persist the new image and "remover" persist the removal.
 */
export const ProfileEditor = ({
  user,
  profile,
  submitting,
  onSubmit,
  onCancel,
}: ProfileEditorProps) => {
  const placeholderName = user?.name ?? 'Seu nome'

  const {
    register,
    handleSubmit: hookHandleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  })

  const [preview, setPreview] = useState<string | null>(profile.avatarUrl)

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (!file) {
        setPreview(null)
        setValue('avatarUrl', null, { shouldDirty: true })
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setPreview(result)
        setValue('avatarUrl', result, { shouldDirty: true })
      }
      reader.readAsDataURL(file)
    },
    [setValue],
  )

  const handleRemoveAvatar = useCallback(() => {
    setPreview(null)
    setValue('avatarUrl', null, { shouldDirty: true })
  }, [setValue])

  const onSubmitHandler = useCallback(
    (values: UpdateProfileInput) => {
      void onSubmit(values)
    },
    [onSubmit],
  )

  return (
    <form
      onSubmit={hookHandleSubmit(onSubmitHandler)}
      className="flex flex-col gap-6 rounded-xl border border-border bg-card p-4 shadow-sm"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4">
        <Field data-invalid={errors.displayName ? true : undefined}>
          <FieldLabel htmlFor="displayName">Nome</FieldLabel>
          <FieldContent>
            <Input
              id="displayName"
              {...register('displayName')}
              placeholder={placeholderName}
              aria-invalid={errors.displayName ? true : undefined}
              aria-describedby={
                errors.displayName ? 'displayName-desc displayName-error' : 'displayName-desc'
              }
            />
            <FieldDescription id="displayName-desc">
              Como você gostaria de aparecer na KURIO.
            </FieldDescription>
            {errors.displayName && (
              <FieldError
                id="displayName-error"
                errors={[{ message: errors.displayName.message }]}
              />
            )}
          </FieldContent>
        </Field>

        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <FieldContent>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="voce@exemplo.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'email-desc email-error' : 'email-desc'}
            />
            <FieldDescription id="email-desc">
              usado para login e notificações.
            </FieldDescription>
            {errors.email && (
              <FieldError id="email-error" errors={[{ message: errors.email.message }]} />
            )}
          </FieldContent>
        </Field>

        <Field data-invalid={errors.bio ? true : undefined}>
          <FieldLabel htmlFor="bio">Biografia</FieldLabel>
          <FieldContent>
            <Textarea
              id="bio"
              rows={4}
              {...register('bio')}
              placeholder="Conte um pouco sobre sua coleção…"
              className="resize-y"
              aria-invalid={errors.bio ? true : undefined}
              aria-describedby={errors.bio ? 'bio-desc bio-error' : 'bio-desc'}
            />
            <FieldDescription id="bio-desc">
              opcional, no máx. 500 caracteres.
            </FieldDescription>
            {errors.bio && (
              <FieldError id="bio-error" errors={[{ message: errors.bio.message }]} />
            )}
          </FieldContent>
        </Field>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-2">
        <FieldLabel htmlFor="avatar">Avatar</FieldLabel>
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="avatar"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ImageIcon className="size-4" aria-hidden />
            Escolher imagem
            <input
              id="avatar"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                handleFileChange(file)
              }}
            />
          </label>
          {preview && (
            <img
              src={preview}
              alt="Prévia do novo avatar"
              className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
              data-testid="perfil-avatar-preview"
            />
          )}
          {preview && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              remover
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
