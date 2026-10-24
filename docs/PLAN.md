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

- [ ] Auditar o Figma e extrair tokens; preencher `src/index.css` (`:root` do tema)
- [ ] Fontes locais via `@fontsource` (sem CDN), fallback documentado
- [ ] Componentes base adaptados: `Button`, `Input`, `Card`, `Badge`, `Dialog`,
      `Sheet`/`Drawer`, `Select`, `Tabs`, `Pagination`
- [ ] `SiteHeader` (desktop + mobile com drawer), `SiteFooter`, breadcrumb
- [ ] Skeletons com shimmer reutilizáveis (`NftCardSkeleton`, `DetailSkeleton`,
      `SummarySkeleton`) respeitando `prefers-reduced-motion`
- [ ] Componentes de estado: `EmptyState`, `ErrorState`, `InlineError`, `AsyncBoundary`
- [ ] Foco visível global, skip link, `aria-live` para feedback de mutação
- [ ] Verificação em 390 / 768 / 1440 sem overflow horizontal

**Aceite:** shell navegável por teclado em três larguras; nenhum texto/foco
inacessível; tokens centralizados (sem cor hardcoded em componentes).

**Depende de:** Seção 0.

---

## Seção 2 — Dados simulados (MSW)

**Objetivo:** uma única fonte de verdade simulada, na camada de rede, usada por
desenvolvimento, demonstração e testes.

- [ ] Fixtures: ~40 NFTs (categorias, coleções, preços variados, edições/epósio,
      imagens locais), 2 usuários, cupons válido/expirado, carteiras
- [ ] `src/mocks/db.ts`: estado consistente entre catálogo, favoritos, carrinho,
      perfil, carteiras e pedidos + persistência em `localStorage` + `resetDatabase()`
- [ ] Handlers REST: sessão/conta, NFTs (list + detail), favoritos, carrinho,
      cotação, pedidos (idempotência), perfil, carteiras
- [ ] Envelope de erro único (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`,
      `NOT_FOUND`, `CONFLICT`, `UNAVAILABLE`, `INTERNAL`)
- [ ] Cenários determinísticos selecionáveis por env/console:
      `default`, `slow`, `empty`, `flaky`, `session-expired`, `conflict`,
      `coupon-invalid`, `price-changed`, `sold-out`, `order-timeout`,
      `payment-declined`
- [ ] Latência variável e respostas fora de ordem; falhas de conexão e 5xx
- [ ] Reset de cenário sem reload + documentação dos cenários no README

**Aceite:** cada cenário é reproduzível a partir de um reset conhecido; nenhum dado
fictício em componentes/hooks/axios.

**Depende de:** Seção 0.

---

## Seção 3 — Contratos REST e camada de dados

**Objetivo:** contratos tipados compartilhados entre transporte, MSW, Query e UI.

- [x] `ApiError` + envelope + mapeamento Axios → `ApiError`
- [x] Tipos base (`EthAmount` string, `Quantity` inteiro, `Paginated`, meta)
- [x] Fábrica de query keys com escopo por usuário
- [ ] `contracts.ts` por feature: `auth`, `nfts`, `favorites`, `cart`, `quote`,
      `orders`, `profile`, `wallets`
- [ ] Funções de endpoint (Axios) por feature, todas recebendo `signal`
- [ ] Query options/mutations reutilizáveis (`queryOptions`, `mutationOptions`)
- [ ] Invalidação padronizada após mutation e após evento de socket
- [ ] Documentar tabela de endpoints no `ARCHITECTURE.md`

**Aceite:** nenhuma resposta HTTP é tipada como `any`; o mesmo tipo é usado pelo
handler MSW, pela função de endpoint e pelo componente.

**Depende de:** Seções 0, 2.

---

## Seção 4 — Autenticação e sessão

**Objetivo:** conta e sessão completas, com recuperação após refresh e isolamento
por usuário.

- [ ] `SessionProvider` + query de sessão (`GET /session`), cookie simulado
- [ ] Login (validação, erro da API, `redirect` de retorno ao fluxo anterior)
- [ ] Cadastro (validação, conflito de e-mail, força de senha)
- [ ] Guarda de rotas privadas via `beforeLoad` (`/checkout`, `/account/*`, pedidos)
- [ ] Expiração durante navegação e durante checkout, preservando o destino
- [ ] Logout: limpa cache privado (`queryClient.removeQueries` por escopo) e
      subscriptions; troca de usuário não vaza dados
- [ ] Credenciais fictícias documentadas

**Aceite:** refresh mantém a sessão; sessão expirada leva ao login sem perder o
carrinho; dois usuários nunca compartilham favoritos/carrinho/pedidos.

**Depende de:** Seções 1, 3.

---

## Seção 5 — Início: destaques, catálogo e busca

**Objetivo:** descoberta com estado 100% na URL.

- [ ] Busca com debounce, `q`, filtros combináveis (`category`, `collection`,
      faixa de preço), ordenação e paginação — tudo em search params validados
- [ ] Reset de página ao mudar filtro; URL sobrevive a refresh e histórico
- [ ] Seção de destaques (curadoria) + grid do catálogo com `NftCard`
- [ ] Estados: loading (skeleton), vazio, erro com retry, atualização em background
- [ ] Descarte de respostas fora de ordem e cancelamento por `signal`
- [ ] Filtros e ordenação em drawer no mobile

**Aceite:** combinação de filtros + ordenação + página recarregável e compartilhável;
requisição reflete exatamente os parâmetros da URL.

**Depende de:** Seções 1, 3.

---

## Seção 6 — Detalhe do NFT e favoritos

- [ ] Galeria (imagem principal + thumbnails), informações, coleção, criador,
      cadeia/rede, edição e escassez
- [ ] Acesso direto por URL, 404 para NFT inexistente, estado de edição esgotada
- [ ] Seletor de quantidade limitado pela disponibilidade
- [ ] Favoritar com **atualização otimista + rollback** em falha
- [ ] Adicionar ao carrinho a partir do detalhe
- [ ] Favoritos persistem para o usuário autenticado (visitante é convidado a entrar)
- [ ] `nft.updated` refletindo preço/disponibilidade no detalhe

**Aceite:** link direto funciona em produção (fallback SPA); favorito falho volta ao
estado anterior com feedback acessível.

**Depende de:** Seções 4, 5.

---

## Seção 7 — Carrinho e cotação

- [ ] Estado do carrinho por usuário + carrinho de visitante preservado no login
      (merge determinístico, sem duplicar item)
- [ ] Adicionar/alterar quantidade/remover respeitando disponibilidade por NFT
- [ ] Cupom: aplicar, remover, inválido/expirado
- [ ] Resumo (subtotal, desconto, taxa de rede, total) vindo da cotação da API
- [ ] Aritmética em ETH com `decimal.js` (strings decimais, sem float)
- [ ] Carrinho sobrevive a refresh; badge do header sincronizado
- [ ] Preço/disponibilidade alterados durante a sessão atualizam o resumo e sinalizam
      cotação desatualizada

**Aceite:** nenhum total calculado localmente como fonte de verdade; item esgotado
não pode ser comprado.

**Depende de:** Seções 4, 6.

---

## Seção 8 — Checkout, carteiras e pedido idempotente

- [ ] Formulário do colecionador (validação zod + erros da API)
- [ ] Seleção de carteira cadastrada + rede, com simulação de conexão, recusa e
      desconexão
- [ ] Revisão antes do envio (snapshot do pedido)
- [ ] Revalidação de preço, disponibilidade, cupom e taxas; mudanças exigem nova
      confirmação explícita
- [ ] `POST /orders` com `Idempotency-Key` persistida; cliques repetidos e reenvio
      após timeout recuperam o mesmo pedido
- [ ] Estados pendente / confirmado / recusado, com recuperação após refresh ou
      reconexão
- [ ] Falha preserva itens; sucesso remove só o que foi comprado

**Aceite:** impossível confirmar com cotação desatualizada; impossível criar dois
pedidos pelo mesmo fluxo; recusa não gera recibo confirmado.

**Depende de:** Seção 7.

---

## Seção 9 — Pedido, recibo e histórico

- [ ] Recibo a partir do snapshot do pedido (imutável após mudanças no catálogo)
- [ ] Identificação da transação, links de exploração simulados, itens, taxas, total
- [ ] Página de pedido acessível por URL, terminal quando confirmado/recusado
- [ ] Histórico de pedidos na conta
- [ ] `order.updated` atualizando a tela e liberando a confirmação

**Aceite:** refresh no recibo mantém valores originais; pedido de outro usuário
retorna `FORBIDDEN`/404.

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

- [ ] Perfil: nome, bio, e-mail, avatar (upload simulado com preview), persistência
- [ ] Alteração de senha com validação e reautenticação
- [ ] Carteiras: principal e secundária, cadastro/edição, validação de endereço/rede,
      remoção do secundário
- [ ] Todos os formulários com erros de campo associados (`aria-describedby`)
- [ ] Layout mobile dedicado (sem frame no Figma) documentado no `ARCHITECTURE.md`

**Aceite:** alterações confirmadas permanecem após refresh; usuário B não vê dados
do usuário A.

**Depende de:** Seção 4.

---

## Seção 12 — Acessibilidade e responsividade (transversal, fechamento)

- [ ] Varredura de teclado em todos os fluxos (tab order, foco em dialog/drawer,
      retorno de foco ao fechar)
- [ ] Labels, `aria-invalid`, mensagens de erro vinculadas, landmarks e headings
- [ ] `alt` para imagens relevantes, contraste AA, estados não só por cor
- [ ] `aria-live` para mutações e eventos de tempo real
- [ ] Zoom 200% sem perda de conteúdo; sem overflow horizontal
- [ ] `prefers-reduced-motion` nos skeletons e animações
- [ ] Documentar substituições de assets e ajustes em relação ao Figma

**Aceite:** axe/Lighthouse sem violações críticas; fluxos completos só com teclado.

---

## Seção 13 — Testes E2E (Playwright)

- [ ] 12 cenários do enunciado, cada um com estado isolado (`resetDatabase` via API
      de teste dos mocks)
- [ ] Fluxos principais em desktop e mobile (Chromium)
- [ ] Regressão visual de início, detalhe, carrinho e pagamento com baselines
- [ ] Controle de relógio/latência nas asserções sensíveis a tempo
- [ ] Traces de falha + relatório HTML versionado por comando

**Aceite:** `npm run test:e2e` verde a partir de checkout limpo; testes de tempo real
passando pelo `socket.io-client` e de REST pelos handlers MSW.

**Depende de:** Seções 5–11.

---

## Seção 14 — Performance e Lighthouse

- [ ] Build otimizado + preview com cenário padrão
- [ ] Script reproduzível: 3 medições por página (início, detalhe) × mobile/desktop
- [ ] Metas: Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 90 (mediana)
- [ ] Relatórios HTML/JSON versionados + LCP/CLS/TBT e justificativas
- [ ] Otimizações de imagem/fonte com impacto medido (antes/depois)

**Aceite:** tabela de medianas no README com ambiente e versões das ferramentas.

**Depende de:** Seção 13.

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

**Aceite:** checklist de 12 itens da rubrica com evidência apontada.
