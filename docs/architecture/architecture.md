# DeploySentinel Architecture Overview

```mermaid
flowchart TD
  Ingress[Webhook / Ingress Clients] -->|HMAC Signed| API[Fastify API :4000]
  API -->|Transactional Outbox| PG[(PostgreSQL 16)]
  OutboxPublisher[Outbox Worker] -->|Poll & Lease| PG
  OutboxPublisher -->|Publish| Redpanda[(Redpanda Kafka)]
  Redpanda -->|Consume Normalized Events| Processor[Correlation Processor :4001]
  Processor -->|Idempotent Inbox & State Machine| PG
  Web[Next.js Incident Console :3000] -->|REST & GraphQL| API
  Web -->|Trigger Investigation| API
  API -->|Queue Job| Investigator[AI Investigator :4002]
  Investigator -->|Read-Only Diagnostic Tools| PG
  Investigator -->|Offline / Cloud LLM Adapter| AIModel[Bounded AI Provider]
```

## Core Components

- **apps/web**: Next.js App Router incident operations console.
- **services/api**: Fastify REST API and GraphQL Yoga endpoint handling authentication, ingress webhooks, and state queries.
- **services/processor**: Kafka stream processor correlating deployments, error spikes, and alerts into deterministic incident state transitions.
- **services/investigator**: Bounded read-only diagnostic agent executing structured root-cause hypotheses with verified evidence citations.
- **packages/shared**: Common utilities, environment validation, HMAC cryptography, structured logging, and errors.
- **packages/contracts**: Canonical OpenAPI 3.1 specification, GraphQL schema, and versioned JSON Schema event envelopes.
- **packages/db**: Drizzle ORM schemas, database migrations, connection pool, and synthetic seed datasets.
- **packages/ai**: Provider adapters, read-only diagnostic tool registry, and golden evaluation suite.
- **packages/telemetry**: OpenTelemetry tracing, Prometheus metrics registry, and log correlation.
