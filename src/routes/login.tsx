import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useSession } from '@/app/session/hooks'
import { safeInternalPath } from '@/app/guards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EMAIL_PATTERN } from '@/features/auth/api/contracts'
import { AuthFrame } from '@/features/auth/components/auth-frame'
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
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
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
          <Label htmlFor="login-senha">Senha</Label>
          <Input
            id="login-senha"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'login-senha-erro' : undefined}
            {...register('password')}
          />
          {errors.password ? (
            <p id="login-senha-erro" role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthFrame>
  )
}
