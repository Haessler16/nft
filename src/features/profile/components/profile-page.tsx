import { useCallback } from 'react'

import { useSession } from '@/app/session/hooks'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { profileQueryOptions } from '@/features/profile/api/queries'
import { useUpdateProfile, useChangePassword } from '@/features/profile/api/mutations'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { useQuery } from '@tanstack/react-query'
import type { UpdateProfileInput } from '@/features/profile/api/contracts'
import type { ChangePasswordInputSchema } from '@/features/profile/schema'

/**
 * `/account/profile` (docs/PLAN.md → Seção 11).
 *
 * The screen reads the profile through the session scope and lets the two
 * mutations own their own pending/error state: the editor closes only after a
 * successful save, and a wrong current password becomes a field error on the
 * password form instead of a generic toast.
 */
export const ProfilePage = () => {
  const { user, scope } = useSession()
  const { data: profile, isLoading } = useQuery({
    ...profileQueryOptions(scope),
  })
  const updateMutation = useUpdateProfile(scope)
  const changePasswordMutation = useChangePassword(scope)

  const handleSave = useCallback(
    async (input: UpdateProfileInput) => {
      await updateMutation.mutateAsync(input)
    },
    [updateMutation],
  )

  const handleChangePassword = useCallback(
    (values: ChangePasswordInputSchema) => {
      changePasswordMutation.mutate({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
    },
    [changePasswordMutation],
  )

  const handleCancelSave = useCallback(() => {
    updateMutation.reset()
  }, [updateMutation])

  const handleCancelChangePassword = useCallback(() => {
    changePasswordMutation.reset()
  }, [changePasswordMutation])

  return (
    <section className="shell py-10">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Meu perfil' }]} />
      <h1 className="mt-6 text-display text-3xl">Meu perfil</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Estes dados identificam você no catálogo e acompanham o checkout. A senha
        só muda depois de confirmar a senha atual.
      </p>

      <div className="mt-8">
        <ProfileForm
          user={user}
          profile={{
            displayName: profile?.displayName ?? '',
            email: profile?.email ?? '',
            bio: profile?.bio ?? '',
            avatarUrl: profile?.avatarUrl ?? null,
          }}
          loading={isLoading}
          saving={updateMutation.isPending}
          changingPassword={changePasswordMutation.isPending}
          passwordError={changePasswordMutation.error}
          onSave={handleSave}
          onChangePassword={handleChangePassword}
          onCancelSave={handleCancelSave}
          onCancelChangePassword={handleCancelChangePassword}
          onClearPasswordError={changePasswordMutation.reset}
        />
      </div>
    </section>
  )
}
