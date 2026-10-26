# KURIO — NFT Marketplace (`nft`)

Marketplace de NFTs em React + TypeScript, construído a partir dos frames de
design em [`nft img/`](nft%20img) (identidade KURIO: fundo escuro, tipografia
monoespaçada e destaque âmbar). Catálogo, carrinho, checkout, recibo, conta e
carteiras funcionam com dados simulados.

O enunciado do desafio está em [BRIEF.md](BRIEF.md), o plano de execução em
[docs/PLAN.md](docs/PLAN.md) e as decisões técnicas em
[ARCHITECTURE.md](ARCHITECTURE.md).

> **Status:** fundação, design system, catálogo, autenticação/sessão, detalhe
> com favoritos, carrinho/cotação, checkout com pedido idempotente, recibo com
> histórico e conta (perfil, senha e carteiras) implementados (Seções 0–12).
> O que resta no plano é fechamento de qualidade — baselines visuais, zoom 200%
> manual, performance mobile e deploy (Seções 13–15). Nenhuma transação real é
> executada.

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
`test-results/` (ambos ignorados pelo git). A suíte cobre shell/catálogo
(`smoke`, `catalog`), detalhe/favoritos (`detail`), autenticação/sessão (`auth`),
carrinho/cotação (`cart`), checkout (`checkout`), recibo/histórico (`orders`) e
conta (`account`: perfil, senha, carteiras e isolamento entre contas). Cada spec
começa com `POST /api/__mock/reset` e roda nos três viewports configurados.

## Variáveis de ambiente

Documentadas em [.env.example](.env.example). **Nenhum `.env` é obrigatório
para rodar nem publicar**: `src/lib/env.ts` já liga os mocks por padrão, porque
não existe API real atrás de `/api/*`. Os arquivos locais
`.env.development`/`.env.production` são apenas overrides e ficam fora do git
(`.gitignore`) — a ausência deles em um clone/CI foi o que derrubou o primeiro
deploy em Vercel (build sem env → MSW desligado → 404 em toda rota `/api/*`).

| Variável | Padrão | Função |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | base do único cliente Axios (same-origin para o MSW interceptar) |
| `VITE_SOCKET_URL` | origem atual | origem usada pelo `socket.io-client` |
| `VITE_ENABLE_MOCKS` | `true` (ligado no código) | sobe o MSW antes do primeiro render; use `false` só para apontar a uma API real |
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
    cart/         contratos, endpoints, queries, cotação, cupom e tela do carrinho
    checkout/     schema do formulário, tela, revisão e painel do pedido
    favorites/    contratos, endpoints, queries e toggle otimista
    nfts/         contratos, endpoints, queries, busca ao vivo na URL e componentes
    orders/       contratos do snapshot, endpoints, query com poll, recibo e histórico
    profile/      contratos, schema, endpoints, mutations, leitura e edição do perfil
    wallets/      contratos, endpoints, CRUD da conta e simulação de conexão
  lib/            api (Axios + erros + tipos), query (client + keys + ensure), dinheiro, env
  mocks/          MSW: db, fixtures (nfts, usuários, cupons), handlers
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
| `/cart` | Carrinho (itens, quantidade, cupom, resumo da cotação) | **implementada** |
| `/checkout` | Pagamento: perfil, carteira/rede, revisão e pedido | **implementada** (**privada**) |
| `/orders/$orderId` | Confirmação / recibo completo (snapshot imutável) | **implementada** (**privada**) |
| `/account` → `/account/profile` | Perfil do colecionador (dados, avatar e senha) | **implementada** (**privada**) |
| `/account/wallets` | Carteiras: lista, cadastro, edição e remoção da secundária | **implementada** (**privada**) |
| `/account/orders` | Meus pedidos (histórico com estados) | **implementada** (**privada**) |
| `*` | 404 dentro do shell | implementado |

Rotas marcadas como **privadas** passam pela guarda de `beforeLoad`
([src/app/guards.ts](src/app/guards.ts)): sem sessão (ou com ela expirada) o
visitante vai para `/login?redirect=<destino>` e volta ao ponto original após
entrar.

## Estado na URL (catálogo)

Exemplo: `/?q=golden&categories=%5B%22Arte%20digital%22%5D&sort=price-asc&page=2`

- `q`, `categories[]`, `networks[]`, `min`, `max`, `sort`, `tab`, `page` compõem a
  requisição e a chave de cache; refresh e navegação pelo histórico preservam tudo.
- A busca do cabeçalho é **em tempo real com debounce** (350 ms): digitar atualiza
  `?q=` sem Enter e sem um request por tecla; Enter ou o botão "Buscar" aplica na
  hora. Digitar dentro do catálogo substitui a entrada no histórico (sem poluir o
  "voltar"), enquanto o primeiro salto de outra tela preserva o retorno.
- Filtros são combináveis e qualquer mudança de filtro volta para `page=1`.
- Abas: `todos` (ordenação escolhida), `novos` (listados recentemente) e `alta`
  (maior preço) — proxies documentados em `ARCHITECTURE.md`.

## Carrinho e cotação

- `/cart?coupon=KURIO10` — o cupom aplicado mora na URL: refresh, "voltar" e
  link compartilhado reproduzem a mesma cotação. O código é confirmado em
  `POST /api/coupons/validate` **antes** de entrar na URL (inválido/expirado
  aponta o campo e não substitui um resumo que já estava certo).
- Duas leituras, dois papéis: `GET /api/cart` traz as linhas (imagem, nome,
  edição, disponibilidade) e `GET /api/quote` traz todo o dinheiro (unitário,
  linha, subtotal, desconto, taxa de rede, total) do **snapshot explícito** de
  itens — nenhum total é calculado na tela.
- A chave da cotação é `['quote', escopo, fingerprint(itens+cupom)]`
  ([src/features/cart/fingerprint.ts](src/features/cart/fingerprint.ts)):
  mudar a quantidade gera uma nova entrada (fetch novo) sem invalidar a atual,
  então os números antigos ficam na tela até os novos chegarem.
- O badge do cabeçalho compartilha o cache do carrinho (`useCartCount`), por
  escopo de sessão: o carrinho do visitante é mesclado na conta no login e o
  contador acompanha a troca.

## Checkout, carteiras e pedidos

- `/checkout` (privada) segue o frame de Pagamento: perfil do colecionador em
  duas colunas, itens, valores, carteira/rede e a ação principal.
- **Carteiras:** `GET /api/wallets` traz as carteiras registradas da conta
  (seed: uma principal e uma secundária). A conexão é simulada pelo handler
  (`POST /api/wallets/connect`): MetaMask assina Ethereum/Polygon, Coinbase
  Wallet Ethereum/Solana e WalletConnect as três. Escolher Solana com MetaMask
  é a forma determinística de ver a **recusa** (“não assina na rede”);
  `Desconectar` encerra a conexão, e trocar de rede exige conectar de novo.
- **Revisão:** “Revisar pedido” abre o snapshot (dados, carteira, itens, taxas,
  total). “Confirmar compra” revalida `GET /api/quote`: se o total mudou, o
  botão vira “Confirmar novo total” e **nada é enviado** até um segundo clique;
  se uma edição esgotou, a compra é bloqueada e o carrinho precisa ser ajustado.
- **Idempotência:** a `Idempotency-Key` é criada e persistida antes do POST
  (`kurio:checkout:key:<escopo>`, vinculada ao fingerprint de itens + cupom +
  total). Clique repetido e Enter duplo são barrados; timeout/rede recupera o
  pedido por `GET /api/orders/by-key/:key` antes de qualquer novo envio. Mesma
  chave + conteúdo diferente responde `409`, então nunca nasce um segundo pedido.
- **Estados:** `pending` → `confirmed` ou `declined` (terminais). O painel
  consulta `GET /api/orders/:id` a cada 700 ms enquanto pendente e para no
  estado final. Confirmado baixa o estoque, remove **só as quantidades
  compradas** do carrinho e mostra hash/explorador simulados; recusado preserva
  os itens e oferece voltar ao carrinho.
- **Retomada:** recarregar `/checkout` reabre o pedido ativo
  (`kurio:checkout:order:<escopo>`) em vez de um carrinho vazio. “Fazer outro
  pedido” limpa o registro. Sessão expirada no envio leva a
  `/login?redirect=/checkout`, sem criar pedido.
- Valores do recibo são o **snapshot** gravado na criação: mudanças posteriores
  no catálogo não alteram um pedido existente.

## Conta: perfil, senha e carteiras

- `/account/profile` (privada) é a tela "Meu perfil": lê nome, e-mail, bio e
  avatar do escopo da sessão e alterna entre os painéis **Dados** e **Senha**.
  "Editar perfil" abre o formulário com os valores confirmados; o avatar é um
  upload simulado (preview imediato) e só sai do formulário depois que o
  `PUT /api/profile` responde. Salvar invalida perfil **e** sessão, então o nome
  no cabeçalho acompanha a edição sem reload.
- **Senha:** `POST /api/profile/password` exige a senha atual (reautenticação).
  Senha atual errada e nova senha fraca voltam no envelope da API com o campo
  culpado, e o formulário mostra o erro sob o input (`aria-invalid` +
  `aria-describedby`). A troca válida limpa o formulário e o login seguinte já
  aceita a nova senha.
- `/account/wallets` (privada) lista as carteiras da conta com provedor, rede e
  o selo Principal/Secundária. "Nova carteira" cadastra uma nova; "Editar" abre
  o mesmo formulário em modo de edição; "Remover" (somente na secundária)
  confirma em diálogo antes do `DELETE`. O servidor garante uma única principal
  e o endereço precisa casar com `0x` + 40 hexadecimais.
- **Provedor × rede:** MetaMask assina Ethereum/Polygon, Coinbase Wallet
  Ethereum/Solana e WalletConnect as três. A combinação não suportada é recusada
  tanto no formulário quanto no handler, com a mesma mensagem.
- **Isolamento:** perfil e carteiras usam chaves prefixadas pelo escopo da
  sessão; logout/troca de usuário removem o escopo privado. O E2E cobre a
  diferença entre as contas demo (Ava e Noah).

## Dados simulados

- O estado vive em [src/mocks/db.ts](src/mocks/db.ts), é persistido em
  `localStorage` e compartilhado por todos os handlers.
- `POST /api/__mock/reset` restaura o seed determinístico (30 NFTs, 9 categorias,
  3 redes, 5 páginas, 2 contas demo, carteiras e lista de pedidos vazia). Os
  testes E2E chamam esse endpoint a cada cenário.
- Handlers atuais: catálogo (`GET /api/nfts`, `GET /api/nfts/:nftId`), sessão
  (`GET /api/session`, `POST /api/auth/{login,register,logout}`), favoritos
  (`GET|PUT|DELETE /api/favorites[/:nftId]`), carrinho (`GET /api/cart`,
  `POST /api/cart/items`, `PATCH|DELETE /api/cart/items/:nftId`), cotação e
  cupons (`GET /api/quote`, `POST /api/coupons/validate`), carteiras
  (`GET /api/wallets`, `POST /api/wallets`, `PUT|DELETE /api/wallets/:id`,
  `POST /api/wallets/connect`), perfil e senha (`GET|PUT /api/profile`,
  `POST /api/profile/password`), pedidos
  (`POST /api/orders`, `GET /api/orders` (histórico), `GET /api/orders/:id`,
  `GET /api/orders/by-key/:key`) e
  controle dos mocks (`GET /api/health`, `POST /api/__mock/reset`,
  `POST /api/__mock/scenario`). A tabela completa está em
  [ARCHITECTURE.md](ARCHITECTURE.md).
- **Cenários** (`VITE_MOCK_SCENARIO` no boot, ou `POST /api/__mock/scenario`
  `{ "scenario": "…" }` em runtime, sem reload):

  | Cenário | Efeito |
  | --- | --- |
  | `default` | seed determinístico, respostas normais |
  | `flaky` | mutações de favorito respondem `503 UNAVAILABLE` (testa rollback) |
  | `session-expired` | `GET /api/session` revoga a sessão ativa com `401` (guarda leva ao login preservando o destino) |
  | `price-changed` | preços do catálogo +10% a partir do seed e a cotação devolve `alerts: ["price-changed"]` (banner no carrinho) |
  | `sold-out` | nenhuma unidade disponível: quantidade bloqueada, cotação devolve `alerts: ["availability-changed"]` |
  | `payment-declined` | o pedido é criado e liquida em `declined` (nada é cobrado, carrinho preservado) |
  | `order-timeout` | o primeiro POST cria o pedido e responde `504` (resposta perdida); a recuperação por chave de idempotência devolve o mesmo pedido |

  `price-changed` e `sold-out` alteram **os dados** no `db` (semente +
  transformação), então catálogo, detalhe, carrinho e cotação sempre mostram os
  mesmos números. `flaky` também derruba o handshake da carteira (`503`).

  Fluxos determinísticos para demonstrar: `?coupon=KURIO10` no carrinho;
  `price-changed` aplicado com o diálogo de revisão aberto (novo total exige
  confirmação); `payment-declined` antes de confirmar; `order-timeout` antes de
  confirmar; Solana + MetaMask no checkout para a recusa da carteira.

## Assets e design

- Cores, tipografia (Archivo Narrow para display, Courier Prime para UI) e
  proporções foram extraídas dos frames em [`nft img/`](nft%20img).
- O artwork vive em [`public/nfts/`](public/nfts): quatro retratos vieram dos PNGs
  em alta resolução na raiz de `public/` (não referenciados diretamente) e os demais
  foram recortados dos frames — ver substituições em
  [ARCHITECTURE.md](ARCHITECTURE.md#assets-e-substituições).
- Ícones de redes sociais são glifos rotulados (o ícone de marca não existe no
  conjunto usado) e não são links.

## Acessibilidade e performance

Lighthouse 12.8.2 sobre o build de produção (`npm run preview`) com os mocks no
cenário `default`; mediana de 3 execuções, macOS 27.0 / Apple M1 Pro / Chrome
156 / Node 22.14.0:

| Página | Perfil | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | desktop | 98 | 100 | 96 | 100 | 0,98 s | 0 | 0 ms |
| Início | mobile | 78 | 100 | 93 | 100 | 4,37 s | 0,001 | 15 ms |
| Detalhe | desktop | 99 | 100 | 96 | 100 | 0,93 s | 0 | 0 ms |
| Detalhe | mobile | 78 | 100 | 96 | 100 | 4,43 s | 0 | 20 ms |

**Acessibilidade:** 100 nas quatro combinações (Lighthouse), somada aos três
viewports do E2E (390/768/1440). A inspeção manual em zoom 200% ainda não foi
feita.

**Mobile:** o LCP de ~4,4 s vem do *load delay* (~3,2 s) porque a demo só
renderiza depois de `worker.start()` do MSW e do chunk do browser (~470 KB).
Pré-carregar o hero não melhorou o LCP (revertido). Melhorar isso exige rever o
bootstrap dos mocks — registrado como pendência na Seção 14 do plano.

Para reproduzir:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx lighthouse http://127.0.0.1:4173/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --preset=desktop --output=json --output-path=/tmp/kurio-home.json
```

## Documentação

- [BRIEF.md](BRIEF.md) — enunciado do desafio
- [docs/PLAN.md](docs/PLAN.md) — seções, entregáveis e critérios de aceite
- [ARCHITECTURE.md](ARCHITECTURE.md) — contratos, sessão, carrinho, cache, realtime
- [src/features/README.md](src/features/README.md) — convenções por feature
