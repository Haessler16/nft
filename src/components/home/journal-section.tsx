interface Post {
  image: string
  date: string
  readingTime: string
  title: string
  excerpt: string
}

const POSTS: readonly Post[] = [
  {
    image: '/nfts/ivory-baron.jpg',
    date: '12 de novembro',
    readingTime: 'Leitura de 5 min',
    title: 'Como funciona a curadoria de NFTs',
    excerpt: 'Aprenda a selecionar, negociar e verificar ativos digitais.',
  },
  {
    image: '/nfts/emerald-ape.jpg',
    date: '10 de novembro',
    readingTime: 'Leitura de 3 min',
    title: 'Os artistas digitais em destaque',
    excerpt: 'Conheça criadores que moldam a cultura digital na rede.',
  },
  {
    image: '/nfts/cosmic-bloom.jpg',
    date: '07 de novembro',
    readingTime: 'Leitura de 4 min',
    title: 'Como proteger seu NFT',
    excerpt: 'Boas práticas de segurança para a sua coleção digital.',
  },
  {
    image: '/nfts/golden-beat.jpg',
    date: '03 de novembro',
    readingTime: 'Leitura de 3 min',
    title: 'Como precificar seu NFT',
    excerpt: 'Aprenda a avaliar mercado, raridade e demanda.',
  },
]

/**
 * Journal preview. Editorial pages are explicitly out of scope, so the cards are
 * presented as content only — there is no "Ler mais" link pretending to work.
 */
export const JournalSection = () => (
  <section aria-labelledby="diario-titulo" className="shell mt-20">
    <div className="text-center">
      <h2 id="diario-titulo" className="text-base font-bold">
        Diário da Cunhagem
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-[0.7rem] leading-relaxed text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade
        digital.
      </p>
    </div>

    <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {POSTS.map((post) => (
        <li key={post.title} className="flex flex-col gap-2">
          <img
            src={post.image}
            alt=""
            width={255}
            height={180}
            loading="lazy"
            className="aspect-[255/180] w-full rounded-sm object-cover"
          />
          <p className="text-[0.65rem] text-muted-foreground">
            {post.date} | {post.readingTime}
          </p>
          <h3 className="text-[0.8rem] leading-snug font-bold">{post.title}</h3>
          <p className="text-[0.7rem] leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <span className="text-[0.65rem] text-muted-foreground/80">Conteúdo editorial</span>
        </li>
      ))}
    </ul>
  </section>
)
