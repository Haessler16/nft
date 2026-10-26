import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSession } from '@/app/session/hooks'
import { useUpdateProfile, useChangePassword } from '@/features/profile/api/mutations'
import type { UpdateProfileInput } from '@/features/profile/api/contracts'
import type { ChangePasswordInputSchema } from '@/features/profile/schema'
import type { SessionUser } from '@/features/auth/api/contracts'
import { ProfileEditor } from '@/features/profile/components/profile-editor'
import { PasswordForm } from '@/features/profile/components/password-form'

export type ProfileTab = 'dados' | 'senha'

interface ProfileFormProps {
  user: SessionUser | null
  profile: {
    displayName: string
    email: string
    bio: string
    avatarUrl: string | null
  }
  loading: boolean
  saving: boolean
  onSave(input: UpdateProfileInput): void
  onChangePassword(values: ChangePasswordInputSchema): void
  onCancelSave(): void
  onCancelChangePassword(): void
}

export const ProfileForm = ({
  user,
  profile,
  loading,
  saving,
  onSave,
  onChangePassword,
  onCancelSave,
  onCancelChangePassword,
}: ProfileFormProps) => {
  const { scope } = useSession()
  const updateMutation = useUpdateProfile(scope)
  const changePasswordMutation = useChangePassword(scope)

  const [activeTab, setActiveTab] = useState<ProfileTab>('dados')
  const [editing, setEditing] = useState(false)
  const originalRef = useRef(profile)

  useEffect(() => {
    originalRef.current = profile
  }, [profile])

  const original = originalRef.current
  const hasChanges =
    profile.displayName !== original.displayName ||
    profile.email !== original.email ||
    (profile.bio ?? '') !== (original.bio ?? '') ||
    (profile.avatarUrl ?? null) !== (original.avatarUrl ?? null)

  const handleSave = useCallback(
    (input: UpdateProfileInput) => {
      onSave(input)
    },
    [onSave],
  )

  const handleCancelSave = useCallback(() => {
    setEditing(false)
    onCancelSave()
  }, [onCancelSave])

  const handleChangePassword = useCallback(
    (values: ChangePasswordInputSchema) => {
      onChangePassword(values)
    },
    [onChangePassword],
  )

  const handleCancelChangePassword = useCallback(() => {
    setEditing(false)
    onCancelChangePassword()
  }, [onCancelChangePassword])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 rounded-md border border-input p-1 text-sm" role="tablist" aria-label="Seção do perfil">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'dados'}
          className={cn(
            'rounded-md px-3 py-1.5 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            activeTab === 'dados'
              ? 'bg-muted text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab('dados')}
        >
          Dados
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'senha'}
          className={cn(
            'rounded-md px-3 py-1.5 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            activeTab === 'senha'
              ? 'bg-muted text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab('senha')}
        >
          Senha
        </button>
      </div>

      {activeTab === 'dados' ? (
        editing ? (
          <ProfileEditor
            user={user}
            profile={profile}
            submitting={saving || updateMutation.isPending}
            onSubmit={handleSave}
            onCancel={handleCancelSave}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Nome</dt>
                <dd className="text-sm font-medium text-foreground">{profile.displayName}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">E-mail</dt>
                <dd className="text-sm font-medium text-foreground">{profile.email}</dd>
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Biografia</dt>
                <dd className="text-sm text-muted-foreground">
                  {profile.bio || 'Sem biografia.'}
                </dd>
              </div>
              {profile.avatarUrl && (
                <div className="sm:col-span-2 flex items-center gap-3 pt-2 border-t border-border">
                  <dt className="text-xs text-muted-foreground">Avatar</dt>
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
                  />
                </div>
              )}
            </dl>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <PasswordForm
            submitting={saving || changePasswordMutation.isPending}
            onSubmit={handleChangePassword}
            onCancel={handleCancelChangePassword}
          />
        </div>
      )}

      {activeTab === 'dados' && (
        <div className="flex flex-wrap gap-3 justify-end border-t border-border pt-4">
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending || saving}
                onClick={handleCancelSave}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!hasChanges || updateMutation.isPending || saving}
                onClick={() => {
                  updateMutation.mutate(
                    {
                      displayName: profile.displayName,
                      email: profile.email,
                      bio: profile.bio ?? undefined,
                      avatarUrl: profile.avatarUrl ?? null,
                    },
                    { onSuccess: () => setEditing(false) },
                  )
                }}
              >
                {updateMutation.isPending || saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setEditing(true)}
            >
              Editar perfil
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
