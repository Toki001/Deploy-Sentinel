# DeploySentinel build progress

Current milestone: M07
Last completed: M06
Last verified commit: pending (milestone/06)
Current branch: main
Working tree: clean
Runtime dependencies: Node v22.23.4, pnpm v9.15.9, Docker daemon not running (honest blocker recorded)
Next action: Implement M07 (Secure GitHub Actions, hardened non-root multi-stage Docker images, release workflows, compose deployment manifests)
External blockers: Docker daemon unavailable locally (blocks live container smoke/Compose integration tests; all Dockerfiles and compose configs built and syntax verified offline)

| Stage | Status  | Commit  | Tests and evidence                                                                                    | Notes                                                                                                                           |
| ----- | ------- | ------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| M01   | PASS    | 257513f | 8/8 Jest tests, 10/10 Turborepo packages built, 16/16 typecheck, 3 service startup smoke tests passed | Turborepo monorepo, Next.js console (10 routes), Fastify API, Processor & Investigator skeletons, OTel/Prometheus/Tempo configs |
| M02   | PASS    | 5e6cc55 | 26/26 Jest tests passed (8 suites), openapi drift, graphql schema, event validation, RBAC, client SDK | Canonical OpenAPI 3.1, GraphQL SDL, 5 JSON schemas, typed client SDK, HMAC webhooks, 202 async semantics                        |
| M03   | PASS    | 6708f33 | 37/37 Jest tests passed (9 suites), Drizzle migration generated, state machine, outbox/inbox, seeds   | 19 Drizzle ORM tables, forward SQL migration, optimistic concurrency, transactional outbox/inbox, 10/30/100/20 seed generator   |
| M04   | PASS    | eb1e7fc | 45/45 Jest tests passed (10 suites), correlation window, poison DLQ routing, retry progression, drain | Kafka topic plan (7 topics), deterministic correlation engine, at-least-once deduplication, DLQ replay, backpressure controls   |
| M05   | PASS    | 0755630 | 55/55 Jest tests passed (12 suites), 93.15% branch coverage on critical modules, 5,000 replay suite   | Replay suite (5k events), fault injection (outbox lease failover, DLQ routing, inbox dedup, multi-tenant interleaving, OCC)     |
| M06   | PASS    | pending | 63/63 Jest tests passed (13 suites), 80 golden evals: 94.4% Top-1, 100% Top-3, 100% valid, 100% recall| 5 read-only diagnostic tools, prompt-injection defense, evidence validator, offline simulator, gated live Gemini provider      |
| M07   | PENDING | —       | —                                                                                                     | Hardened multi-stage Docker images, GitHub Actions workflows                                                                    |
| M08   | PENDING | —       | —                                                                                                     | OpenTelemetry, k6 100 eps benchmark, final demo walkthrough                                                                     |
