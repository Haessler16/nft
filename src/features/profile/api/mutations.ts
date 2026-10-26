import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { changePassword, updateProfile } from '@/features/profile/api/endpoints'
import { isApiError } from '@/lib/api/errors'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/**
 * Atualiza o perfil do usuário autenticado.
 *
 * Invalida o perfil e a sessão: o nome/e-mail/avatar também aparecem no
 * cabeçalho, que lê `['session']`, então as duas entradas precisam concordar
 * logo depois do "Salvar". Erros de campo (e-mail já cadastrado) voltam como
 * `ApiError.fields`; o editor mantém os valores digitados e o toast mostra a
 * mensagem do envelope.
 */
export const useUpdateProfile = (scope: UserScope) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof updateProfile>[0]) => updateProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.byUser(scope) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.session() })
      toast.success('Dados atualizados.')
    },
    onError: (error) => {
      if (isApiError(error) && error.hasFieldErrors) {
        toast.error(Object.values(error.fields)[0] ?? error.message)
        return
      }
      toast.error(
        isApiError(error) ? error.message : 'Não foi possível atualizar os dados.',
      )
    },
  })
}

/**
 * Troca a senha com reautenticação (docs/PLAN.md → Seção 11).
 *
 * O handler responde `422` com o campo culpado (`currentPassword` ou
 * `newPassword`); o formulário lê esse `ApiError.fields` e mostra o erro sob o
 * input. Só falhas sem campo viram toast.
 */
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
      toast.success('Senha atualizada.')
    },
    onError: (error: unknown) => {
      if (isApiError(error) && error.hasFieldErrors) return
      toast.error(
        isApiError(error) ? error.message : 'Não foi possível atualizar a senha.',
      )
    },
  })
}
