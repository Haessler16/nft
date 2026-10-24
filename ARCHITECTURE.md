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
- Fluxos privados (`/checkout`, `/account/*`, `/orders/*`) serão protegidos em
  `beforeLoad`, redirecionando ao login com `redirect` no search param.

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

Atualização otimista obrigatória: favoritar (seção 6) — `onMutate` grava o estado
anterior, aplica o toggle, `onError` faz rollback e mostra feedback acessível,
`onSettled` reconcilia com a resposta do servidor.

## 6. Dinheiro

- ETH trafega como **string decimal** em todo o caminho (API, cache, componentes).
- Aritmética em `decimal.js` ([src/lib/money.ts](src/lib/money.ts)); `number` é usado
  apenas para quantidades, que são inteiras.
- A cotação da API (`/quote`) é a única fonte de verdade de subtotal, desconto, taxa de
  rede e total. O cliente não recalcula preços para exibir — apenas formata.
- Recibo é um snapshot do pedido: mudanças posteriores no catálogo não o alteram.

## 7. Mocks (MSW) e realtime simulado

- Serviço Worker em `public/mockServiceWorker.js`, iniciado por
  [src/mocks/index.ts](src/mocks/index.ts) somente quando `VITE_ENABLE_MOCKS=true`,
  antes do primeiro render; o worker é importado dinamicamente para não entrar no
  bundle quando os mocks estão desligados.
- Handlers compartilham os tipos de `contracts.ts` com a aplicação; o estado simulado
  é único entre catálogo, favoritos, carrinho, perfil, carteiras e pedidos, persistido
  em `localStorage` e restaurável por `resetDatabase()`.
- Cenários determinísticos (latência, 4xx/5xx, sessão expirada, conflito, cupom
  inválido, preço alterado, esgotado, timeout de pedido, pagamento recusado) são
  aplicados por configuração, sem código alternativo na UI.
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

## 9. Sessão e carrinho (decisões a fechar nas seções 4 e 7)

- Sessão: cookie `httpOnly`-simulado não é possível no MSW; a sessão será um cookie de
  fixture + `GET /api/session` como fonte de verdade, com o estado em cache do Query
  (`['session']`). Nada sensível em `localStorage`.
- Expiração (401) durante navegação: limpa sessão, guarda o destino atual e leva ao
  login; durante o checkout, o rascunho do pedido é preservado para retomada.
- Carrinho de visitante: chave `cart:guest`; no login, um `POST /cart/merge` combina
  com o carrinho do usuário (quantidade somada limitada à disponibilidade) e o escopo
  de visitante é descartado.

## 10. Interface, responsividade e acessibilidade

- Tokens em `src/index.css` (`@theme`), base shadcn/ui; componentes da UI recebem a
  identidade do Figma via CSS variables, não via classes soltas.
- Breakpoints avaliados: 390, 768 e 1440; layouts de perfil, carteiras, carrinho e
  recibo têm desenho próprio em mobile (sem frame correspondente no Figma).
- Skeletons com shimmer preservam as dimensões do conteúdo e respeitam
  `prefers-reduced-motion`.
- Foco visível global, skip link no root, foco preso em dialog/drawer (Radix), erros
  associados por `aria-describedby`, feedback de mutação e de evento em `aria-live`.

## 11. Limitações e desvios conhecidos

- Integrações reais de blockchain, carteira e pagamento estão fora do escopo: tudo é
  simulado e rotulado como demonstração no rodapé.
- Os assets do Figma ainda não foram incorporados; substituições e ajustes serão
  listados aqui e no README quando a seção 1 for executada.
- O service worker não intercepta requisições feitas antes da primeira ativação; o
  bootstrap espera `worker.start()` antes de renderizar para evitar esse estado.
