import { useCallback, useState } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api/errors'
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
  changingPassword: boolean
  passwordError: unknown
  onSave(input: UpdateProfileInput): Promise<void>
  onChangePassword(values: ChangePasswordInputSchema): void
  onCancelSave(): void
  onCancelChangePassword(): void
  onClearPasswordError(): void
}

/**
 * Profile screen body (docs/PLAN.md → Seção 11).
 *
 * Two tabs, one editor at a time. The reading view and the editor are separate
 * so the editor's react-hook-form state is always seeded from the confirmed
 * profile; the editor owns its submit button and only leaves editing mode when
 * the mutation resolves, so a validation error keeps the typed values on screen.
 */
export const ProfileForm = ({
  user,
  profile,
  loading,
  saving,
  changingPassword,
  passwordError,
  onSave,
  onChangePassword,
  onCancelSave,
  onCancelChangePassword,
  onClearPasswordError,
}: ProfileFormProps) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('dados')
  const [editing, setEditing] = useState(false)

  const handleSave = useCallback(
    async (input: UpdateProfileInput) => {
      try {
        await onSave(input)
        setEditing(false)
      } catch {
        // The mutation already reports the failure (toast/field); keeping the
        // editor open preserves what the collector typed.
      }
    },
    [onSave],
  )

  const handleCancelSave = useCallback(() => {
    setEditing(false)
    onCancelSave()
  }, [onCancelSave])

  const handleCancelChangePassword = useCallback(() => {
    onCancelChangePassword()
  }, [onCancelChangePassword])

  const passwordFieldErrors =
    isApiError(passwordError) && passwordError.hasFieldErrors
      ? passwordError.fields
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex w-full items-center gap-1 overflow-x-auto rounded-md border border-input p-1 text-sm sm:w-fit"
        role="tablist"
        aria-label="Seção do perfil"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'dados'}
          aria-controls="painel-dados"
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-none',
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
          aria-controls="painel-senha"
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-none',
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
        <div id="painel-dados" role="tabpanel" aria-label="Dados do perfil">
          {editing ? (
            <ProfileEditor
              user={user}
              profile={profile}
              submitting={saving}
              onSubmit={handleSave}
              onCancel={handleCancelSave}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">Nome</dt>
                  <dd className="text-sm font-medium text-foreground" data-testid="perfil-nome">
                    {profile.displayName}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">E-mail</dt>
                  <dd className="text-sm font-medium text-foreground" data-testid="perfil-email">
                    {profile.email}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Biografia</dt>
                  <dd
                    className="text-sm text-muted-foreground"
                    data-testid="perfil-bio"
                  >
                    {profile.bio || 'Sem biografia.'}
                  </dd>
                </div>
                {profile.avatarUrl && (
                  <div className="flex items-center gap-3 border-t border-border pt-2 sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Avatar</dt>
                    <img
                      src={profile.avatarUrl}
                      alt={`Avatar de ${profile.displayName}`}
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
                    />
                  </div>
                )}
              </dl>
            </div>
          )}

          {!editing && (
            <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setEditing(true)}
              >
                Editar perfil
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          id="painel-senha"
          role="tabpanel"
          aria-label="Alterar senha"
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <PasswordForm
            submitting={changingPassword}
            fieldErrors={passwordFieldErrors}
            onSubmit={onChangePassword}
            onCancel={handleCancelChangePassword}
            onClearError={onClearPasswordError}
          />
        </div>
      )}
    </div>
  )
}
