import { Button } from '@/components/ui/button'

/**
 * Hero from the "Início" frame: eyebrow, display headline, supporting copy,
 * primary CTA that jumps to the catalog and carousel dots. The artwork was
 * extracted from the design file (see ARCHITECTURE.md → Assets).
 */
export const HomeHero = () => (
  <section aria-labelledby="hero-titulo" className="shell mt-10 lg:mt-14">
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
      <div className="flex max-w-xl flex-col gap-5">
        <p className="eyebrow">Bem-vindo à Kurio</p>
        <h1
          id="hero-titulo"
          className="text-display max-w-[560px] text-[2.2rem] text-foreground sm:text-[2.4rem] lg:text-[2.75rem]"
        >
          Seja dono do futuro da arte digital
        </h1>
        <p className="max-w-[27rem] text-[0.8125rem] leading-relaxed text-muted-foreground">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
          digital rara, apoie artistas e tenha uma parte da cultura da internet.
        </p>
        <div>
          <Button asChild size="lg" className="px-6">
            <a href="#catalogo" className="uppercase tracking-[0.08em]">
              Explorar
            </a>
          </Button>
        </div>
      </div>

      <div className="relative">
        <img
          src="/nfts/hero-kurio.jpg"
          alt="Retrato 3D de um macaco usando óculos escuros e jaqueta verde da coleção Kurio Editions"
          width={470}
          height={470}
          fetchPriority="high"
          decoding="async"
          className="aspect-[470/440] w-full rounded-xl object-cover"
        />
      </div>
    </div>

    <div className="mt-8 flex justify-center gap-1.5" aria-hidden>
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className={dot === 0 ? 'size-1.5 rounded-full bg-primary' : 'size-1.5 rounded-full bg-foreground/25'}
        />
      ))}
    </div>
  </section>
)
