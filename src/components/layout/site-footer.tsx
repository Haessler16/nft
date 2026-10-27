import { Link } from '@tanstack/react-router'

import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    copy: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    copy: 'Conheça artistas, estudios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    copy: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const

const COLLECTION_LINKS = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'] as const

const PROFILE_LINKS = ['Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse']
const HELP_LINKS = [
  'Central de ajuda',
  'Como comprar NFTs',
  'Carteira e segurança',
  'Política do mercado',
  'Denunciar item',
]

const linkClass = 'link-underline text-xs text-foreground/70 transition-colors hover:text-primary'

/** Non-interactive entries: out of scope, so they can't pretend to work. */
const DisabledLink = ({ label }: { label: string }) => (
  <span aria-disabled="true" title="Fora do escopo desta entrega" className="text-xs text-foreground/35">
    {label}
  </span>
)

const SOCIALS = [
  { label: 'Facebook', glyph: 'f' },
  { label: 'Instagram', glyph: 'ig' },
  { label: 'Twitter', glyph: 'x' },
  { label: 'LinkedIn', glyph: 'in' },
  { label: 'YouTube', glyph: 'yt' },
] as const

/**
 * Social links are decorative: lucide dropped brand marks and these profiles are
 * not part of the delivery, so they are labelled but not clickable.
 */
const SocialIcon = ({ glyph, label }: { glyph: string; label: string }) => (
  <span
    aria-label={`${label} (rede social simulada, sem link)`}
    role="img"
    className="grid size-6 place-items-center rounded-sm border border-border/70 text-[0.6rem] text-foreground/60"
  >
    {glyph}
  </span>
)

export const SiteFooter = () => {
  const [email, setEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')

  const submitNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNewsletterMessage(
      'A newsletter é editorial e não faz parte desta entrega: nenhum e-mail foi enviado.',
    )
  }

  return (
    <footer className="mt-24">
      <div className="shell">
        <div className="bg-[var(--surface-band)]">
          <div className="grid gap-8 p-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:p-8">
            {FEATURES.map((feature) => (
              <div key={feature.letter} className="flex flex-col gap-2 lg:border-r lg:border-border/50 lg:pr-6 lg:last:border-0">
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-full bg-primary/25 text-sm font-bold text-primary"
                >
                  {feature.letter}
                </span>
                <h2 className="text-[0.8125rem] font-bold">{feature.title}</h2>
                <p className="text-[0.7rem] leading-relaxed text-muted-foreground">{feature.copy}</p>
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <h2 className="text-[0.8125rem] leading-snug font-bold">
                Antecipe-se ao próximo lançamento
              </h2>
              <form onSubmit={submitNewsletter} className="flex items-stretch gap-2">
                <label htmlFor="newsletter-email" className="sr-only">
                  Seu e-mail para receber lançamentos
                </label>
                <Input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="digite seu e-mail..."
                  className="h-9 flex-1"
                />
                <Button type="submit" size="sm" className="px-3">
                  Enviar
                </Button>
              </form>
              {newsletterMessage ? (
                <p role="status" className="text-[0.65rem] text-muted-foreground">
                  {newsletterMessage}
                </p>
              ) : (
                <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
                  Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 border-y border-border/50 bg-[#191008] px-6 py-4 text-[0.7rem] text-muted-foreground sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
            <span className="text-sm font-bold tracking-[0.3em] text-foreground">KURIO</span>
            <span>Feito para colecionadores, criadores e cultura</span>
            <a href="mailto:contato@email.com" className="hover:text-primary">
              contato@email.com
            </a>
            <span>+55 11 4002 8922</span>
          </div>

          <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
            <div className="flex flex-col gap-2">
              <h2 className="mb-1 text-[0.8125rem] font-bold">Meu perfil</h2>
              <Link to="/account/profile" className={linkClass}>
                Meu perfil
              </Link>
              {PROFILE_LINKS.map((label) => (
                <DisabledLink key={label} label={label} />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="mb-1 text-[0.8125rem] font-bold">Central de ajuda</h2>
              {HELP_LINKS.map((label) => (
                <DisabledLink key={label} label={label} />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="mb-1 text-[0.8125rem] font-bold">Coleções</h2>
              {COLLECTION_LINKS.map((category) => (
                <Link
                  key={category}
                  to="/"
                  search={(previous) => ({ ...previous, categories: [category], page: 1 })}
                  className={linkClass}
                >
                  {category}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="mb-1 text-[0.8125rem] font-bold">Redes sociais</h2>
                <div className="flex gap-2">
                  {SOCIALS.map((social) => (
                    <SocialIcon key={social.label} glyph={social.glyph} label={social.label} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-[0.8125rem] font-bold">Carteiras compatíveis</h2>
                <p className="flex flex-wrap gap-2 text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase">
                  <span className="rounded-sm bg-primary/15 px-2 py-1">MetaMask</span>
                  <span className="rounded-sm bg-primary/15 px-2 py-1">WalletConnect</span>
                  <span className="rounded-sm bg-primary/15 px-2 py-1">Coinbase</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="py-6 text-center text-[0.65rem] text-muted-foreground">
          © 2026 Kurio. Propriedade digital para todos. Projeto de demonstração — nenhuma
          transação real é executada.
        </p>
      </div>
    </footer>
  )
}
