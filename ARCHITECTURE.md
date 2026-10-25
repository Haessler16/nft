# Arquitetura

Documento vivo: registra as decisões já tomadas na estrutura inicial e as que serão
fechadas nas próximas seções de [docs/PLAN.md](docs/PLAN.md). Contratos REST, política
de sessão, carrinho, cache e reconciliação serão detalhados aqui conforme forem
implementados.

## 1. Visão geral

SPA React com build Vite, roteamento por arquivos (TanStack Router) e estado remoto
em TanStack Query. Toda a rede passa por um único cliente Axios e é interceptada na
camada de rede pelo MSW (service worker), que também serve os eventos Socket.IO. Isso
mantém um caminho único de dados entre desenvolvimento, build de demonstração e
testes.

```
rota (src/routes)
  └─ loader/componente
       └─ features/<feature>/{queries,hooks}
            └─ features/<feature>/api/endpoints   (Axios + tipos)
                 └─ /api/*  ──► MSW (service worker) ──► fixtures + db em memória/localStorage
                                   └─► socket.io events (@mswjs/socket.io-binding)
```

Camadas e regras de dependência:

- `src/routes` apenas compõe: valida search params, chama loaders e renderiza features.
- `src/features/*` não importa de outra feature; o compartilhado sobe para `src/lib`.
- `src/components/ui` são primitivas shadcn/ui sem regra de negócio.
- Nenhum componente importa `axios`; apenas `features/*/api/endpoints.ts`.

## 2. Build e deploy

- **Vite 8** com `@vitejs/plugin-react`, `@tailwindcss/vite` e o plugin do TanStack
  Router (que gera `src/routeTree.gen.ts` e faz code splitting por rota).
- `npm run build` roda `tsr generate && tsc -b && vite build`: typecheck bloqueia o
  build, e a geração de rotas garante tipos atualizados em checkout limpo.
- O build é estático (`dist/`). O deploy exige rewrite SPA (`/* → /index.html`) para
  acesso direto e refresh em qualquer rota.
- `.env.production` mantém `VITE_ENABLE_MOCKS=true`: a versão publicada é a demo e
  precisa do MSW e do realtime simulado funcionando.

## 3. Roteamento e estado na URL

- Rotas file-based em `src/routes`, id tipado por caminho (`createFileRoute`).
- Busca, filtros, ordenação e página vivem em **search params validados** (schema por
  rota). A query key deriva do mesmo objeto validado, então URL, request e cache não
  podem divergir. Mudança de filtro reinicia `page`.
- `defaultPreload: 'intent'`, `scrollRestoration: true`.
- 404 (`notFoundComponent`) e error boundary (`errorComponent`) no root, dentro do
  shell, para que o cabeçalho e a navegação continuem disponíveis.
- Contexto do router carrega `queryClient` ([src/app/router-context.ts](src/app/router-context.ts)),
  permitindo `ensureQueryData` em loaders com o mesmo cache dos componentes.
- Fluxos privados (`/checkout`, `/account/*`, `/orders/*`) são protegidos em
  `beforeLoad` ([src/app/guards.ts](src/app/guards.ts)): a sessão é lida com
  `ensureQueryData(..., revalidateIfStale)`, `401` redireciona para
  `/login?redirect=<href atual>` e qualquer outra falha cai no error boundary da
  rota. O wrapper estável contra o `CancelledError` do StrictMode vive em
  [src/lib/query/ensure.ts](src/lib/query/ensure.ts) e é usado por guardas e
  loaders imperativos.

### Estado do catálogo

`/` declara `validateSearch` com o schema de
[catalog-search.ts](src/features/nfts/catalog-search.ts). Todas as chaves são
opcionais com fallback determinístico, então um link para `/` não precisa
escrever defaults e uma URL adulterada degrada para um catálogo válido.
`resolveCatalogSearch` aplica os defaults uma única vez; `toNftListParams` converte
o resultado para o contrato REST, e a query key usa exatamente esse objeto.

- filtros (`categories`, `networks`, `min`, `max`) sempre voltam para `page=1`;
- a busca é **ao vivo com debounce** (350 ms,
  [src/features/nfts/hooks.ts](src/features/nfts/hooks.ts)): cada pausa do
  digitar vira uma navegação (`replace` dentro do catálogo para não poluir o
  histórico, `push` no primeiro salto de outra tela), e Enter/botão descarta o
  timer para navegar na hora. Como o request em voo é cancelado por `signal` e
  a lista usa `keepPreviousData`, digitar rápido nunca pinta grade fora de ordem;
- `pruneCatalogSearch` remove filtros vazios antes de escrever a URL, evitando
  `?q=&categories=[]&min=null`;
- abas são visões, não filtros: `todos` respeita `sort`, `novos` fixa
  `sort=recent` e `alta` fixa `sort=price-desc` (é o sinal de demanda que o mock
  expõe). Mudar a aba reinicia a página; escolher uma ordenação volta a aba para
  `todos`.

## 4. Transporte HTTP e contrato de erro

- Instância única em [src/lib/api/client.ts](src/lib/api/client.ts): `baseURL` de
  `VITE_API_BASE_URL`, `withCredentials` (sessão simulada por cookie), timeout de 15s.
- Interceptor de resposta normaliza tudo em `ApiError` — nunca `AxiosError` cru chega
  à UI.
- Envelope de erro único:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": { "email": "…" }, "requestId": "req_…" } }
  ```

- Códigos: `VALIDATION_ERROR` (422), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
  `NOT_FOUND` (404), `CONFLICT` (409), `UNAVAILABLE` (503), `INTERNAL` (500) e os de
  transporte `NETWORK_ERROR`, `TIMEOUT`, `CANCELED`.
- `ApiError.isRetryable` (`status === 0 || >= 500`) separa falha transitória de erro
  definitivo; `fields` alimenta mensagens por campo nos formulários.
- Cancelamento: toda função de endpoint aceita `signal` e o Query cancela a query
  quando a chave muda ou o componente desmonta.

### Tabela de endpoints (parcial — cresce a cada seção do plano)

| Método | Caminho | Contrato | Handler MSW | Feature |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | `{ status, mocked }` | `handlers/index.ts` | controle |
| POST | `/api/__mock/reset` | — | `handlers/index.ts` | controle |
| POST | `/api/__mock/scenario` | `{ scenario }` | `handlers/index.ts` | controle |
| GET | `/api/nfts` | `Paginated<NftListItem>` + facets | `handlers/nfts.ts` | `nfts` |
| GET | `/api/nfts/:nftId` | `NftDetail` · `404` | `handlers/nfts.ts` | `nfts` |
| GET | `/api/session` | `SessionResponse` · `401` | `handlers/session.ts` | `auth` |
| POST | `/api/auth/login` | `LoginInput` → `SessionResponse` · `401`/`422` | `handlers/session.ts` | `auth` |
| POST | `/api/auth/register` | `RegisterInput` → `SessionResponse` · `409`/`422` | `handlers/session.ts` | `auth` |
| POST | `/api/auth/logout` | `204` | `handlers/session.ts` | `auth` |
| GET | `/api/favorites` | `FavoritesResponse` · `401` | `handlers/favorites.ts` | `favorites` |
| PUT | `/api/favorites/:nftId` | favorita · `503` no cenário `flaky` | `handlers/favorites.ts` | `favorites` |
| DELETE | `/api/favorites/:nftId` | remove · `503` no cenário `flaky` | `handlers/favorites.ts` | `favorites` |
| GET | `/api/cart` | `CartResponse` (escopo visitante/usuário) | `handlers/cart.ts` | `cart` |
| POST | `/api/cart/items` | adiciona · `422`/`409` | `handlers/cart.ts` | `cart` |
| PATCH | `/api/cart/items/:nftId` | altera quantidade · `422`/`409` | `handlers/cart.ts` | `cart` |
| DELETE | `/api/cart/items/:nftId` | remove | `handlers/cart.ts` | `cart` |
| GET | `/api/quote` | `QuoteResponse` (`items=nft:qtd,…`, `coupon`) · `422`/`404` | `handlers/quote.ts` | `cart` |
| POST | `/api/coupons/validate` | `{ code }` → `CouponValidation` · `422` (`fields.coupon`) | `handlers/quote.ts` | `cart` |

Erros seguem sempre o envelope `{ error: { code, message, fields? } }`
(`handlers/envelope.ts`). Cotação, pedidos, perfil e carteiras chegam com as
Seções 7–11.

## 5. Estado remoto: cache, retries e invalidação

Política atual em [src/lib/query/client.ts](src/lib/query/client.ts):

| Opção | Valor | Motivo |
| --- | --- | --- |
| `staleTime` | 30s | navegação de volta instantânea; catálogo é mantido fresco pelo socket |
| `gcTime` | 5min | descarta dados de telas não visitadas |
| `refetchOnWindowFocus` | `false` | eventos e invalidação explícita são a fonte de verdade |
| retry de query | 2, com backoff (1s→8s), só para erro retentável | 4xx não se resolve repetindo |
| retry de mutation | 0 | impedir compra/cadastro duplicados |

Chaves em [src/lib/query/keys.ts](src/lib/query/keys.ts):

- recursos públicos (`nfts`) incluem os parâmetros completos da consulta;
- recursos privados (`favorites`, `cart`, `quote`, `orders`, `profile`, `wallets`) são
  prefixados pelo id do usuário — logout/troca de usuário remove o escopo privado com
  `queryClient.removeQueries` sem derrubar o catálogo público.

Invalidação: mutations invalidam somente as chaves afetadas (ex.: adicionar ao
carrinho → `cart` + `quote`); eventos de socket atualizam o cache por `setQueryData`
com verificação de versão e disparam invalidação pontual quando o payload é parcial.

Atualização otimista obrigatória: favoritar (Seção 6) — `onMutate` cancela
refetch em voo, grava o estado anterior e aplica o toggle, `onError` faz rollback
e mostra feedback acessível (toast + região `aria-live`), `onSettled` reconcilia
com a resposta do servidor.

Aguardos imperativos em loaders e guardas passam por
[src/lib/query/ensure.ts](src/lib/query/ensure.ts): o React StrictMode do
desenvolvimento cancela o fetch quando o último observador desmonta e devolve um
`CancelledError` que abortaria a navegação; o wrapper repassa as mesmas opções
uma vez e os erros reais (401/404/rede) são propagados intactos.

## 6. Dinheiro

- ETH trafega como **string decimal** em todo o caminho (API, cache, componentes).
- Aritmética em `decimal.js` ([src/lib/money.ts](src/lib/money.ts)); `number` é usado
  apenas para quantidades, que são inteiras.
- A cotação da API (`/quote`) é a única fonte de verdade de subtotal, desconto, taxa de
  rede e total. O cliente não recalcula preços para exibir — apenas formata.
- O desconto é um percentual inteiro vindo do cupom (`percentOf`, mesmo módulo);
  a taxa de rede do mock é `0.0005 ETH` por unidade (`NETWORK_FEE_PER_UNIT`,
  definido no contrato e cobrado **pelo handler**, nunca pela tela).
- Recibo é um snapshot do pedido: mudanças posteriores no catálogo não o alteram.

## 7. Mocks (MSW) e realtime simulado

- Estado único em [src/mocks/db.ts](src/mocks/db.ts): seed determinístico de 30
  NFTs (10 peças × 3 séries, 9 categorias, 3 redes, 5 páginas de 6), persistido em
  `localStorage` e restaurável por `POST /api/__mock/reset` — usado pelo botão de
  demo e pelo `beforeEach` dos testes E2E.
- Serviço Worker em `public/mockServiceWorker.js`, iniciado por
  [src/mocks/index.ts](src/mocks/index.ts) somente quando `VITE_ENABLE_MOCKS=true`,
  antes do primeiro render; o worker é importado dinamicamente para não entrar no
  bundle quando os mocks estão desligados.
- Handlers compartilham os tipos de `contracts.ts` com a aplicação; o estado simulado
  é único entre catálogo, favoritos, carrinho, perfil, carteiras e pedidos, persistido
  em `localStorage` e restaurável por `resetDatabase()`.
- Cenários determinísticos selecionáveis por `VITE_MOCK_SCENARIO` (boot) ou por
  `POST /api/__mock/scenario` (runtime, sem reload), aplicados no handler — nunca
  com código alternativo na UI. Implementados e documentados no README:
  `default`, `flaky` (mutações de favorito com `503`, exercita rollback),
  `session-expired` (`GET /api/session` revoga a sessão ativa) e os dois que
  alteram **os dados**: `price-changed` (preços +10%) e `sold-out` (nenhuma
  unidade). Esses dois são rederivados da semente a cada troca
  (`applyScenarioData` no `db.ts`), então alterná-los nunca acumula efeito e
  catálogo, detalhe, carrinho e cotação mostram sempre os mesmos números.
  Os demais (`slow`, `empty`, `conflict`, `coupon-invalid`, `order-timeout`,
  `payment-declined`) chegam com as seções que os consomem.
- Eventos: `@mswjs/socket.io-binding` no mesmo worker entrega os eventos ao
  `socket.io-client` real. Limitações a documentar na seção 10: exige service worker
  (por isso a demo é servida por HTTPS/HTTP local), a primeira navegação só passa a ser
  interceptada depois que o worker assume o controle da página, e não há servidor
  Socket.IO real no ambiente publicado.

## 8. Tempo real

- Eventos `nft.updated` e `order.updated` carregam `resourceId`, `version` e payload
  do recurso afetado.
- Ordenação: cada recurso guarda a última versão aplicada (em memória e no cache do
  Query). Evento com `version <= última` é descartado — duplicatas e eventos antigos
  não regridem estado nem reaplicam efeitos (ex.: toasts).
- Reconexão: ao `connect`, os recursos ativos (detalhe aberto, carrinho, pedido em
  andamento) são reconciliados por REST antes de voltar a aceitar eventos.
- Isolamento: a subscription é criada por sessão e carrega o id do usuário; ao fazer
  logout/trocar de usuário, o socket é desconectado e os listeners removidos, então
  eventos de uma sessão anterior não podem atualizar outro usuário.
- Pedido confirmado/recusado é terminal; a UI deixa de reagir a eventos daquele id.

## 9. Sessão e carrinho (Seções 4 e 7)

- **Sessão (implementada):** o MSW não pode gravar cookie `httpOnly`, então a
  sessão é um estado `{ userId, createdAt }` dentro do db simulado e
  `GET /api/session` é a fonte de verdade. No cliente, a query `['session']` é
  servida pelo `SessionProvider` ([src/app/session/](src/app/session/provider.tsx)),
  que expõe `session`, `isAuthenticated` e `scope` (id do usuário ou `guest`).
  A aplicação não guarda token algum em `localStorage`; o que persiste lá é o db
  do mock, para a sessão sobreviver a refresh.
- **Expiração/401 durante navegação (implementada):** a guarda de `beforeLoad`
  lê a sessão com revalidação, e um `401` (sessão ausente, revogada pelo cenário
  `session-expired` ou usuário removido) redireciona para
  `/login?redirect=<destino>` — o login devolve o usuário exatamente ao ponto
  que estava. Durante o checkout o mesmo `redirect` preserva a rota de retomada.
- **Carrinho de visitante:** chave de escopo `guest`; no login/cadastro o handler
  mescla o carrinho do visitante no da conta (quantidade somada, limitada pela
  disponibilidade) e descarta o escopo `guest` — feito dentro de
  `POST /api/auth/login|register`, sem endpoint separado de merge.
- **Troca de usuário:** logout/removeQueries derruba todo o escopo privado
  (`cart`, `favorites`, `orders`, …) antes de carregar o escopo novo, então
  usuário B nunca herda favoritos ou carrinho de A (cubierto por E2E).
- **Tela de carrinho (implementada):** duas leituras com papéis separados —
  `GET /api/cart` devolve as linhas (imagem, nome, edição, `available`) e nunca
  um preço; `GET /api/quote` devolve todo o dinheiro do snapshot explícito de
  itens (`items=nft:qtd,…`). As queries esperam a sessão assentar
  (`enabled: !isLoading`) para não buscar o carrinho do escopo errado nem
  refazer o mesmo request.
- **Chave da cotação:** `['quote', escopo, fingerprint]`, com
  `fingerprint = itens ordenados + cupom`
  ([src/features/cart/fingerprint.ts](src/features/cart/fingerprint.ts)). Mudar
  quantidade ou aplicar cupom gera uma *nova* entrada (fetch fresco) sem
  invalidar a atual — os números antigos ficam na tela até os novos chegarem.
- **Cupom na URL:** `POST /api/coupons/validate` confirma o código **antes** de
  `?coupon=` entrar no search; só um código aprovado troca a chave da cotação.
  Um endereço editado à mão faz o `GET /api/quote` responder `422` com
  `fields.coupon`, e a tela mostra o erro no painel do resumo mantendo as linhas
  (que vêm de outro request) — degradação em vez de tela quebrada.
- **Avisos da cotação:** `alerts: ["price-changed" | "availability-changed"]`
  são dados do servidor; a tela decide o texto e o tom (banner padrão para
  preço, `destructive` para disponibilidade). Hoje os produzem os cenários
  `price-changed`/`sold-out`; a entrega *em tempo real* chega com
  `nft.updated` (Seção 10).

## 10. Interface, responsividade e acessibilidade

- Tokens em `src/index.css` (`@theme`), base shadcn/ui; componentes da UI recebem a
  identidade do Figma via CSS variables, não via classes soltas.
- Breakpoints avaliados: 390, 768 e 1440; layouts de perfil, carteiras, carrinho e
  recibo têm desenho próprio em mobile (sem frame correspondente no Figma).
- Skeletons com shimmer preservam as dimensões do conteúdo e respeitam
  `prefers-reduced-motion`.
- Foco visível global, skip link no root, foco preso em dialog/drawer (Radix), erros
  associados por `aria-describedby`, feedback de mutação e de evento em `aria-live`.

## 11. Design system e assets (KURIO)

Identidade extraída dos frames em `nft img/`:

| Token | Valor | Uso |
| --- | --- | --- |
| `--background` | `#100806` | fundo da página |
| `--card` / `--secondary` | `#1b120d` / `#251a13` | cards, filtros, modais |
| `--surface-band` | `#241a13` | faixa de destaques do footer |
| `--foreground` | `#f4ecd8` | texto principal |
| `--muted-foreground` | `#b79c7c` | texto secundário |
| `--primary` | `#df9b55` | ação, preço, foco |
| `--border` / `--input` | `rgba(214,168,120,.16)` / `.26` | contornos |

Tipografia: **Archivo Narrow** (display, caixa alta e tracking largo) e
**Courier Prime** (toda a UI, incluindo textos corridos e preços) — ambas servidas
localmente por `@fontsource`, sem CDN. O tema é dark-only, como no arquivo.

Componentes shadcn/ui foram adaptados por tokens (raio 4px, botões mono bold,
inputs escuros) em vez de sobrescritos por tela. Skeletons usam a utilidade
`.skeleton-shimmer`, desligada em `prefers-reduced-motion`.

### Assets e substituições

- Os retratos de maior resolução que acompanharam o desafio foram usados apenas para
  gerar os JPEGs servidos (`public/nfts/{emerald-ape,sage-nomad,neon-vessel,golden-beat}.jpg`,
  640 px, q82, e a arte do hero em 900 px) e foram **removidos do repositório**: não
  são referenciados pela aplicação e pesavam ~9 MB no build. A fonte continua sendo
  os frames em `nft img/`.
- Os demais retratos não vêm em arquivos separados: foram recortados dos próprios
  frames (1440 px) e salvos em `public/nfts/`, nomeados por personagem
  (`cosmic-bloom`, `violet-nomad`, …).
- Ícones de redes sociais: o conjunto `lucide-react` não distribui marcas, então o
  rodapé usa glifos rotulados, sem link (perfis não fazem parte da entrega).
- Imagens editoriais do “Diário da Cunhagem” reutilizam o mesmo artwork; são
  conteúdo estático e não têm link “Ler mais”, porque páginas editoriais estão
  fora do escopo.
- Imagens têm `width`/`height` explícitos e `loading="lazy"` (exceto o hero, com
  `fetchPriority="high"`) para evitar CLS e acelerar o LCP.

## 12. Limitações e desvios conhecidos

- Integrações reais de blockchain, carteira e pagamento estão fora do escopo: tudo é
  simulado e rotulado como demonstração no rodapé.
- O service worker não intercepta requisições feitas antes da primeira ativação; o
  bootstrap espera `worker.start()` antes de renderizar para evitar esse estado.
- Em desenvolvimento, um full reload disparado por HMR pode deixar a página sem
  interceptação por um instante (a requisição cai no fallback do Vite). Recarregar
  resolve; o build de demonstração sempre inicia o worker antes do primeiro fetch.
- As imagens dos cards são derivadas dos frames (~255 px de largura). Servem ao
  layout em DPR 1 e 2 sem ampliação visível, mas não são os arquivos originais do
  Figma.
