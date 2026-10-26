import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { useSession } from '@/app/session/hooks'
import { safeInternalPath } from '@/app/guards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EMAIL_PATTERN } from '@/features/auth/api/contracts'
import { AuthFrame } from '@/features/auth/components/auth-frame'
import { SocialAuth } from '@/features/auth/components/social-auth'
import { DEMO_ACCOUNTS } from '@/features/auth/demo'
import { isApiError } from '@/lib/api/errors'

/**
 * `/login` (docs/PLAN.md → Seção 4).
 *
 * The guard (`src/app/guards.ts`) sends an expired session here with the
 * destination in `redirect`; on success the form returns to exactly that path,
 * so a checkout interrupted by expiry resumes where it stopped.
 */

const loginSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  head: () => ({
    meta: [{ title: 'Entrar — KURIO' }],
  }),
  component: LoginRoute,
})

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .regex(EMAIL_PATTERN, 'Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

type LoginValues = z.infer<typeof loginSchema>

/** API field names → form fields, so the envelope maps onto the inputs. */
const FIELD_ALIAS: Record<string, keyof LoginValues> = {
  email: 'email',
  senha: 'password',
}

function LoginRoute() {
  const redirect = Route.useSearch().redirect
  const navigate = Route.useNavigate()
  const { login, isAuthenticated } = useSession()
  const target = safeInternalPath(redirect)
  const [showPassword, setShowPassword] = useState(false)

  // Already signed in (session restored by refresh, or a second tab): leave the
  // login screen instead of showing a form the user cannot use.
  useEffect(() => {
    if (isAuthenticated) void navigate({ href: target, replace: true })
  }, [isAuthenticated, navigate, target])

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (values: LoginValues) => {
    login.mutate(values, {
      onSuccess: () => void navigate({ href: target, replace: true }),
      onError: (error) => {
        if (!isApiError(error)) return
        for (const [field, message] of Object.entries(error.fields)) {
          const key = FIELD_ALIAS[field]
          if (key) setError(key, { message })
        }
      },
    })
  }

  const fillDemoAccount = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setValue('email', account.email, { shouldValidate: true })
    setValue('password', account.password, { shouldValidate: true })
  }

  return (
    <AuthFrame
      active="login"
      title="Entrar"
      description="Entre para gerenciar sua carteira, coleção e perfil de criador."
      redirect={redirect}
      footer={
        <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-left text-xs">
          <p className="font-bold text-foreground">Credenciais de demonstração</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="flex flex-wrap items-center justify-between gap-2">
                <code className="text-muted-foreground">
                  {account.email} · {account.password}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => fillDemoAccount(account)}
                >
                  Usar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-email" className="max-md:sr-only">
            E-mail
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            className="max-md:h-12 max-md:rounded-lg max-md:bg-white/[0.02] max-md:px-4"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'login-email-erro' : undefined}
            {...register('email')}
          />
          {errors.email ? (
            <p id="login-email-erro" role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="login-senha" className="max-md:sr-only">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="login-senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Sua senha"
              className="max-md:h-12 max-md:rounded-lg max-md:bg-white/[0.02] max-md:px-4 max-md:pr-12"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'login-senha-erro' : undefined}
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
          {errors.password ? (
            <p id="login-senha-erro" role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          ) : null}
          <div className="flex justify-end md:hidden">
            <button
              type="button"
              onClick={() =>
                toast.info('Recuperação de senha não faz parte desta demonstração.')
              }
              className="text-[0.7rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full max-md:h-12 max-md:rounded-lg max-md:text-sm"
          disabled={login.isPending}
        >
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>

        <div className="md:hidden">
          <SocialAuth />
        </div>

        <p className="text-center text-xs text-muted-foreground md:hidden">
          Novo na Kurio?{' '}
          <Link
            to="/register"
            search={{ redirect }}
            className="font-bold text-primary underline-offset-4 hover:underline"
          >
            Crie uma conta
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}
