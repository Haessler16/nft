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
  onSubmit: (values: UpdateProfileInput) => void
  onCancel: () => void
}

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
    reset,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  })

  const [preview, setPreview] = useState<string | null>(profile.avatarUrl)

  const handleFileChange = useCallback((file: File | null) => {
    if (!file) {
      setPreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setPreview(result)
    }
    reader.readAsDataURL(file)
  }, [])

  const onSubmitHandler = useCallback(
    (values: UpdateProfileInput) => {
      onSubmit(values)
    },
    [onSubmit],
  )

  return (
    <form
      onSubmit={hookHandleSubmit(onSubmitHandler)}
      className="flex flex-col gap-6"
      noValidate
    >
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="displayName">Nome</FieldLabel>
          <FieldContent>
            <Input
              id="displayName"
              {...register('displayName')}
              placeholder={placeholderName}
              aria-describedby={errors.displayName ? 'displayName-desc' : undefined}
            />
            <FieldDescription id="displayName-desc">
              Como você gostaria de aparecer na KURIO.
            </FieldDescription>
            {errors.displayName && (
              <FieldError errors={[{ message: errors.displayName.message }]} />
            )}
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <FieldContent>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="voce@exemplo.com"
              aria-describedby={errors.email ? 'email-desc' : undefined}
            />
            <FieldDescription id="email-desc">
              usado para login e notificações.
            </FieldDescription>
            {errors.email && (
              <FieldError errors={[{ message: errors.email.message }]} />
            )}
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="bio">Biografia</FieldLabel>
          <FieldContent>
            <Textarea
              id="bio"
              rows={4}
              {...register('bio')}
              placeholder="Conte um pouco sobre sua coleção…"
              className="resize-y"
              aria-describedby={errors.bio ? 'bio-desc' : undefined}
            />
            <FieldDescription id="bio-desc">
              opcional, no máx. 500 caracteres.
            </FieldDescription>
            {errors.bio && (
              <FieldError errors={[{ message: errors.bio.message }]} />
            )}
          </FieldContent>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="avatar">Avatar</FieldLabel>
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="avatar"
            className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
              alt=""
              className="size-10 rounded-full object-cover ring-1 ring-border"
              data-testid="perfil-avatar-preview"
            />
          )}
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              reset({ ...profile, avatarUrl: null })
            }}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            remover
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
