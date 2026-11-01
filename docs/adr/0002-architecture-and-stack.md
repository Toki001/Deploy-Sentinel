# ADR 0002: Architecture and Technology Stack

## Context

DeploySentinel is designed as a production-grade developer operations incident platform with deterministic event correlation and bounded read-only AI root cause investigation.

## Decision

1. **Monorepo Layout**: pnpm workspaces + Turborepo for strict boundary enforcement and shared packages.
2. **Web Console**: Next.js App Router with Tailwind CSS, accessible restrained palette, and typed API data transfer objects.
3. **API Service**: Fastify for low-overhead HTTP routing, raw webhook HMAC verification, and integrated GraphQL Yoga schema-first endpoint.
4. **Data Persistence**: PostgreSQL 16 with Drizzle ORM for type-safe relational queries and forward-only SQL migrations.
5. **AI Safety Architecture**:
   - Deterministic correlation engine updates state.
   - AI investigator is strictly bounded: read-only tools, maximum 4 tool calls, maximum 2 reasoning rounds, structured JSON output with verified evidence IDs.
   - Deterministic offline simulator as default provider; zero paid API dependency for portfolio execution.
