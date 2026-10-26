import { z } from 'zod'
import { EMAIL_PATTERN } from '@/features/auth/api/contracts'
import { PASSWORD_RULE } from '@/features/profile/api/contracts'

export const profileSchema = z
  .object({
    displayName: z
      .string()
      .min(2, 'Informe um nome de ao menos 2 caracteres.')
      .max(60, 'O nome pode ter no máx. 60 caracteres.'),
    email: z
      .string()
      .min(1, 'Informe um e-mail.')
      .regex(EMAIL_PATTERN, 'Informe um e-mail válido.'),
    bio: z
      .string()
      .max(500, 'A biografia pode ter no máx. 500 caracteres.')
      .optional(),
    avatarUrl: z
      .union([z.string().nullish()])
      .optional()
      .nullable(),
  })
  .partial()

export type UpdateProfileInputSchema = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(PASSWORD_RULE.minLength, PASSWORD_RULE.message)
      .regex(/[a-zA-Z]/, PASSWORD_RULE.message)
      .regex(/\d/, PASSWORD_RULE.message),
  })
  .strict()

export type ChangePasswordInputSchema = z.infer<typeof changePasswordSchema>
