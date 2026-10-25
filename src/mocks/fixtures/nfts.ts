import type { NftDetail, NftNetwork, NftReview } from '@/features/nfts/api/contracts'

/**
 * Catalog fixtures.
 *
 * The artwork files were extracted from the design frames (see ARCHITECTURE.md →
 * "Assets"). Prices are decimal strings and never pass through floats; the
 * builder is deterministic so every scenario and test starts from the same data.
 */

interface Seed {
  name: string
  image: string
  price: string
  compareAt: string | null
  rarity: string | null
  eyes: string
  skill: string
}

const SEEDS: readonly Seed[] = [
  {
    name: 'Emerald Ape',
    image: 'emerald-ape',
    price: '1.19',
    compareAt: null,
    rarity: null,
    eyes: 'Esmeralda',
    skill: 'Canto',
  },
  {
    name: 'Sage Nomad',
    image: 'sage-nomad',
    price: '1.69',
    compareAt: null,
    rarity: null,
    eyes: 'Castanho',
    skill: 'Rastreio',
  },
  {
    name: 'Neon Vessel',
    image: 'neon-vessel',
    price: '1.99',
    compareAt: '2.29',
    rarity: 'RARO',
    eyes: 'Verde',
    skill: 'Liderança',
  },
  {
    name: 'Cosmic Bloom',
    image: 'cosmic-bloom',
    price: '1.29',
    compareAt: null,
    rarity: null,
    eyes: 'Azul',
    skill: 'Botânica',
  },
  {
    name: 'Violet Nomad',
    image: 'violet-nomad',
    price: '1.39',
    compareAt: null,
    rarity: 'ÉPICO',
    eyes: 'Mel',
    skill: 'Audição',
  },
  {
    name: 'Ivory Baron',
    image: 'ivory-baron',
    price: '1.79',
    compareAt: null,
    rarity: null,
    eyes: 'Escuro',
    skill: 'Estratégia',
  },
  {
    name: 'Golden Beat',
    image: 'golden-beat',
    price: '0.99',
    compareAt: null,
    rarity: null,
    eyes: 'Âmbar',
    skill: 'Ritmo',
  },
  {
    name: 'Golden Frequency',
    image: 'golden-frequency',
    price: '0.59',
    compareAt: null,
    rarity: 'RARO',
    eyes: 'Oliva',
    skill: 'Frequência',
  },
  {
    name: 'Golden Signal',
    image: 'golden-signal',
    price: '0.39',
    compareAt: null,
    rarity: null,
    eyes: 'Verde-claro',
    skill: 'Escuta',
  },
  {
    name: 'Jade Oracle',
    image: 'cosmic-bloom',
    price: '3.15',
    compareAt: null,
    rarity: 'LENDÁRIO',
    eyes: 'Jade',
    skill: 'Oráculo',
  },
] as const

const CATEGORIES = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Colecionáveis',
  'Generativa',
  'Jogos',
  'Assinaturas',
  'Utilidade',
] as const

const NETWORKS: readonly NftNetwork[] = ['Ethereum', 'Polygon', 'Solana']

/** Three series of the same ten pieces → 30 items (5 pages of 6). */
const SERIES = [
  { tokenOffset: 0, priceFactor: 0, editionOf: 1 },
  { tokenOffset: 100, priceFactor: 0.41, editionOf: 10 },
  { tokenOffset: 200, priceFactor: 1.13, editionOf: 25 },
] as const

const priceAdd = (base: string, delta: number): string => {
  const [whole, fraction = '00'] = base.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0')) + Math.round(delta * 100)
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

const RARITIES = ['RARO', 'ÉPICO', 'LENDÁRIO', null] as const

const CREATORS = [
  { id: 'creator_kurio', name: 'Kurio Studio' },
  { id: 'creator_ana', name: 'Ana Vilela' },
  { id: 'creator_rafa', name: 'Rafael Kato' },
] as const

const REVIEW_TEXTS = [
  'Peça impecável: proveniência confere e a transferência foi instantânea.',
  'Comprei na primeira leva e já revendi acima do preço de lista.',
  'Edição pequena segura o valor. Recomendo para quem está começando.',
  'Acabamento perfeito em alta resolução, com todos os metadados no token.',
  'Royalties pagos pelo mercado sem precisar abrir chamado. Nota dez.',
  'Arte com identidade forte, destaque da minha coleção.',
] as const

const REVIEWERS = [
  'Lia Ferraz',
  'Caio Nunes',
  'Iara Bittencourt',
  'Rui Salgado',
  'Nina Vidal',
  'Tomás Aguiar',
] as const

/** Deterministic reviews: the first piece mirrors the 19 reviews in the frame. */
const buildReviews = (seedIndex: number, index: number): NftReview[] => {
  const count = index === 0 ? 19 : 4 + (seedIndex % 5)
  return Array.from({ length: count }, (_, reviewIndex) => {
    const seed = index * 7 + reviewIndex
    return {
      id: `rev_${index}_${reviewIndex}`,
      author: REVIEWERS[seed % REVIEWERS.length] ?? 'Colecionador KURIO',
      rating: 3 + (seed % 3),
      comment: REVIEW_TEXTS[seed % REVIEW_TEXTS.length] ?? 'Ótima peça para coleção.',
      createdAt: new Date(Date.UTC(2026, 9, 18 - ((seed * 3) % 42), 12, 0, 0)).toISOString(),
    }
  })
}

export const buildNfts = (): NftDetail[] => {
  const nfts: NftDetail[] = []

  SERIES.forEach((series, seriesIndex) => {
    SEEDS.forEach((seed, seedIndex) => {
      const index = seriesIndex * SEEDS.length + seedIndex
      const tokenId = seed.name === 'Emerald Ape' && seriesIndex === 0
        ? '042'
        : String(seedIndex + 8 + series.tokenOffset).padStart(3, '0')
      const rarity = seed.rarity ?? RARITIES[index % RARITIES.length] ?? null
      const network = NETWORKS[index % NETWORKS.length] ?? 'Ethereum'
      const category = CATEGORIES[index % CATEGORIES.length] ?? 'Arte digital'
      const price = priceAdd(seed.price, series.priceFactor)
      const reviews = buildReviews(seedIndex, index)
      const ratingTotal = reviews.reduce((total, review) => total + review.rating, 0)
      const address = `0x${(0x8d1c748 + index * 0x1f3a).toString(16)}…7488`

      nfts.push({
        id: `nft_${String(index + 1).padStart(3, '0')}`,
        name: `${seed.name} #${tokenId}`,
        tokenId,
        imageUrl: `/nfts/${seed.image}.jpg`,
        priceEth: price,
        compareAtPriceEth: seed.compareAt ? priceAdd(seed.compareAt, series.priceFactor) : null,
        rarity,
        category,
        collection: 'Kurio Editions',
        creator: CREATORS[seedIndex % CREATORS.length] ?? CREATORS[0],
        network,
        edition: { number: 1, of: series.editionOf },
        // index 6 is sold out (used by the demo and the E2E suite), index 3 only
        // has two units left (exercises the quantity cap on the detail screen).
        available: index === 6 ? 0 : index === 3 ? 2 : series.editionOf,
        listedAt: new Date(Date.UTC(2026, 9, 20 - index, 12, 0, 0)).toISOString(),
        description:
          `Um colecionável digital finalizado à mão da coleção Kurio Editions. ` +
          `Cada atributo fica armazenado nos metadados do token e verificado na ` +
          `${network}. A obra explora identidade, movimento e luz ` +
          'em um mundo digital sem fronteiras.',
        attributes: [
          { label: 'Olhos', value: seed.eyes },
          { label: 'Habilidade', value: seed.skill },
          { label: 'Rede', value: network },
        ],
        rating:
          reviews.length > 0
            ? {
                average: (ratingTotal / reviews.length).toFixed(1),
                count: reviews.length,
              }
            : null,
        reviews,
        info: {
          provenance:
            `Rede ${network} com proveniência imutável e metadados armazenados no IPFS. ` +
            'A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.',
          contracts:
            'Direitos autorais de criador: 5% nas vendas secundárias, pagos ' +
            'automaticamente por mercados compatíveis.',
          royalties: `Endereço: ${address} — Contrato inteligente ERC-721 verificado.`,
        },
      })
    })
  })

  // A single high-value piece keeps the price filter interesting.
  const last = nfts[nfts.length - 1]
  if (last) {
    nfts[nfts.length - 1] = { ...last, priceEth: '12.38', compareAtPriceEth: null }
  }

  return nfts
}
