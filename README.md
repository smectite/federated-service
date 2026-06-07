# Federated GraphQL + REST Microservice

A TypeScript monorepo: two **Apollo Federation 2** subgraphs (each exposing both
**GraphQL and REST**) composed into a **supergraph** served by the **Apollo Router**.
Built on Node.js + Express. Backed by **DynamoDB** (data), **Redis Cluster** (cache),
and **Kafka** (events). Deployable to **AWS Fargate** via Terraform.

## Architecture

```
                         ┌──────────────────────┐
   client ──/graphql──▶  │   Apollo Router      │  (supergraph)
                         └───────┬──────────┬────┘
                                 │          │
                    ┌────────────▼──┐   ┌───▼───────────┐
                    │ users subgraph│   │ orders subgraph│
                    │ /graphql /api │   │ /graphql /api  │
                    └──────┬────────┘   └───────┬────────┘
                           │  shared service/repo layer  │
                           └──────────────┬──────────────┘
                          DynamoDB  ·  Redis Cluster  ·  Kafka
```

- **`users`** owns the `User` entity (`@key(fields: "id")`).
- **`orders`** owns `Order` and **extends `User`** with `orders: [Order!]!`, so a
  single supergraph query resolves a user from one subgraph and their orders from
  the other.
- REST (`/api/...`) and GraphQL resolvers both call the **same service layer** —
  no duplicated logic.

## Layout

| Path | Purpose |
|---|---|
| `packages/core` | Shared config (zod), logger (pino), Dynamo/Redis/Kafka clients, Express+Apollo server factory, health checks |
| `services/users` | Users subgraph (schema, resolvers, REST, service, repo, Dockerfile) |
| `services/orders` | Orders subgraph (Order + User extension) |
| `supergraph.yaml` / `router.yaml` | rover composition + router config (local) |
| `router.aws.yaml` / `Dockerfile.router` | production router image |
| `docker-compose.yml` | full local stack |
| `infra/terraform` | AWS Fargate deployment |

## Run locally

```sh
npm install
docker compose up --build
```

The router comes up at <http://localhost:4000>. Subgraphs: `:4001` (users),
`:4002` (orders).

### Try it

```sh
# REST: create a user, then an order for them
curl -s -XPOST localhost:4001/api/users -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
# → {"id":"<uid>","name":"Ada","email":"ada@example.com"}

curl -s -XPOST localhost:4002/api/orders -H 'content-type: application/json' \
  -d '{"userId":"<uid>","total":42.0}'

# GraphQL federation join through the router:
curl -s localhost:4000/ -H 'content-type: application/json' -d '{
  "query":"query($id:ID!){ user(id:$id){ name email orders { id total } } }",
  "variables":{"id":"<uid>"}
}'
```

`user` is resolved by the **users** subgraph; `orders` is stitched in from the
**orders** subgraph — one response.

## Test

```sh
npm test          # vitest: service logic + federation resolvers + schema build
npm run lint
npm run build
```

## Deploy to AWS Fargate

See [`infra/terraform/README.md`](infra/terraform/README.md). Summary: build &
push the two subgraph images + a router image (with `supergraph.graphql` baked
in) to ECR, then `terraform apply`. Router is public behind an ALB; subgraphs are
private with Cloud Map DNS discovery.

## Out of scope (future)

- AuthN/AuthZ (`@authenticated` needs GraphOS Enterprise at the router).
- Managed GraphOS schema registry (local `rover` compose used here).
- OpenTelemetry tracing beyond basic JSON logs.
