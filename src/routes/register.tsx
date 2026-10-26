import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { safeInternalPath } from '@/app/guards'
import { useSession } from '@/app/session/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EMAIL_PATTERN, isStrongPassword, PASSWORD_RULE } from '@/features/auth/api/contracts'
import { AuthFrame } from '@/features/auth/components/auth-frame'
import { SocialAuth } from '@/features/auth/components/social-auth'
import { isApiError } from '@/lib/api/errors'

/**
 * `/register` (docs/PLAN.md → Seção 4).
 *
 * The password rule and the e-mail pattern come from the contract, so the form
 * validates exactly what the mocked API will accept; the API is still the judge:
 * a taken e-mail answers 409 with `fields.email`, which lands on the input
 * instead of in a generic error box. Success starts the session and returns to
 * the same `redirect` the guard stored.
 */

const registerSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/register')({
  validateSearch: registerSearchSchema,
  head: () => ({
    meta: [{ title: 'Criar conta — KURIO' }],
  }),
  component: RegisterRoute,
})

const registerSchema = z
  .object({
    name: z.string().min(2, 'Informe seu nome.'),
    email: z
      .string()
      .min(1, 'Informe seu e-mail.')
      .regex(EMAIL_PATTERN, 'Informe um e-mail válido.'),
    password: z.string().refine(isStrongPassword, PASSWORD_RULE.message),
    confirm: z.string().min(1, 'Confirme sua senha.'),
  })
  .superRefine((values, ctx) => {
    if (values.confirm !== values.password) {
      ctx.addIssue({
        code: 'custom',
        message: 'As senhas não coincidem.',
        path: ['confirm'],
      })
    }
  })

type RegisterValues = z.infer<typeof registerSchema>

/** API field names → form fields (the API answers in Portuguese). */
const FIELD_ALIAS: Record<string, keyof RegisterValues> = {
  nome: 'name',
  email: 'email',
  senha: 'password',
}

function RegisterRoute() {
  const redirect = Route.useSearch().redirect
  const navigate = Route.useNavigate()
  const { signup, isAuthenticated } = useSession()
  const target = safeInternalPath(redirect)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (isAuthenticated) void navigate({ href: target, replace: true })
  }, [isAuthenticated, navigate, target])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  })

  const onSubmit = (values: RegisterValues) => {
    signup.mutate(
      { name: values.name, email: values.email, password: values.password },
      {
        onSuccess: () => void navigate({ href: target, replace: true }),
        onError: (error) => {
          if (!isApiError(error)) return
          for (const [field, message] of Object.entries(error.fields)) {
            const key = FIELD_ALIAS[field]
            if (key) setError(key, { message })
          }
        },
      },
    )
  }

  const fieldError = (id: string, message: string | undefined) =>
    message ? (
      <p id={id} role="alert" className="text-sm text-destructive">
        {message}
      </p>
    ) : null

  return (
    <AuthFrame
      active="register"
      title="Criar perfil de colecionador"
      description="Crie sua conta para colecionar, favoritar e comprar com a sua carteira."
      redirect={redirect}
      footer={
        <p className="text-xs">
          Usamos dados fictícios: nenhuma informação real é enviada ou armazenada.
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="register-nome" className="max-md:sr-only">
            Nome
          </Label>
          <Input
            id="register-nome"
            autoComplete="name"
            placeholder="Nome de usuário"
            className="max-md:h-12 max-md:rounded-lg max-md:bg-white/[0.02] max-md:px-4"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'register-nome-erro' : undefined}
            {...register('name')}
          />
          {fieldError('register-nome-erro', errors.name?.message)}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="register-email" className="max-md:sr-only">
            E-mail
          </Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            className="max-md:h-12 max-md:rounded-lg max-md:bg-white/[0.02] max-md:px-4"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'register-email-erro' : undefined}
            {...register('email')}
          />
          {fieldError('register-email-erro', errors.email?.message)}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="register-senha" className="max-md:sr-only">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="register-senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Senha"
              className="max-md:h-12 max-md:rounded-lg max-md:bg-white/[0.02] max-md:px-4 max-md:pr-12"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password
                  ? 'register-senha-erro register-senha-ajuda'
                  : 'register-senha-ajuda'
              }
              {...register('password')}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              {showPassword ? (
                <EyeOffIcon aria-hidden className="size-4" />
              ) : (
                <EyeIcon aria-hidden className="size-4" />
              )}
            </button>
          </div>
          <p id="register-senha-ajuda" className="text-xs text-muted-foreground max-md:hidden">
            {PASSWORD_RULE.message}
          </p>
          {fieldError('register-senha-erro', errors.password?.message)}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="register-confirmar" className="max-md:sr-only">
            Confirmar senha
          </Label>
          <div className="relative">
            <Input
              id="register-confirmar"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirmar senha"
              className="max-md:h-12 max-md:rounded-lg max-md:bg-white/[0.02] max-md:px-4 max-md:pr-12"
              aria-invalid={errors.confirm ? true : undefined}
              aria-describedby={errors.confirm ? 'register-confirmar-erro' : undefined}
              {...register('confirm')}
            />
            <button
              type="button"
              aria-label={showConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
              onClick={() => setShowConfirm((visible) => !visible)}
              className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              {showConfirm ? (
                <EyeOffIcon aria-hidden className="size-4" />
              ) : (
                <EyeIcon aria-hidden className="size-4" />
              )}
            </button>
          </div>
          {fieldError('register-confirmar-erro', errors.confirm?.message)}
        </div>

        <Button
          type="submit"
          aria-label="Criar conta"
          className="w-full max-md:h-12 max-md:rounded-lg max-md:text-sm"
          disabled={signup.isPending}
        >
          {signup.isPending ? 'Criando conta…' : 'Criar perfil'}
        </Button>

        <div className="md:hidden">
          <SocialAuth />
        </div>

        <p className="text-center text-xs text-muted-foreground md:hidden">
          Já tem uma conta?{' '}
          <Link
            to="/login"
            search={{ redirect }}
            className="font-bold text-primary underline-offset-4 hover:underline"
          >
            Entre
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}
