import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RoutePlaceholderProps {
  /** Screen name, matching the brief. */
  title: string
  /** Route path, shown so the wireframe is navigable/testable. */
  path: string
  /** Plan section that implements this screen. */
  section: string
  /** Required behaviours taken from the brief, rendered as a checklist. */
  requirements: readonly string[]
}

/**
 * Temporary scaffold rendered by routes whose feature is not implemented yet.
 *
 * It exists so every mandatory URL resolves, has a real heading and lists its
 * acceptance criteria. Each placeholder is replaced by the feature in its plan
 * section — no placeholder may survive the delivery.
 */
export const RoutePlaceholder = ({
  title,
  path,
  section,
  requirements,
}: RoutePlaceholderProps) => (
  <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-3 border-b pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Estrutura inicial</Badge>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {path}
        </code>
        <span className="text-xs text-muted-foreground">{section}</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-muted-foreground">
        A rota já existe e é navegável; a implementação desta tela está descrita no
        plano abaixo.
      </p>
    </div>

    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Comportamentos obrigatórios</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {requirements.map((requirement) => (
            <li key={requirement} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>{requirement}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  </section>
)
