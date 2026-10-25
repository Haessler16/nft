# Features

Código de negócio vive em features. Cada feature é uma fatia vertical e só se
comunica com outras através de `src/lib` (transporte, query keys, dinheiro) ou de
componentes genéricos em `src/components`.

```
features/<feature>/
  api/
    contracts.ts     # tipos do contrato REST (compartilhados com os handlers MSW)
    endpoints.ts     # funções Axios tipadas, todas recebendo `signal`
    queries.ts       # queryOptions / mutationOptions do TanStack Query
  components/        # componentes da feature
  hooks/             # estado derivado, formulários, orquestração
  index.ts           # superfície pública (o resto é interno)
```

Regras:

- nenhum dado fictício, `setTimeout` ou resposta hardcoded: tudo vem de `/api`
  (MSW na camada de rede);
- nenhum componente importa `axios` diretamente — apenas `endpoints.ts`;
- chaves de cache sempre vêm de `src/lib/query/keys.ts` (escopo por usuário);
- ETH nunca é `number`: entra e sai como string decimal, aritmética em `decimal.js`.

Estado atual: `nfts` já tem `api/contracts.ts`, `api/endpoints.ts`, `api/queries.ts`,
`catalog-search.ts` (estado na URL) e os componentes do catálogo/home. As demais
features chegam nas seções do plano.

Features planejadas (ver [docs/PLAN.md](../../docs/PLAN.md)):

| Feature | Seção | Conteúdo |
| --- | --- | --- |
| `auth` | 4 | sessão, login, cadastro, guardas de rota |
| `nfts` | 5, 6 | catálogo, busca/filtros (feito); detalhe e galeria pendentes |
| `favorites` | 6 | favoritos com atualização otimista |
| `cart` | 7 | itens, quantidades, cupom, resumo |
| `checkout` | 8 | formulário, carteira/rede, idempotência |
| `orders` | 9 | recibo imutável, histórico, estado do pedido |
| `profile` | 11 | dados do colecionador, avatar, senha |
| `wallets` | 11 | carteira principal e secundária |
| `realtime` | 10 | cliente Socket.IO, reconciliação, versões |
