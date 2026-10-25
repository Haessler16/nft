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

Estado atual: `auth`, `nfts`, `favorites`, `cart`, `checkout`, `orders` e
`wallets` já têm contratos/endpoints/queries e componentes onde a seção aplica.
`profile` chega na Seção 11; realtime na Seção 10.

Features planejadas (ver [docs/PLAN.md](../../docs/PLAN.md)):

| Feature | Seção | Conteúdo |
| --- | --- | --- |
| `auth` | 4 | sessão, login, cadastro, guardas de rota |
| `nfts` | 5, 6 | catálogo, busca/filtros (feito); detalhe e galeria pendentes |
| `favorites` | 6 | favoritos com atualização otimista |
| `cart` | 7 | itens, quantidades, cupom, resumo |
| `checkout` | 8 | formulário, carteira/rede, revisão, idempotência (feito) |
| `orders` | 8, 9 | criação/consulta idempotente, recibo em `/orders/:id` e histórico (feito); `order.updated` na Seção 10 |
| `profile` | 11 | dados do colecionador, avatar, senha |
| `wallets` | 8, 11 | listagem e conexão simulada (feito); CRUD pendente |
| `realtime` | 10 | cliente Socket.IO, reconciliação, versões |
