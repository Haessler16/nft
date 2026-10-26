import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  changePassword,
  type ChangePasswordError,
  PASSWORD_FIELD_ERRORS,
  isApiError,
} from '@/features/profile/api/endpoints'
import { updateProfile } from '@/features/profile/api/endpoints'
import { queryKeys, type UserScope } from '@/lib/query/keys'

export const useUpdateProfile = (scope: UserScope) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof updateProfile>[0]) =>
      updateProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.byUser(scope) })
      toast.success('Datos actualizados.')
    },
    onError: (error) => {
      if (isApiError(error)) {
        toast.error(error.message)
      } else {
        toast.error('No se pudieron actualizar los datos.')
      }
    },
  })
}

export const useChangePassword = (scope: UserScope) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.byUser(scope) })
      toast.success('Contraseña actualizada.')
    },
    onError: (error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as ChangePasswordError).error === 'string'
      ) {
        const typed = error as ChangePasswordError
        toast.error(
          typed.error === 'CURRENT_WRONG'
            ? PASSWORD_FIELD_ERRORS.current
            : PASSWORD_FIELD_ERRORS.new,
        )
      } else if (isApiError(error)) {
        toast.error(error.message)
      } else {
        toast.error('No se pudo actualizar la contraseña.')
      }
    },
  })
}

export const profileQueryKeys = {
  edit: (scope: UserScope) => [...queryKeys.profile.byUser(scope), 'edit'] as const,
  password: (scope: UserScope) => [...queryKeys.profile.byUser(scope), 'password'] as const,
}
