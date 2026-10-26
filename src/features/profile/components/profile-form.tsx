import { useCallback, useState } from 'react'

import { cn } from '@/lib/utils'
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
  void user
  void loading
  void onSave
  void onChangePassword
  void onCancelSave
  void onCancelChangePassword

  const { scope } = useSession()
  const updateMutation = useUpdateProfile(scope)
  const changePasswordMutation = useChangePassword(scope)

  const [activeTab, setActiveTab] = useState<ProfileTab>('dados')
  const [editing, setEditing] = useState(false)

  const handleSave = useCallback(
    (input: UpdateProfileInput) => {
      updateMutation.mutate(input)
    },
    [updateMutation],
  )

  const handleCancelSave = useCallback(() => {
    setEditing(false)
  }, [])

  const handleChangePassword = useCallback(
    (values: ChangePasswordInputSchema) => {
      changePasswordMutation.mutate({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
    },
    [changePasswordMutation],
  )

  const handleCancelChangePassword = useCallback(() => {
  }, [])

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
          <dl className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Nome</dt>
              <dd className="text-sm font-medium">{profile.displayName}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="text-sm font-medium">{profile.email}</dd>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Biografia</dt>
              <dd className="text-sm text-muted-foreground">
                {profile.bio || 'Sem biografia.'}
              </dd>
            </div>
            {profile.avatarUrl && (
              <div className="sm:col-span-2 flex items-center gap-3">
                <dt className="text-xs text-muted-foreground">Avatar</dt>
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                />
              </div>
            )}
          </dl>
        )
      ) : (
        <PasswordForm
          submitting={saving || changePasswordMutation.isPending}
          onSubmit={handleChangePassword}
          onCancel={handleCancelChangePassword}
        />
      )}

      {activeTab === 'dados' && (
        <div className="flex flex-wrap gap-3 justify-end border-t border-border pt-4">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleCancelSave}
                className="rounded-md border border-input bg-transparent px-4 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!hasChanges || saving}
                onClick={() => setEditing(true)}
                className="rounded-md border border-input bg-transparent px-4 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 disabled:pointer-events-none"
              >
                Editar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-input bg-transparent px-4 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Editar perfil
            </button>
          )}
        </div>
      )}
    </div>
  )
}
