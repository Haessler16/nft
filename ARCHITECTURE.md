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
- O build é estático (`dist/`). O deploy precisa de rewrite SPA
  (`/* → /index.html`) para acesso direto e refresh em qualquer rota; no Vercel
  isso vive em [`vercel.json`](vercel.json) com `"/((?!api/).*)"`, que **não**
  captura `/api/*` — o MSW intercepta essas rotas no navegador, e deixá-las
  fora mantém um 404 real visível caso os mocks não subam.
- Os mocks são ligados **por padrão no código** (`src/lib/env.ts`):
  um build a partir de um clone limpo (sem `.env.*`, como o CI do Vercel) sobe o
  MSW sem nenhuma configuração. `VITE_ENABLE_MOCKS=false` é o opt-out para um
  deploy que aponte para uma API real. Os `.env.development`/`.env.production`
  locais são apenas overrides e ficam fora do git (`.gitignore`).

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
| GET | `/api/profile` | `Profile` · `401`/`404` | `handlers/profile.ts` | `profile` |
| PUT | `/api/profile` | `UpdateProfileInput` → `Profile` · `401`/`404`/`422` | `handlers/profile.ts` | `profile` |
| POST | `/api/profile/password` | `{ currentPassword, newPassword }` → `{ ok: true }`/erro · `401`/`422` | `handlers/profile.ts` | `profile` |
| GET | `/api/wallets` | `WalletsResponse` · `401` | `handlers/wallets.ts` | `wallets` |
| POST | `/api/wallets` | `CreateWalletInput` → `Wallet` (`201`) · `401`/`422` | `handlers/wallets.ts` | `wallets` |
| PUT | `/api/wallets/:walletId` | `UpdateWalletInput` → `Wallet` · `401`/`404`/`422` | `handlers/wallets.ts` | `wallets` |
| DELETE | `/api/wallets/:walletId` | `{ ok: true }` · `401`/`404`/`409` | `handlers/wallets.ts` | `wallets` |
| POST | `/api/wallets/connect` | `ConnectWalletInput` → `WalletConnection` (`200` com `status: refused`) · `401`/`404`/`422`/`503` | `handlers/wallets.ts` | `wallets` |
| POST | `/api/orders` | `CreateOrderInput` + header `Idempotency-Key` → `Order` (`201`) · `401`/`409`/`422`/`504` | `handlers/orders.ts` | `orders` |
| GET | `/api/orders` | `OrdersListResponse` (pedidos do escopo, mais recentes primeiro) · `401` | `handlers/orders.ts` | `orders` |
| GET | `/api/orders/:orderId` | `Order` (pending/confirmed/declined) · `401`/`404` | `handlers/orders.ts` | `orders` |
| GET | `/api/orders/by-key/:idempotencyKey` | `Order` · `401`/`404` (recuperação após timeout) | `handlers/orders.ts` | `orders` |

Erros seguem sempre o envelope `{ error: { code, message, fields? } }`
(`handlers/envelope.ts`). A seção de perfil e carteiras (`/account/profile`,
`/account/wallets`) está implementada; a próxima seção cobre a
transversal de acessibilidade e responsividade.

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

Pedido (Seção 8): `useCreateOrder` roda com `retry: 0` e, em erro retentável,
tenta **recuperar** o pedido pela chave de idempotência antes de qualquer novo
POST; a query do pedido usa `staleTime: 0` e `refetchInterval` de 700 ms apenas
enquanto o status é `pending` (terminal para de poll). Ao confirmar, o painel
invalida `cart`, `nfts`, `quote` e o histórico de pedidos (`orders` por escopo),
porque o servidor baixou estoque e removeu só as quantidades compradas.

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
  [src/mocks/index.ts](src/mocks/index.ts) sempre que `env.mocksEnabled` for `true`
  (o padrão; `VITE_ENABLE_MOCKS=false` desliga em builds para uma API real),
  antes do primeiro render; o worker é importado dinamicamente para não entrar no
  bundle quando os mocks estão desligados.
- Handlers compartilham os tipos de `contracts.ts` com a aplicação; o estado simulado
  é único entre catálogo, favoritos, carrinho, perfil, carteiras e pedidos, persistido
  em `localStorage` e restaurável por `resetDatabase()`.
- Cenários determinísticos selecionáveis por `VITE_MOCK_SCENARIO` (boot) ou por
  `POST /api/__mock/scenario` (runtime, sem reload), aplicados no handler — nunca
  com código alternativo na UI. Implementados e documentados no README:
  `default`, `flaky` (mutações de favorito com `503`, exercita rollback, e o
  handshake da carteira com `503`), `session-expired` (`GET /api/session` revoga
  a sessão ativa) e os dois que alteram **os dados**: `price-changed` (preços
  +10%) e `sold-out` (nenhuma unidade). Esses dois são rederivados da semente a
  cada troca (`applyScenarioData` no `db.ts`), então alterná-los nunca acumula
  efeito e catálogo, detalhe, carrinho e cotação mostram sempre os mesmos
  números. `order-timeout` cria o pedido e responde `504` (resposta perdida na
  borda) e `payment-declined` faz a liquidação terminar em `declined`; os dois
  estão descritos em README → Cenários e cobertos pelo E2E do checkout. Faltam
  `slow`, `empty`, `conflict` e `coupon-invalid`.
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

## 10. Checkout, carteiras e pedidos (Seção 8)

- **Formulário** ([src/features/checkout/schema.ts](src/features/checkout/schema.ts)):
  zod espelha as regras do handler; os erros da API vêm em `fields` com nomes de
  campo em português e são traduzidos por `API_FIELD_ALIAS` para o `setError`
  (`nomeExibicao` → `displayName`, `rede` → `network`, …). É o mesmo padrão de
  login/cadastro, então a mensagem aparece sempre ao lado do input errado.
- **Carteiras**: `GET /api/wallets` devolve só as do usuário da sessão. A conexão
  é uma chamada real (`POST /api/wallets/connect`), não estado de componente:
  o handler recusa (200 + `status: "refused"`) quando o provider não assina a
  rede pedida (`PROVIDER_NETWORKS`), o que reproduz “extensão na rede errada”.
  Trocar de rede derruba a conexão (ela é por rede).
- **Revisão** ([review-dialog.tsx](src/features/checkout/components/review-dialog.tsx)):
  mostra o snapshot (colecionador, carteira, itens, taxas, total). Confirmar
  refaz o `GET /api/quote` com `staleTime: 0` e compara com `quotesMatch`
  (`total`, linhas, disponibilidade); total diferente troca o CTA para
  “Confirmar novo total” e **não envia**, disponibilidade perdida manda o
  usuário ajustar o carrinho. O servidor repete a checagem comparando
  `expectedTotal` com a cotação recalculada e responde `409` com
  `fields.cotacao` se algo escapou.
- **Idempotência**: a chave nasce antes do POST e é persistida em
  `localStorage` (`kurio:checkout:key:<escopo>`) junto com o fingerprint
  (itens + cupom + total) em [storage.ts](src/features/checkout/storage.ts).
  Clique repetido é barrado por `submittingRef` + botão desabilitado; resposta
  perdida (rede/5xx) dispara `GET /api/orders/by-key/:key` **antes** de
  qualquer novo POST — se o pedido existe, ele é o resultado. O handler também
  é idempotente: mesma chave + mesmo conteúdo devolve o pedido existente, mesma
  chave + conteúdo diferente responde `409`.
- **Liquidação**: o pedido nasce `pending` e o `GET` chama `db.settleOrders()`;
  depois de `ORDER_SETTLE_MS` (900 ms) vira `confirmed` (baixa estoque e remove
  só as quantidades compradas do carrinho) ou `declined` no cenário
  `payment-declined` (nada é removido). `order.updated` (Seção 10) substituirá
  o poll de 700 ms por evento.
- **Retomada**: o id do pedido ativo é persistido por escopo
  (`kurio:checkout:order:<escopo>`); recarregar `/checkout` reabre o painel com
  o status atual em vez de um carrinho vazio. Estado terminal limpa a chave de
  idempotência; “Fazer outro pedido” limpa o registro para uma nova compra.
  `order-timeout` está representado por um `504` depois de criar o pedido
  (o service worker não consegue descartar a resposta em silêncio); o efeito no
  cliente é o mesmo de um timeout de rede e a recuperação usa a mesma chave.
- **Sessão durante o envio**: um `401` no POST limpa a query `['session']` e
  navega para `/login?redirect=/checkout` — o login devolve ao checkout com o
  carrinho intacto, sem criar pedido.
- **Isolamento**: pedido de outro usuário responde `404` (não vaza existência);
  chave, pedido ativo e carteiras são todos escopados pelo id da sessão.

## 11. Conta: perfil e carteiras (Seção 11)

- **Perfil** (`/account/profile`): `GET /api/profile` e `PUT /api/profile` são
  escopados pela sessão. O painel alterna leitura e edição; o editor usa
  react-hook-form + zod e envia nome, e-mail, bio e `avatarUrl`. O avatar é um
  upload simulado: o arquivo vira data URL no próprio campo, com preview, e
  "remover" grava `null`. O editor só fecha depois do `PUT`; erro de validação
  mantém os valores digitados.
- **Sessão coerente:** o `PUT` invalida `['profile', escopo]` e `['session']`,
  então o nome/e-mail/avatar do cabeçalho acompanham a edição sem reload. O
  servidor recusa e-mail já usado por outra conta (`409` + `fields.email`).
- **Senha:** `POST /api/profile/password` exige a senha atual. Senha atual errada
  e nova senha fraca respondem `422` no envelope único com
  `fields.currentPassword`/`fields.newPassword`; o formulário liga a mensagem ao
  input (`aria-invalid` + `aria-describedby`) e limpa o formulário só no
  sucesso.
- **Carteiras** (`/account/wallets`): `GET/POST/PUT/DELETE /api/wallets` sobre o
  escopo da sessão. Cadastro e edição compartilham `WalletForm`; a remoção é
  confirmada em diálogo e só existe para a secundária. O `db` mantém uma única
  principal por conta (promover rebaixa as outras) e deriva `supportedNetworks`
  de `PROVIDER_NETWORKS[provider]`.
- **Validação compartilhada:** endereço `0x` + 40 hex, nome de 2–60 caracteres,
  provedor/rede suportados. O formulário (zod) e o handler devolvem a mesma
  mensagem, e a combinação não suportada é recusada nos dois lados.
- **Cache e isolamento:** chaves `['profile', escopo]` / `['wallets', escopo]`;
  logout remove os dois escopos (`useLogoutMutation`). O E2E `account.spec.ts`
  prova a persistência e a separação entre Ava e Noah nos três viewports.

## 12. Pedido, recibo e histórico (Seção 9)

- **Recibo como snapshot:** [order-receipt.tsx](src/features/orders/components/order-receipt.tsx)
  renderiza exclusivamente o que foi congelado na criação do pedido (linhas,
  preços, taxas, cupom, carteira). Nenhuma tela junta o recibo com o catálogo
  vivo, então `price-changed` (ou qualquer alteração posterior) não reescreve um
  recibo — comportamento coberto por E2E.
- **Composição:** segue o frame “Confirmação de Pedido” de `nft img/` — cabeçalho
  de agradecimento com o status, faixa de quatro células (ID da transação,
  data, total, carteira), tabela “Detalhes da transação” (imagem, token,
  edições, subtotal), linhas de subtotal/desconto/taxa/total e o CTA do
  explorador. O link do explorador é **simulado** e rotulado como tal.
- **Acesso direto:** `/orders/$orderId` é privada (`requireSession`) e o handler
  responde `404` para id inexistente *ou* pedido de outra conta — a UI mostra o
  mesmo “Pedido não encontrado” nos dois casos, sem vazar existência.
- **Estados:** pendente faz o mesmo poll de 700 ms do checkout (`orderQueryOptions`)
  e para em `confirmed`/`declined`; o E2E abre o recibo ainda pendente e espera
  a transição sem criar outro pedido. `order.updated` (Seção 10) substituirá o
  poll por evento com a mesma semântica de terminal.
- **Histórico:** `/account/orders` lê `GET /api/orders` (apenas o escopo da
  sessão, mais recentes primeiro) com skeleton, vazio, erro com retry. Cada
  linha lê o snapshot gravado no pedido — status, data, total e primeira linha —
  e navega para o recibo. Ao chegar a um estado terminal, o painel do checkout
  invalida `['orders', escopo]` para a lista não ficar defasada.
- **Isolamento:** a query key é `['orders', escopo, id]`; logout/troca de usuário
  remove o escopo inteiro (`removeQueries(['orders'])`), então o cache do usuário
  anterior nunca atende o novo escopo.

## 13. Interface, responsividade e acessibilidade

- Tokens em `src/index.css` (`@theme`), base shadcn/ui; componentes da UI recebem a
  identidade do Figma via CSS variables, não via classes soltas.
- Breakpoints avaliados: 390, 768 e 1440; layouts de perfil, carteiras, carrinho e
  recibo têm desenho próprio em mobile (sem frame correspondente no Figma).
- Skeletons com shimmer preservam as dimensões do conteúdo e respeitam
  `prefers-reduced-motion`.
- Foco visível global, skip link no root, foco preso em dialog/drawer (Radix), erros
  associados por `aria-describedby`, feedback de mutação e de evento em `aria-live`.

### Evidências da Seção 12

- **Teclado/foco:** o controle global de foco visível vive em `src/index.css` (`:focus-visible`),
  e todos os controles interativos usam `focus-visible:ring`. Diálogos e drawers usam as
  travas do Radix (`src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`), que
  içam e devolvem o foco. Cartões do catálogo, galeria, comando de carteiras e o
  cabeçalho/rodapé usam `aria-label`/`aria-pressed` quando o texto do botão é um ícone ou
  uma ação compacta.
- **Formulários:** cada campo tem `<label>`/`htmlFor` + `aria-describedby` apontando para a
  descrição e para o erro, e `aria-invalid` quando o valor é inválido; a região de erro usa
  `role="alert"` (`src/components/ui/field.tsx` e os formulários de perfil, carteiras,
  auth e checkout). A troca de senha tem reautenticação e o erro de senha atual é
  tratado como feedback de campo.
- **`aria-live`:** a mutação que depende do tempo ou que pode falhar reporta o resultado por
  região `aria-live` (alertas inline no checkout/recibo, `role="status"` em skeletons e
  região visível) em vez de apenas um toast discreto.
- **Imagens:** imagens informative têm `alt` com nome/contexto (`NftCard`,
  `NftGallery`, recibo, perfil); thumbnails e repetições usam `alt=""` quando o contexto
  já descreve o item.
- **Responsividade:** perfil e carteiras têm layout próprio para mobile/tablet (sem frame no
  Figma), documentado em `ARCHITECTURE.md` → Layout mobile de perfil e carteiras; o restante
  do app foi verificado em 390/768/1440 sem overflow horizontal.

### Layout mobile de perfil e carteiras (Seção 11)

As telas de perfil (`/account/profile`) e carteiras (`/account/wallets`) não têm
frame no Figma, então o layout mobile foi definido arbitrariamente seguindo os
princípios do design system:

- **Perfil**: as abas Dados/Senha continuam (são o único caminho entre os dois
  formulários), ocupando a largura disponível e com rolagem horizontal se o
  texto crescer. O formulário é uma coluna única; o avatar com preview e o
  botão de remover empilham abaixo do campo de arquivo.
- **Carteiras**: lista em uma coluna, com os botões Editar/Remover em linha e
  quebra automática. O comando "Selecionar carteira…" é secundário e fica
  oculto abaixo de `md`; criar/editar abre o mesmo formulário em coluna única
  (`grid-cols-1 sm:grid-cols-2` para provedor e rede).

Ambos os layouts foram verificados em 390px (mobile) e 768px (tablet) para evitar
overflow horizontal e manter os elementos acessíveis.

## 14. Design system e assets (KURIO)

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

## 15. Limitações e desvios conhecidos

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
- **Checkout:** “Código de indicação” e “Nome ENS” são opcionais (o frame marca
  os dois como obrigatórios) para não bloquear a compra de quem não tem convite;
  a carteira registrada é selecionada à direita e os campos de endereço/tipo
  refletem a escolha, ficando editáveis só com “Usar outra carteira”.
- **Pedido:** a tela de recibo completa (`/orders/:orderId`) e o histórico
  (`/account/orders`) estão implementados na Seção 9; o checkout continua
  mostrando o resultado (pendente/confirmado/recusado) e linka o recibo.
- **Link de explorador:** o hash da transação é determinístico e o link aponta
  para o explorador da rede, mas é explicitamente rotulado como simulado — não
  existe transação on-chain.
