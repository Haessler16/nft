import { useCallback } from 'react'

import { useSession } from '@/app/session/hooks'
import { profileQueryOptions } from '@/features/profile/api/queries'
import { useUpdateProfile, useChangePassword } from '@/features/profile/api/mutations'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { useQuery } from '@tanstack/react-query'
import type { UpdateProfileInput } from '@/features/profile/api/contracts'
import type { ChangePasswordInputSchema } from '@/features/profile/schema'

export const ProfilePage = () => {
  const { user, scope } = useSession()
  const { data: profile, isLoading } = useQuery({
    ...profileQueryOptions(scope),
  })
  const updateMutation = useUpdateProfile(scope)
  const changePasswordMutation = useChangePassword(scope)

  const handleSave = useCallback(
    (input: UpdateProfileInput) => {
      updateMutation.mutate(input)
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
    <ProfileForm
      user={user}
      profile={{
        displayName: profile?.displayName ?? '',
        email: profile?.email ?? '',
        bio: profile?.bio ?? '',
        avatarUrl: profile?.avatarUrl ?? null,
      }}
      loading={isLoading}
      saving={updateMutation.isPending || changePasswordMutation.isPending}
      onSave={handleSave}
      onChangePassword={handleChangePassword}
      onCancelSave={handleCancelSave}
      onCancelChangePassword={handleCancelChangePassword}
    />
  )
}
