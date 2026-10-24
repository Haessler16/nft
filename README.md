# NFT Market — desafio frontend

Marketplace de NFTs em React + TypeScript com dados simulados: catálogo, detalhe,
carrinho, checkout, recibo, conta e carteiras. O enunciado original está preservado
em [BRIEF.md](BRIEF.md); o plano de execução em [docs/PLAN.md](docs/PLAN.md); as
decisões técnicas em [ARCHITECTURE.md](ARCHITECTURE.md).

> **Status:** estrutura inicial concluída (seção 0 do plano). As telas ainda são
> placeholders navegáveis — cada uma lista os comportamentos obrigatórios que serão
> implementados na seção correspondente. Nada aqui executa transações reais.

## Stack

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface / linguagem | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Roteamento | TanStack Router (file-based, search params tipados) |
| Estado remoto | TanStack Query |
| Cliente HTTP | Axios |
| Tempo real | Socket.IO (`socket.io-client`) |
| Estilização | Tailwind CSS v4 |
| Componentes | shadcn/ui (Radix) |
| Mocking | MSW (+ `@mswjs/socket.io-binding` para os eventos) |
| Testes E2E e regressão visual | Playwright |
| Performance | Lighthouse |

## Setup

Requisitos: Node.js 22+ e npm 10+ (o projeto usa `package-lock.json`).

```bash
npm ci                # instala as dependências travadas no lockfile
npx playwright install chromium   # uma vez, para os testes E2E
npm run dev           # http://localhost:5173 com MSW ativo
```

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm run dev` | desenvolvimento com mocks (`.env.development`) |
| `npm run build` | gera rotas, typecheck e build de produção |
| `npm run preview` | serve o build de produção (mocks ativos via `.env.production`) |
| `npm run typecheck` | `tsc -b` sem emitir |
| `npm run lint` | oxlint |
| `npm run format` | oxlint `--fix` |
| `npm run routes:generate` | regenera `src/routeTree.gen.ts` a partir de `src/routes` |
| `npm run test:e2e` | Playwright (desktop 1440, tablet 768, mobile 390) |
| `npm run test:e2e -- --project=chromium-mobile` | apenas um viewport |

O relatório HTML dos testes fica em `playwright-report/`; traces, vídeos e
screenshots de falha em `test-results/` (ambos ignorados pelo git).

## Variáveis de ambiente

Configuradas em [.env.example](.env.example). Os arquivos `.env.development` e
`.env.production` versionados já habilitam os mocks, porque a aplicação publicada é
a demonstração.

| Variável | Padrão | Função |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | base do único cliente Axios (same-origin para o MSW interceptar) |
| `VITE_SOCKET_URL` | origem atual | origem usada pelo `socket.io-client` |
| `VITE_ENABLE_MOCKS` | `false` (ligado nos `.env` versionados) | sobe o MSW antes do primeiro render |
| `VITE_MOCK_SCENARIO` | `default` | cenário determinístico de mocks |

## Estrutura

```
src/
  app/          providers globais, router, contexto tipado
  components/   layout (header/footer), feedback (404, erro, placeholder) e ui/ (shadcn)
  features/     código de negócio por domínio (ver src/features/README.md)
  lib/          api (axios + erros + tipos), query (client + keys), dinheiro, env
  mocks/        MSW: handlers, fixtures, cenários (seção 2 do plano)
  routes/       rotas file-based; routeTree.gen.ts é gerado
e2e/            testes Playwright
docs/           PLAN.md
```

## Rotas

| Rota | Tela | Status |
| --- | --- | --- |
| `/` | Início (destaques, catálogo, busca) | placeholder |
| `/nfts/$nftId` | Detalhe do NFT | placeholder |
| `/cart` | Carrinho | placeholder |
| `/checkout` | Pagamento | placeholder |
| `/orders/$orderId` | Confirmação / recibo | placeholder |
| `/login` | Login | placeholder |
| `/register` | Cadastro | placeholder |
| `/account` → `/account/profile` | Perfil do colecionador | placeholder |
| `/account/wallets` | Carteiras | placeholder |
| `/account/orders` | Meus pedidos | placeholder |
| `*` | 404 dentro do shell | pronto |

## Credenciais fictícias

Serão definidas junto com o mock de sessão (seção 4 do plano) e documentadas aqui,
com os mesmos valores usados pelas fixtures e pelos testes.

## Mocks, cenários e tempo real

A camada de mocks roda no service worker (`public/mockServiceWorker.js`), então
componentes, hooks e o cliente Axios nunca contêm dados fictícios. O seed, os
cenários (`default`, `slow`, `empty`, `flaky`, `session-expired`, `conflict`,
`coupon-invalid`, `price-changed`, `sold-out`, `order-timeout`, `payment-declined`)
e o reset serão entregues na seção 2; os eventos Socket.IO na seção 10. Esta seção
será completada com o passo a passo para reproduzir cada fluxo de falha.

## Documentação

- [BRIEF.md](BRIEF.md) — enunciado do desafio
- [docs/PLAN.md](docs/PLAN.md) — seções de trabalho, entregáveis e critérios de aceite
- [ARCHITECTURE.md](ARCHITECTURE.md) — contratos, sessão, carrinho, cache, realtime
- [src/features/README.md](src/features/README.md) — convenções por feature
