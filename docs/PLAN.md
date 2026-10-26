# Plano de execução — NFT Marketplace

Divisão do enunciado ([BRIEF.md](../BRIEF.md)) em seções executáveis, na ordem de
dependência. Cada seção tem objetivo, entregáveis e critério de aceite verificável.

**Legenda:** `[x]` concluído · `[ ]` pendente

---

## Seção 0 — Fundação e ferramental ✅

**Objetivo:** projeto executável com a stack obrigatória instalada e os pontos de
extensão no lugar, sem nenhuma tela de negócio ainda.

- [x] Vite + React 19 + TypeScript (strict), alias `@/*`, `tsc -b` como typecheck
- [x] TanStack Router por arquivos (`src/routes`, plugin gera `routeTree.gen.ts`)
- [x] TanStack Query com `QueryClient` único e política de cache/retry documentada
- [x] Axios como único cliente HTTP, com normalização de erro para `ApiError`
- [x] Tailwind CSS v4 + shadcn/ui (radix) com os componentes base instalados
- [x] MSW instalado + `public/mockServiceWorker.js` + bootstrap condicionado por env
- [x] Socket.IO client e `@mswjs/socket.io-binding` instalados (integração na seção 10)
- [x] Playwright configurado (desktop 1440, tablet 768, mobile 390) + smoke test
- [x] Lighthouse instalado como dependência de desenvolvimento
- [x] `.env.example` / `.env.development` com mocks ligados
- [x] Esqueleto de rotas de todas as telas obrigatórias + 404 + error boundary
- [x] `README.md`, `ARCHITECTURE.md`, `docs/PLAN.md`

**Aceite:** `npm run typecheck`, `npm run lint` e `npm run build` passam; `npm run dev`
serve a home; rota inexistente cai no 404 estilizado.

---

## Seção 1 — Design system e shell da aplicação

**Objetivo:** traduzir o Figma em tokens (cor, tipografia, raio, sombra, espaçamento)
e no shell que todas as telas compartilham.

- [x] Auditar os frames e extrair tokens; preencher `src/index.css` (`:root` do tema)
- [x] Fontes locais via `@fontsource` (Archivo Narrow + Courier Prime, sem CDN)
- [x] Componentes base adaptados: `Button`, `Input`, `Label`, `Badge`, `Card`,
      `Sheet`, `Skeleton` (demais herdam os tokens)
- [x] `SiteHeader` (desktop + menu mobile em Sheet + busca), `SiteFooter`
- [x] `NftCardSkeleton` + `NftGridSkeleton` com shimmer e `prefers-reduced-motion`
- [x] `DetailSkeleton` (chegou com a seção 6)
- [x] `SummarySkeleton` (chegou com a seção 7,
      `src/features/cart/components/summary-skeleton.tsx`)
- [x] Breadcrumb compartilhado (`src/components/layout/breadcrumb.tsx`, usado no
      detalhe; carrinho e checkout entram na mesma trilha nas seções 7–8)
- [x] Estados de vazio e erro no catálogo, com retry e `aria-live` de atualização
- [x] Foco visível global, skip link no root
- [x] Smoke responsivo em 390 / 768 / 1440 pelo Playwright (sem overflow na home)

**Aceite:** shell navegável por teclado em três larguras; nenhum texto/foco
inacessível; tokens centralizados (sem cor hardcoded em componentes).

**Depende de:** Seção 0.

---

## Seção 2 — Dados simulados (MSW)

**Objetivo:** uma única fonte de verdade simulada, na camada de rede, usada por
desenvolvimento, demonstração e testes.

- [x] Fixtures de catálogo: 30 NFTs determinísticos (9 categorias, 3 redes, 3 séries,
      artwork local) — `src/mocks/fixtures/nfts.ts`
- [x] Fixtures de usuários: 2 contas demo determinísticas derivadas das
      credenciais — `src/mocks/fixtures/users.ts`
- [x] Fixtures de cupons (2 válidos + 1 expirado) — `src/mocks/fixtures/coupons.ts`
- [x] Fixtures de carteiras (principal + secundária por conta)
- [x] Pedidos: criados em runtime pelo handler (snapshot no `db`), sem fixture fixa
- [x] `src/mocks/db.ts`: estado único persistido em `localStorage` + `resetDatabase()`
      exposto em `POST /api/__mock/reset` (usado pelos testes)
- [x] Handlers de catálogo: `GET /api/nfts` (busca/filtros/ordenação/paginação/facets)
      e `GET /api/nfts/:nftId` (404 do contrato)
- [x] Handlers de sessão/conta (`GET /api/session`, login, registro, logout),
      favoritos e carrinho
- [x] Handlers REST restantes: cotação (`GET /api/quote`) e cupons
      (`POST /api/coupons/validate`) — `handlers/quote.ts`
- [x] Handlers de pedidos (`POST /api/orders` idempotente, `GET /api/orders`
      (histórico), `GET /:id`, `GET /by-key/:key`)
- [x] Handlers de carteiras (`GET /api/wallets`, `POST /api/wallets/connect`)
- [x] Handlers REST restantes: perfil e CRUD de carteiras — `handlers/profile.ts`,
      `handlers/wallets.ts` (Seção 11)
- [x] Envelope de erro único (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`,
      `NOT_FOUND`, `CONFLICT`, `UNAVAILABLE`, `INTERNAL`) em `handlers/envelope.ts`
- [ ] Cenários determinísticos selecionáveis por env/console:
      `default`, `slow`, `empty`, `flaky`, `session-expired`, `conflict`,
      `coupon-invalid`, `price-changed`, `sold-out`, `order-timeout`,
      `payment-declined` (prontos: `default`, `flaky`, `session-expired`,
      `price-changed`, `sold-out`, `order-timeout`, `payment-declined` — os dois
      de preço/disponibilidade alteram os dados no `db`, então catálogo,
      detalhe, carrinho e cotação concordam entre si)
- [ ] Latência variável e respostas fora de ordem; falhas de conexão e 5xx
- [x] Reset de cenário sem reload (`POST /api/__mock/scenario`) + documentação dos
      cenários implementados no README

**Aceite:** cada cenário é reproduzível a partir de um reset conhecido; nenhum dado
fictício em componentes/hooks/axios.

**Depende de:** Seção 0.

---

## Seção 3 — Contratos REST e camada de dados

**Objetivo:** contratos tipados compartilhados entre transporte, MSW, Query e UI.

- [x] `ApiError` + envelope + mapeamento Axios → `ApiError`
- [x] Tipos base (`EthAmount` string, `Quantity` inteiro, `Paginated`, meta)
- [x] Fábrica de query keys com escopo por usuário
- [x] `contracts.ts` por feature: `auth`, `nfts`, `favorites`, `cart`, `quote`,
      `orders`, `profile`, `wallets`
- [x] Funções de endpoint (Axios) por feature, todas recebendo `signal`
      (`auth`, `nfts`, `favorites`, `cart`, `orders`, `profile`, `wallets`)
- [x] Query options/mutations reutilizáveis (`queryOptions`, `mutationOptions`)
- [x] Invalidação padronizada após mutation (carrinho, favoritos, pedido)
- [ ] Invalidação/integração após evento de socket (Seção 10)
- [x] Documentar tabela de endpoints no `ARCHITECTURE.md`

**Aceite:** nenhuma resposta HTTP é tipada como `any`; o mesmo tipo é usado pelo
handler MSW, pela função de endpoint e pelo componente.

**Depende de:** Seções 0, 2.

---

## Seção 4 — Autenticação e sessão

**Objetivo:** conta e sessão completas, com recuperação após refresh e isolamento
por usuário.

- [x] `SessionProvider` + query de sessão (`GET /session`), cookie simulado
- [x] Login (validação, erro da API, `redirect` de retorno ao fluxo anterior)
- [x] Cadastro (validação, conflito de e-mail, força de senha)
- [x] Guarda de rotas privadas via `beforeLoad` (`/checkout`, `/account/*`, pedidos)
- [x] Expiração durante navegação e durante checkout, preservando o destino
      (cenário `session-expired` + E2E)
- [x] Logout: limpa cache privado (`queryClient.removeQueries` por escopo) e
      subscriptions; troca de usuário não vaza dados
- [x] Credenciais fictícias documentadas (`src/features/auth/demo.ts` + README)

**Aceite:** refresh mantém a sessão; sessão expirada leva ao login sem perder o
carrinho; dois usuários nunca compartilham favoritos/carrinho/pedidos.

**Depende de:** Seções 1, 3.

---

## Seção 5 — Início: destaques, catálogo e busca

**Objetivo:** descoberta com estado 100% na URL.

- [x] Busca (`q`), filtros combináveis (categoria, rede, faixa de preço),
      ordenação e paginação em search params validados com zod
- [x] Reset de página ao mudar filtro; URL sobrevive a refresh e histórico
- [x] Grid do catálogo com `NftCard`, abas de visão e “NFT em destaque” na coluna
      de filtros (composição do frame de Início)
- [x] Estados: skeleton, vazio, erro com retry e atualização em background
- [x] Cancelamento por `signal` e `keepPreviousData` (sem respostas fora de ordem)
- [x] Filtros em disclosure no mobile (o frame mobile não define drawer)
- [x] Busca com debounce em tempo real (`useCatalogSearch`, 350 ms: um request
      por pausa, Enter/Botão descarta o timer e navega na hora)

**Aceite:** combinação de filtros + ordenação + página recarregável e compartilhável;
requisição reflete exatamente os parâmetros da URL.

**Depende de:** Seções 1, 3.

---

## Seção 6 — Detalhe do NFT e favoritos

- [x] Galeria (imagem principal + thumbnails), informações, coleção, criador,
      cadeia/rede, edição e escassez
- [x] Acesso direto por URL, 404 para NFT inexistente, estado de edição esgotada
- [x] Seletor de quantidade limitado pela disponibilidade
- [x] Favoritar com **atualização otimista + rollback** em falha
- [x] Adicionar ao carrinho a partir do detalhe
- [x] Favoritos persistem para o usuário autenticado (visitante é convidado a entrar)
- [ ] `nft.updated` refletindo preço/disponibilidade no detalhe

**Aceite:** link direto funciona em produção (fallback SPA); favorito falho volta ao
estado anterior com feedback acessível.

**Depende de:** Seções 4, 5.

---

## Seção 7 — Carrinho e cotação

- [x] Estado do carrinho por usuário + carrinho de visitante preservado no login
      (merge determinístico, sem duplicar item)
- [x] Adicionar/alterar quantidade/remover respeitando disponibilidade por NFT
      (stepper limitado por `available`; handler responde 409)
- [x] Cupom: aplicar, remover, inválido/expirado (`POST /api/coupons/validate`
      antes de escrever `?coupon=` na URL)
- [x] Resumo (subtotal, desconto, taxa de rede, total) vindo da cotação da API
      (`GET /api/quote` com snapshot explícito dos itens)
- [x] Aritmética em ETH com `decimal.js` (strings decimais, sem float)
      (`src/lib/money.ts`, inclusive `percentOf` para o desconto)
- [x] Carrinho sobrevive a refresh; badge do header sincronizado
      (cache por escopo de sessão, `useCartCount` no cabeçalho)
- [x] Preço/disponibilidade alterados durante a sessão atualizam o resumo e sinalizam
      cotação desatualizada (cenários `price-changed` e `sold-out` → `alerts` na
      cotação; transporte por socket chega na seção 10)

**Aceite:** nenhum total calculado localmente como fonte de verdade; item esgotado
não pode ser comprado.

**Depende de:** Seções 4, 6.

---

## Seção 8 — Checkout, carteiras e pedido idempotente

- [x] Formulário do colecionador (validação zod + erros da API mapeados por campo)
- [x] Seleção de carteira cadastrada + rede, com simulação de conexão, recusa e
      desconexão (`POST /api/wallets/connect`)
- [x] Revisão antes do envio (snapshot do pedido em diálogo com foco controlado)
- [x] Revalidação de preço, disponibilidade, cupom e taxas; mudanças exigem nova
      confirmação explícita (`Confirmar novo total`) e o servidor também recusa
      `expectedTotal` divergente
- [x] `POST /orders` com `Idempotency-Key` persistida; cliques repetidos e reenvio
      após timeout recuperam o mesmo pedido (recuperação por `by-key` antes de
      qualquer novo POST; mesma chave + conteúdo diferente → `409`)
- [x] Estados pendente / confirmado / recusado, com recuperação após refresh ou
      reconexão (poll só enquanto pendente; pedido ativo persistido por escopo)
- [x] Falha preserva itens; sucesso remove só o que foi comprado (baixa de
      estoque e remoção de quantidade no `db` ao confirmar)
- [x] Sessão expirada no envio volta ao login com `/checkout` como destino

**Aceite:** impossível confirmar com cotação desatualizada; impossível criar dois
pedidos pelo mesmo fluxo; recusa não gera recibo confirmado.

**Verificação:** `e2e/checkout.spec.ts` cobre compra completa, clique repetido,
preço alterado durante a revisão, pagamento recusado, timeout com recuperação,
recusa de rede pela carteira, validação do formulário e sessão expirada.

**Depende de:** Seção 7.

---

## Seção 9 — Pedido, recibo e histórico

- [x] Recibo a partir do snapshot do pedido (imutável após mudanças no catálogo)
      — `OrderReceipt` renderiza só o que foi congelado na criação
- [x] Identificação da transação, links de exploração simulados, itens, taxas,
      total — meta de 4 células + tabela “Detalhes da transação” do frame
- [x] Página de pedido acessível por URL (`/orders/$orderId`), terminal quando
      confirmado/recusado; pendente faz poll até o estado final; id inexistente
      ou de outro usuário responde `404` sem vazar existência
- [x] Histórico de pedidos na conta (`/account/orders`) via `GET /api/orders`,
      com skeleton, vazio, erro com retry e isolamento por sessão
- [ ] `order.updated` atualizando a tela e liberando a confirmação
      (chega na Seção 10; hoje o poll do `orderQueryOptions` entrega o mesmo
      comportamento pelo REST)

**Aceite:** refresh no recibo mantém valores originais; pedido de outro usuário
retorna `FORBIDDEN`/404.

**Verificação:** `e2e/orders.spec.ts` cobre histórico vazio→lista→recibo,
      imutabilidade do snapshot após `price-changed`, transição
      pendente→confirmado pelo recibo sem duplicar pedido, recibo recusado sem
      transação, isolamento entre contas + id inexistente e acesso direto sem
      sessão (retorno ao login).

**Depende de:** Seção 8.

---

## Seção 10 — Tempo real (Socket.IO)

- [ ] Servidor simulado via `@mswjs/socket.io-binding` dentro do service worker;
      transporte real `socket.io-client` (sem atalhos para o cache)
- [ ] Eventos `nft.updated` e `order.updated` com `resourceId`, `version`,
      `occurredAt`
- [ ] Descarte de duplicatas e eventos fora de ordem (versão monotônica por recurso)
- [ ] Reconciliação REST após reconexão; listeners liberados no unmount/logout
- [ ] Eventos namespaced por usuário; sessão anterior não atualiza outro usuário
- [ ] Cenário do enunciado: NFT no carrinho muda de preço → banner + resumo
      atualizado → checkout bloqueia cotação antiga
- [ ] Interrupção de conexão com pedido pendente → retomada sem nova compra
- [ ] Documentar transporte e limitações do mock

**Aceite:** mutar o catálogo nos mocks dispara REST + socket coerentes; abrir duas
abas reflete a mudança em tempo real.

**Depende de:** Seções 2, 3, 9.

---

## Seção 11 — Conta: perfil e carteiras

- [x] Perfil: nome, bio, e-mail, avatar (upload simulado com preview), persistência
- [x] Alteração de senha com validação e reautenticação
- [x] Carteiras: principal e secundária, cadastro/edição, validação de endereço/rede,
      remoção do secundário
- [x] Todos os formulários com erros de campo associados (`aria-describedby`)
- [x] Layout mobile dedicado (sem frame no Figma) documentado no `ARCHITECTURE.md`

**Entregáveis:** `src/features/profile/*`, `src/features/wallets/*`,
`src/routes/account.profile.tsx`, `src/routes/account.wallets.tsx`,
`src/mocks/handlers/profile.ts`, `src/mocks/handlers/wallets.ts`.

**Comportamento fechado nesta seção:**

- o editor de perfil só fecha depois do `PUT /api/profile`; um e-mail inválido
  mantém o formulário aberto com o erro sob o campo;
- salvar o perfil invalida `['profile', escopo]` **e** `['session']`, então o nome
  do cabeçalho acompanha a edição;
- o avatar escolhido entra no formulário como `avatarUrl` (data URL) e é
  persistido; removê-lo também é persistido;
- a senha atual errada volta no envelope da API com `fields.currentPassword` e é
  exibida sob o input, não como toast genérico; a troca válida permite o login
  seguinte com a nova senha;
- o CRUD de carteiras é feito pelo mesmo formulário (criar/editar), com botões
  de submit próprios; "Remover" só aparece na secundária e confirma em diálogo;
- o servidor mantém **uma única carteira principal** por conta e deriva
  `supportedNetworks` do provedor escolhido;
- perfil e carteiras usam o escopo da sessão e são removidos no logout, sem
  vazar dados entre as duas contas demo.

**Verificação automatizada:** `e2e/account.spec.ts` cobre rota privada +
retorno pós-login, leitura/edição persistida do perfil, validação de e-mail,
senha atual errada, troca de senha com novo login, lista/criação/edição/remoção
de carteiras e isolamento entre Ava e Noah. Roda nos três viewports.

**Aceite:** alterações confirmadas permanecem após refresh; usuário B não vê
dados do usuário A; `e2e/account.spec.ts` passa nos três projetos do Playwright.

**Depende de:** Seção 4.

---

## Seção 12 — Acessibilidade e responsividade (transversal, fechamento)

- [x] Varredura de teclado em todos os fluxos (tab order, foco em dialog/drawer,
      retorno de foco ao fechar)
- [x] Labels, `aria-invalid`, mensagens de erro vinculadas, landmarks e headings
- [x] `alt` para imagens relevantes, contraste AA, estados não só por cor
- [x] `aria-live` para mutações e eventos de tempo real
- [ ] Zoom 200% sem perda de conteúdo; sem overflow horizontal — os layouts são
      verificados em 390/768/1440 pelo E2E, mas a inspeção manual em zoom 200%
      segue pendente
- [x] `prefers-reduced-motion` nos skeletons e animações
- [x] Documentar substituições de assets e ajustes em relação ao Figma
- [x] Varredura automatizada (Lighthouse/axe) sem violações críticas — A11y 100
      nas quatro combinações medidas (detalhes na Seção 14)

**Entregáveis evidenciados no código:**

- Teclado: foco visível global em `:focus-visible` (`src/index.css`),
  diálogos/drawers com trap e retorno de foco (Radix em
  `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`), controles
  interativos com `focus-visible:ring` e `aria-label`/`aria-pressed` quando o
  rótulo visual é genérico (`NftCard`, `NftGallery`, `WalletCommand`, cabeçalho
  e rodapé).
- Formulários com `<label>`/`htmlFor`, `aria-invalid`, erros vinculados por
  `aria-describedby` e `role="alert"` (`src/components/ui/field.tsx`,
  `src/features/profile`, `src/features/wallets`, `src/features/auth`, checkout).
  O painel de abas do perfil usa `role="tablist"`/`role="tab"`/`role="tabpanel"`.
- Ações do catálogo/banner com `aria-live` (`cart`, `favorites`, `orders`,
  checkout e perfil usam toast/região ou `role="status"`).
- Imagens com `alt` informativo no detalhe e nos cards; thumbnails e repetições
  usam `alt=""` quando o contexto já descreve o item (`NftCard`, `NftGallery`,
  recibo, perfil).
- Responsividade documentada: perfil e carteiras têm layout próprio em
  mobile/tablet (sem frame no Figma), verificado em 390/768 para evitar overflow
  (`ARCHITECTURE.md` → Layout mobile de perfil e carteiras).

**Aceite:** fluxos completos navegáveis só por teclado; formulários e ações de
mutação com feedback acessível; layouts em 390/768/1440 sem overflow; Lighthouse
sem violações de acessibilidade. Pendência explícita: inspeção manual em zoom 200%.

---

## Seção 13 — Testes E2E (Playwright)

- [x] Estado isolado por teste (`POST /api/__mock/reset` antes de cada cenário)
- [x] Fluxos principais em desktop, tablet e mobile (projetos Chromium da config)
- [x] Cenários determinísticos de falha: `flaky`, `session-expired`,
      `price-changed`, `sold-out`, `payment-declined`, `order-timeout`
- [x] Traces/vídeos de falha + relatório HTML (`playwright-report/`)
- [ ] Regressão visual com baselines versionadas
- [ ] Controle de relógio/latência nas asserções sensíveis a tempo

**Cobertura atual (8 specs):**

| Spec | Fluxos |
| --- | --- |
| `smoke.spec.ts` | shell, home e 404 em três viewports |
| `catalog.spec.ts` | busca ao vivo na URL, filtros, ordenação e paginação |
| `detail.spec.ts` | galeria, quantidade, favoritos otimistas e rollback |
| `auth.spec.ts` | login, cadastro, logout e retorno por `redirect` |
| `cart.spec.ts` | linhas, cotação, cupom na URL e cenários de preço/disponibilidade |
| `checkout.spec.ts` | revisão, mudança de total, recusa da carteira e idempotência |
| `orders.spec.ts` | recibo imutável, histórico, pedido recusado e isolamento |
| `account.spec.ts` | perfil, senha, CRUD de carteiras e isolamento entre contas |

**Aceite:** `npm run test:e2e` verde a partir de checkout limpo. Baselines
visuais e controle de relógio continuam pendentes; os cenários de tempo são
determinísticos por dados (`price-changed`, `sold-out`, `order-timeout`) em vez
de relógio falso.

**Depende de:** Seções 5–12.

---

## Seção 14 — Performance e Lighthouse

**Escopo definido (não é código de aplicação):** medir o build de produção
servido por `npm run preview` com os mocks ativos, em duas páginas (início e
detalhe) e dois perfis (mobile e desktop), três execuções por combinação. O
resultado é uma tabela de medianas com ambiente e versão das ferramentas.

- [x] Build de produção + preview com cenário `default`
- [x] Procedimento reproduzível: 3 medições por página (início, detalhe) × mobile/desktop
- [ ] Metas: Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 90 (mediana) — desktop
      dentro das metas; mobile fica em Perf 78 e BP 93 (ver leitura abaixo)
- [ ] Relatórios HTML/JSON versionados + LCP/CLS/TBT e justificativas
- [ ] Otimizações de imagem/fonte com impacto medido (antes/depois) — o
      robots.txt + canonical absoluto foram medidos (SEO 85 → 100); imagens
      ainda não têm comparação antes/depois

**Como executar:**

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173   # mantém MSW ativo
npx lighthouse http://127.0.0.1:4173/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --preset=desktop --output=json --output-path=docs/reports/home-desktop-1.json
# repetir 3× por página/perfil, incluindo
# http://127.0.0.1:4173/nfts/nft_004 e --form-factor=mobile
```

**Medições (26/10/2026, mediana de 3 execuções):**

| Página | Perfil | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | desktop | 98 | 100 | 96 | 100 | 0,98 s | 0 | 0 ms |
| Início | mobile | 78 | 100 | 93 | 100 | 4,37 s | 0,001 | 15 ms |
| Detalhe | desktop | 99 | 100 | 96 | 100 | 0,93 s | 0 | 0 ms |
| Detalhe | mobile | 78 | 100 | 96 | 100 | 4,43 s | 0 | 20 ms |

**Ambiente:** macOS 27.0, Apple M1 Pro, Node 22.14.0, Lighthouse 12.8.2,
Chrome 156.0.8078.47; build de produção em `vite preview`
(`127.0.0.1:4173`, mocks no cenário `default`).

**Leitura:**

- **Acessibilidade fecha a Seção 12:** 100 nas quatro combinações, sem
  violações críticas; o zoom 200% manual continua pendente.
- **SEO:** 100 após adicionar `public/robots.txt` e trocar o canonical relativo
  por um absoluto derivado da origem; o ganho (85 → 100) foi medido.
- **Desktop:** Perf 98/99, BP 96 — dentro das metas.
- **Mobile:** Perf 78 e BP 93 abaixo da meta. O LCP de ~4,4 s é dominado pelo
  *load delay* (~3,2 s): a demonstração só renderiza depois que o MSW termina
  `worker.start()` e o chunk do browser (≈470 KB) carrega. Pré-carregar a imagem
  do hero moveu o tempo de load para render delay sem reduzir o LCP, então foi
  revertido. O BP mobile desconta os erros esperados de rede do demo (sondagem
  `GET /api/session` sem sessão e tentativas de WebSocket antes do MSW assumir).
  A otimização real exige rever o bootstrap dos mocks ou separar o shell do
  chunk de MSW — fora do escopo destas correções.

**Dados ainda necessários:** relatórios HTML/JSON versionados e a comparação
antes/depois de imagens (WebP/`srcset`). Até lá, os números acima são os únicos
que o projeto deve declarar.

**Aceite:** tabela de medianas no README com ambiente e versões das ferramentas.

**Depende de:** Seção 12.

---

## Seção 15 — Deploy e entrega

- [ ] Deploy (Vercel/Netlify/Cloudflare Pages) com mocks e socket ativos
- [ ] Rewrite SPA para acesso direto e refresh em qualquer rota
- [ ] Confirmar que a versão publicada corresponde ao código entregue
- [ ] README final: setup, env, credenciais fictícias, cenários, comandos, reprodução
      dos fluxos de falha
- [ ] `ARCHITECTURE.md` final: contratos, eventos, sessão, carrinho, cache,
      reconciliação REST ↔ Socket.IO, limitações e desvios do Figma
- [ ] Autoauditoria contra a rubrica da seção 11 do enunciado

**Depende de:** Seções 13 e 14.

**Aceite:** checklist de 12 itens da rubrica com evidência apontada.
