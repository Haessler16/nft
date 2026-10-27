import { ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface Banner {
  image: string
  alt: string
  title: string
  copy: string
  reverse?: boolean
}

const BANNERS: readonly Banner[] = [
  {
    image: '/nfts/emerald-ape.jpg',
    alt: 'Emerald Ape, peça de lançamento da coleção Kurio Editions',
    title: 'Lançamentos gênesis de edição limitada',
    copy: 'Colecione edições escassas diretamente dos criadores. Novas séries chegam toda semana.',
  },
  {
    image: '/nfts/neon-vessel.jpg',
    alt: 'Neon Vessel, obra de arte digital selecionada',
    title: 'Arte digital selecionada e muito mais',
    copy: 'Explore novos artistas, coleções verificadas e obras com curadoria da Kurio.',
    reverse: true,
  },
]

/**
 * Editorial banners between the catalog and the journal.
 *
 * Copy is static by design (editorial pages are out of scope) but the CTA is a
 * real anchor to the catalog instead of a fake button.
 */
export const EditorialBanners = () => (
  <section aria-label="Destaques editoriais" className="shell mt-20">
    <div className="grid gap-6 md:grid-cols-2">
      {BANNERS.map((banner) => (
        <article
          key={banner.title}
          className="group flex items-stretch gap-4 rounded-md bg-card p-4 ring-1 ring-transparent transition-[translate,box-shadow] duration-300 ease-soft hover:ring-border/70 motion-safe:hover:-translate-y-0.5"
        >
          <div
            className={`size-[130px] shrink-0 overflow-hidden rounded-sm ${banner.reverse ? 'order-last' : ''}`}
          >
            <img
              src={banner.image}
              alt={banner.alt}
              width={255}
              height={247}
              loading="lazy"
              className="size-full object-cover transition-transform duration-700 ease-soft group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          </div>
          <div className="flex flex-col justify-center gap-2">
            <h2 className="text-[0.8125rem] leading-snug font-bold uppercase">{banner.title}</h2>
            <p className="text-[0.7rem] leading-relaxed text-muted-foreground">{banner.copy}</p>
            <Button asChild variant="outline" size="xs" className="mt-1 self-start">
              <a href="#catalogo">
                Explorar
                <ArrowRightIcon
                  aria-hidden
                  className="transition-transform duration-200 ease-soft group-hover/button:translate-x-0.5"
                />
              </a>
            </Button>
          </div>
        </article>
      ))}
    </div>
  </section>
)
