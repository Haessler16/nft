# KURIO — NFT Marketplace (`nft`)

Marketplace de NFTs em React + TypeScript, construído a partir dos frames de
design em [`nft img/`](nft%20img) (identidade KURIO: fundo escuro, tipografia
monoespaçada e destaque âmbar). Catálogo, carrinho, checkout, recibo, conta e
carteiras funcionam com dados simulados.

O enunciado do desafio está em [BRIEF.md](BRIEF.md), o plano de execução em
[docs/PLAN.md](docs/PLAN.md) e as decisões técnicas em
[ARCHITECTURE.md](ARCHITECTURE.md).

> **Status:** fundação, design system, início (catálogo), autenticação/sessão
> (Seção 4) e detalhe do NFT com favoritos (Seção 6) implementados. As demais
> telas são placeholders navegáveis que listam seus comportamentos obrigatórios.
> Nenhuma transação real é executada.

## Stack

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface / linguagem | React 19 + TypeScript (strict, `noUncheckedIndexedAccess`) |
| Build | Vite 8 |
| Roteamento | TanStack Router (file-based, search params validados com zod) |
| Estado remoto | TanStack Query |
| Cliente HTTP | Axios |
| Tempo real | Socket.IO (`socket.io-client`) |
| Estilização | Tailwind CSS v4 |
| Componentes | shadcn/ui (Radix) |
| Mocking | MSW (+ `@mswjs/socket.io-binding` para eventos) |
| Testes E2E / regressão visual | Playwright |
| Performance | Lighthouse |

## Setup

Requisitos: Node.js 22+ e npm 10+ (lockfile: `package-lock.json`).

```bash
npm ci                             # dependências travadas
npx playwright install chromium    # uma vez, para os testes E2E
npm run dev                        # http://localhost:5173 com MSW ativo
```

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm run dev` | desenvolvimento com mocks (`.env.development`) |
| `npm run build` | gera rotas, typecheck e build de produção |
| `npm run preview` | serve o build (mocks ativos via `.env.production`) |
| `npm run typecheck` | gera rotas e roda `tsc -b` |
| `npm run lint` | oxlint |
| `npm run format` | oxlint `--fix` |
| `npm run routes:generate` | regenera `src/routeTree.gen.ts` |
| `npm run test:e2e` | Playwright em desktop (1440), tablet (768) e mobile (390) |
| `npm run test:e2e -- --project=chromium-mobile` | apenas um viewport |

Relatório HTML em `playwright-report/`; traces/vídeos de falha em
`test-results/` (ambos ignorados pelo git).

## Variáveis de ambiente

Documentadas em [.env.example](.env.example). Os `.env.development` e
`.env.production` versionados já ligam os mocks, porque a aplicação publicada é a
demonstração.

| Variável | Padrão | Função |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | base do único cliente Axios (same-origin para o MSW interceptar) |
| `VITE_SOCKET_URL` | origem atual | origem usada pelo `socket.io-client` |
| `VITE_ENABLE_MOCKS` | `false` nos defaults, `true` nos `.env` versionados | sobe o MSW antes do primeiro render |
| `VITE_MOCK_SCENARIO` | `default` | cenário determinístico de mocks |

## Credenciais demo

Duas contas determinísticas vêm no seed
([src/features/auth/demo.ts](src/features/auth/demo.ts)) e aparecem como dica
própria na tela de login:

| E-mail | Senha | Uso |
| --- | --- | --- |
| `ava@kurio.demo` | `demo1234` | colecionadora (dono do carrinho/favoritos de exemplo) |
| `noah@kurio.demo` | `demo1234` | segundo usuário, prova o isolamento de dados |

Cadastro por formulário também funciona: a senha precisa de letras + números
(mínimo 8 caracteres) e um e-mail repetido responde `409` apontando o campo.

## Estrutura

```
src/
  app/            providers, session (provider/context/hooks), router tipado, guardas
  components/
    home/         seções da página inicial (hero, banners, diário)
    layout/       header e footer da KURIO
    feedback/     404, error boundary, placeholders de rota
    ui/           primitivas shadcn/ui adaptadas ao tema
  features/
    auth/         contratos, endpoints, mutations de sessão + credenciais demo
    cart/         contratos, endpoints e mutations do carrinho
    favorites/    contratos, endpoints, queries e toggle otimista
    nfts/         contratos, endpoints, queries, busca na URL e componentes do catálogo
  lib/            api (Axios + erros + tipos), query (client + keys + ensure), dinheiro, env
  mocks/          MSW: db, fixtures (nfts, usuários), handlers
  routes/         rotas file-based (routeTree.gen.ts é gerado)
public/nfts/      artwork extraído dos frames de design
e2e/              testes Playwright
docs/             PLAN.md
nft img/          frames originais do design (referência)
```

## Rotas

| Rota | Tela | Status |
| --- | --- | --- |
| `/` | Início: destaque, catálogo, busca, filtros, ordenação, paginação | **implementada** |
| `/nfts/$nftId` | Detalhe do NFT (galeria, quantidade, favoritos, coleção) | **implementada** |
| `/login`, `/register` | Login e cadastro (com `redirect` de retorno) | **implementada** |
| `/cart` | Carrinho | placeholder |
| `/checkout` | Pagamento | placeholder (**privada**) |
| `/orders/$orderId` | Confirmação / recibo | placeholder (**privada**) |
| `/account` → `/account/profile` | Perfil do colecionador | placeholder (**privada**) |
| `/account/wallets` | Carteiras | placeholder (**privada**) |
| `/account/orders` | Meus pedidos | placeholder (**privada**) |
| `*` | 404 dentro do shell | implementado |

Rotas marcadas como **privadas** passam pela guarda de `beforeLoad`
([src/app/guards.ts](src/app/guards.ts)): sem sessão (ou com ela expirada) o
visitante vai para `/login?redirect=<destino>` e volta ao ponto original após
entrar.

## Estado na URL (catálogo)

Exemplo: `/?q=golden&categories=%5B%22Arte%20digital%22%5D&sort=price-asc&page=2`

- `q`, `categories[]`, `networks[]`, `min`, `max`, `sort`, `tab`, `page` compõem a
  requisição e a chave de cache; refresh e navegação pelo histórico preservam tudo.
- Filtros são combináveis e qualquer mudança de filtro volta para `page=1`.
- Abas: `todos` (ordenação escolhida), `novos` (listados recentemente) e `alta`
  (maior preço) — proxies documentados em `ARCHITECTURE.md`.

## Dados simulados

- O estado vive em [src/mocks/db.ts](src/mocks/db.ts), é persistido em
  `localStorage` e compartilhado por todos os handlers.
- `POST /api/__mock/reset` restaura o seed determinístico (30 NFTs, 9 categorias,
  3 redes, 5 páginas, 2 contas demo). Os testes E2E chamam esse endpoint a cada cenário.
- Handlers atuais: catálogo (`GET /api/nfts`, `GET /api/nfts/:nftId`), sessão
  (`GET /api/session`, `POST /api/auth/{login,register,logout}`), favoritos
  (`GET|PUT|DELETE /api/favorites[/:nftId]`), carrinho (`GET /api/cart`,
  `POST /api/cart/items`, `PATCH|DELETE /api/cart/items/:nftId`) e controle dos
  mocks (`GET /api/health`, `POST /api/__mock/reset`, `POST /api/__mock/scenario`).
  A tabela completa está em [ARCHITECTURE.md](ARCHITECTURE.md).
- **Cenários** (`VITE_MOCK_SCENARIO` no boot, ou `POST /api/__mock/scenario`
  `{ "scenario": "…" }` em runtime, sem reload):

  | Cenário | Efeito |
  | --- | --- |
  | `default` | seed determinístico, respostas normais |
  | `flaky` | mutações de favorito respondem `503 UNAVAILABLE` (testa rollback) |
  | `session-expired` | `GET /api/session` revoga a sessão ativa com `401` (guarda leva ao login preservando o destino) |

## Assets e design

- Cores, tipografia (Archivo Narrow para display, Courier Prime para UI) e
  proporções foram extraídas dos frames em [`nft img/`](nft%20img).
- O artwork vive em [`public/nfts/`](public/nfts): quatro retratos vieram dos PNGs
  em alta resolução na raiz de `public/` (não referenciados diretamente) e os demais
  foram recortados dos frames — ver substituições em
  [ARCHITECTURE.md](ARCHITECTURE.md#assets-e-substituições).
- Ícones de redes sociais são glifos rotulados (o ícone de marca não existe no
  conjunto usado) e não são links.

## Documentação

- [BRIEF.md](BRIEF.md) — enunciado do desafio
- [docs/PLAN.md](docs/PLAN.md) — seções, entregáveis e critérios de aceite
- [ARCHITECTURE.md](ARCHITECTURE.md) — contratos, sessão, carrinho, cache, realtime
- [src/features/README.md](src/features/README.md) — convenções por feature
