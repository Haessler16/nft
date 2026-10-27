import { ArrowRightIcon } from 'lucide-react'

/**
 * Hero from the "Início" frame: eyebrow, display headline, supporting copy,
 * primary CTA that jumps to the catalog and carousel dots. On mobile it folds
 * into the compact editorial card from the app frame, with the artwork on the
 * right and the secondary image peeking below it.
 */
export const HomeHero = () => (
  <section
    aria-labelledby="hero-titulo"
    className="mx-auto w-full max-w-[1180px] px-4 pt-4 sm:px-6 md:mt-10 md:pt-0 lg:mt-14 lg:px-8"
  >
    <div className="relative overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_80%_20%,rgba(214,116,56,0.24),transparent_55%),linear-gradient(135deg,#2a1a11_0%,#25160f_55%,#1d110c_100%)] p-5 md:grid md:items-center md:gap-10 md:overflow-visible md:rounded-none md:bg-none md:p-0 lg:grid-cols-[minmax(0,1fr)_460px]">
      <div className="relative z-10 flex max-w-[13rem] flex-col gap-3 md:max-w-xl md:gap-5">
        <p
          className="eyebrow animate-enter-fade-up text-[0.6rem] tracking-[0.18em] md:text-xs"
          style={{ animationDelay: '60ms' }}
        >
          Bem-vindo à Kurio
        </p>
        <h1
          id="hero-titulo"
          className="text-display animate-enter-fade-up max-w-[560px] text-[1.7rem] leading-[1.02] text-foreground md:text-[2.4rem] lg:text-[2.75rem]"
          style={{ animationDelay: '130ms' }}
        >
          Seja dono do futuro da arte digital
        </h1>
        <p
          className="animate-enter-fade-up max-w-[27rem] text-[0.68rem] leading-snug text-muted-foreground md:text-[0.8125rem] md:leading-relaxed"
          style={{ animationDelay: '200ms' }}
        >
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
          digital rara, apoie artistas e tenha uma parte da cultura da internet.
        </p>
        <div className="animate-enter-fade-up" style={{ animationDelay: '270ms' }}>
          <a
            href="#catalogo"
            className="group/cta inline-flex items-center gap-2 text-[0.68rem] font-bold tracking-[0.12em] text-primary uppercase transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none md:mt-1 md:rounded-sm md:bg-primary md:px-6 md:py-3 md:text-sm md:text-primary-foreground md:hover:bg-[color-mix(in_oklab,var(--primary),white_8%)]"
          >
            Explorar
            <ArrowRightIcon
              aria-hidden
              className="size-3.5 transition-transform duration-200 ease-soft group-hover/cta:translate-x-0.5 md:size-4"
            />
          </a>
        </div>
      </div>

      <div className="animate-enter-fade-in pointer-events-none absolute top-1/2 right-2 h-[11.5rem] w-[8.8rem] -translate-y-1/2 md:pointer-events-auto md:relative md:top-auto md:right-auto md:h-auto md:w-full md:translate-y-0">
        <img
          src="/nfts/hero-kurio.jpg"
          alt="Retrato 3D de um macaco usando óculos escuros e jaqueta verde da coleção Kurio Editions"
          width={470}
          height={470}
          fetchPriority="high"
          decoding="async"
          style={{ animationDelay: '220ms' }}
          className="animate-enter-scale h-full w-full rounded-[2.2rem] object-cover shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:aspect-[470/440] md:rounded-xl md:shadow-none"
        />
        <img
          src="/nfts/emerald-ape.jpg"
          alt=""
          width={96}
          height={96}
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute -bottom-3 -left-8 size-20 rounded-[1.25rem] border-[3px] border-[#23150f] object-cover md:hidden"
        />
      </div>
    </div>

    <div className="mt-5 flex animate-enter-fade-in justify-center gap-1.5 md:mt-8" aria-hidden style={{ animationDelay: '340ms' }}>
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className={
            dot === 0
              ? 'size-1.5 rounded-full bg-primary'
              : 'size-1.5 rounded-full bg-foreground/25'
          }
        />
      ))}
    </div>
  </section>
)
