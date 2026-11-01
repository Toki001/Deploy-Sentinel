# DeploySentinel

> **Autonomous Incident Correlation & Bounded Diagnostic Platform**

DeploySentinel is a production-style, synthetic-data-first incident investigation platform for engineering teams. It ingests verified deploy webhooks, error signals, and telemetry summaries, deterministically correlates them into stable incident records, and allows an on-call engineer to invoke a **bounded, read-only AI investigation** that ranks root causes with verified evidence IDs and explicit uncertainty.

---

## Key Features

- **Deterministic Correlation Engine**: Outbox pattern with at-least-once streaming and exactly-once business effects via database inbox deduplication.
- **Bounded Read-Only AI Investigator**: Strictly capped diagnostic loop (max 4 tool calls, 2 reasoning rounds, 3 hypotheses) with evidence citation validation and abstention.
- **Contract-First Architecture**: OpenAPI 3.1 REST specification, schema-first GraphQL Yoga SDL, and versioned JSON Schema event contracts.
- **Accessible Operations Console**: Next.js App Router UI with restrained slate/navy styling, semantic status badges, keyboard navigation, and dark mode tokens.
- **Full-Stack Observability Ready**: OpenTelemetry SDK instrumentation, Prometheus metrics, Grafana Tempo tracing, and Grafana dashboard templates.

---

## Monorepo Layout

```text
deploysentinel/
├── apps/
│   └── web/                   # Next.js incident console (:3000)
├── services/
│   ├── api/                   # Fastify REST + GraphQL Yoga API (:4000)
│   ├── processor/             # Kafka correlation worker (:4001)
│   └── investigator/          # Bounded read-only AI diagnostic worker (:4002)
├── packages/
│   ├── contracts/             # OpenAPI, GraphQL, JSON Schema contracts
│   ├── generated/             # Machine-generated typed clients
│   ├── db/                    # Drizzle ORM schema, migrations, connection
│   ├── ai/                    # AI providers, read-only diagnostic tools, evals
│   ├── telemetry/             # OpenTelemetry tracing and metrics
│   └── shared/                # Cryptography (HMAC), error hierarchy, logger
├── scripts/
│   ├── event-generator/       # Deterministic synthetic event generator
│   └── scenarios/             # Offline incident simulation scenarios
└── infra/                     # Docker Compose, OTel collector, Grafana configs
```

---

## Quickstart (Offline / Synthetic Mode)

```bash
# 1. Install dependencies
pnpm install

# 2. Build packages
pnpm build

# 3. Run unit and contract tests
pnpm test

# 4. Generate synthetic events
pnpm generate:events

# 5. Start development servers
pnpm dev
```

Navigate to `http://localhost:3000` to access the operations console.

---

## Non-Goals & Safety Guardrails

DeploySentinel **never**:

- Deploys code, modifies infrastructure, or executes automated rollbacks.
- Sends shell commands or opens arbitrary HTTP sockets from the AI runtime.
- Treats AI hypotheses as authoritative diagnoses without human review.
- Requires paid cloud AI credentials to run offline synthetic simulations.
