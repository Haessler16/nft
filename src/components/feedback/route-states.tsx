import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

/**
 * Feedback screens (404 and route errors) rendered inside the app shell so the
 * header and navigation stay available.
 */
export const NotFoundState = () => (
  <section className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
    <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
    <h1 className="text-3xl font-semibold tracking-tight">Página não encontrada</h1>
    <p className="text-muted-foreground">
      O endereço acessado não existe ou o recurso foi removido. Volte ao catálogo
      para continuar explorando.
    </p>
    <Button asChild>
      <Link to="/">Ir para o catálogo</Link>
    </Button>
  </section>
)

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

export const RouteErrorState = ({
  error,
  reset,
}: {
  error: unknown
  reset?: () => void
}) => (
  <section
    role="alert"
    className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 py-24 sm:px-6"
  >
    <p className="text-sm font-medium text-destructive">Algo deu errado</p>
    <h1 className="text-3xl font-semibold tracking-tight">Não foi possível carregar</h1>
    <p className="text-muted-foreground">
      {messageOf(error) || 'Ocorreu um erro inesperado ao renderizar esta página.'}
    </p>
    <div className="flex gap-2">
      {reset ? (
        <Button onClick={reset} type="button">
          Tentar novamente
        </Button>
      ) : null}
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  </section>
)
