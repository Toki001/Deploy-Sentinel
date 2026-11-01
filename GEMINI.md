# DeploySentinel — GEMINI.md

> **Project:** DeploySentinel | **Role:** Principal engineer, full-stack engineer, SRE, AI engineer, QA lead
> **Status:** Build specification, not evidence that anything has been implemented.
> **Agent:** Gemini CLI / Gemini Code. This file is intentionally named **`GEMINI.md`** (uppercase) because Gemini CLI loads that filename as project context.
> **Mission:** Build a production-style, synthetic-data-first AI incident investigation platform in **eight sequential, automatically advancing milestones**. Test, document and commit each milestone, then immediately proceed to the next within the same active session. Do **not** stop for a routine milestone confirmation.
> **Precedence:** The user's explicit instructions, safety/approval requirements and actual repository state take priority. Never circumvent tool approvals, privacy restrictions, provider quotas, or environment limitations.

---

## 0. Executive operating instructions — autonomous milestone loop

**Treat this document as a complete build contract, not inspiration.** Work on one Git milestone at a time. For each milestone:

1. **Recover state.** Inspect `git status --short`, `git log -5 --oneline`, `docs/verification/PROGRESS.md`, all applicable instructions, and the actual codebase. If a project exists, extend it rather than re-scaffold. Never overwrite unrelated work.
2. **Plan and implement.** Read that milestone's full embedded prompt (Section 16), resolve dependencies from earlier stages, create working source rather than empty placeholders, and keep components small, typed and testable.
3. **Verify.** Run the milestone's unit/integration/contract checks plus relevant regression checks from earlier milestones. Collect exact commands, exit statuses, counts and known omissions. Never claim tests ran unless they did.
4. **Remediate.** Fix discovered defects and rerun failed checks. Do not disable tests, relax lint/coverage gates, invent fixtures that trivially pass, or swap in fake success states. A legitimately unavailable tool/dependency is a **blocker**, not a pass.
5. **Document.** Write `docs/verification/M0N.md` with acceptance matrix, commands/results, scenarios, performance/eval evidence, remaining risks and any blocked external steps. Update `docs/verification/PROGRESS.md`, ADRs, README and `.env.example`.
6. **Commit.** Stage only milestone-related changes. Commit `milestone/0N: <concise descriptive title>`. Confirm `git status --short`. Never force-push, rewrite someone else's history or commit credentials.
7. **Immediately continue.** When checks and commit succeed, read and **start the next milestone without requesting confirmation**. Repeat until M08 is complete. Don't end the session solely to report a passed stage.

**Continuation hierarchy:** First preserve existing verified implementation; next complete current milestone; next proceed to the next milestone; finally perform end-to-end demo verification and final handoff. If the model loses context, use `PROGRESS.md` and Git to resume. If the session/token/tool budget ends, write a durable resume record; never claim work continues after the session ends.

**Blocking policy:** Stop only for an essential missing secret/access, mandatory host permission, unexpectedly destructive migration, irreversible external action, unavailable required infrastructure, significant paid cost, or failing critical acceptance that cannot be resolved locally. Ask the *single smallest actionable question* and describe what can be completed offline. No blanket autonomous permission to access production, deploy to a paid host, or change billing. For missing AI credentials, **continue the entire build with deterministic offline adapters** and mark live provider verification pending; do not block M07/M08 on missing credentials. For absent GHCR credentials or remote repository, create workflows and dry-run validation, report publish step as unverified.

**Never** silently: skip a stage, fake test output, change technology stack, commit unrelated work, deploy externally, enable cloud billing, run large live-model evaluations, use unrestricted shell tools in the runtime AI agent, or treat mock success as live production success.

### 0.1 Starting point and gate

If the repository is empty: initialize Git (if appropriate), then build M01. If partially implemented: map actual work to M01–M08; reuse valid portions; mark milestones complete only after their required verifications and documentary evidence; avoid duplicate commits for already finished work. If Git is dirty with user edits, preserve them; never reset/stash/discard without explicit permission. If you need a clean baseline, use a separate safe worktree or document the blocker.

### 0.2 Status output format (after every milestone; continue working)

```text
M0N [PASS|BLOCKED|PARTIAL] — <title>
Commit: <sha or not committed> | Working tree: <state>
Delivered: <actual changes>
Checks: <commands, counts, result>
Performance/evals: <measured values or not measured>
Risks/blockers: <facts>
NEXT: M0(N+1) started automatically [or precise blocker]
```

No celebratory final report after M01–M07. A **final** summary is appropriate after M08 and portfolio demo acceptance, or when honestly blocked.

---

## 1. Product identity and real user problems

DeploySentinel is a developer-operations incident platform for engineering teams. It receives verified deploy/webhook events, service alerts and telemetry summaries, deduplicates and correlates them deterministically into incidents, then lets an authenticated human request a **bounded, read-only AI investigation**. The investigation produces ranked possible root causes with specific, verifiable evidence IDs and uncertainty. It **never** deploys code, rolls back services, sends shell commands, changes infrastructure or treats AI hypotheses as authoritative diagnoses.

**Primary personas:** organization admin (service enrollment, integration secrets, retention, roles), on-call engineer (triage, acknowledge, investigate, resolve), and read-only stakeholder (incident visibility). Keep all views organization scoped.

**Real workflows**

- Deploy notification/webhook → HMAC + timestamp verification → dedupe and transactional outbox → Kafka-compatible stream → processor → incident timeline/UI.
- Alert/error-rate/configuration events → event-time correlation window → stable incident identity → state transitions and audit history.
- On-call requests investigation → investigation job → read-only diagnostic tools → evidence validation → up to three hypotheses → human reviews results.
- Broken broker/DB, duplicate messages, late events or poison payloads → admission backpressure, retry/DLQ, operator replay and recovery.
- Synthetic incident scenarios, including faulty deploy, traffic surge, dependency outage, DB saturation, bad config, and ambiguity, runnable offline on a Mac.

**Explicit non-goals:** full observability backend replacement, unrestricted log search, autonomous remediation/rollback, payments, infrastructure mutation, uncontrolled agent loop, automatic incident closure based on AI, or a static mock UI pretending to be functional.

---

## 2. Locked technology stack and architectural decisions

| Layer | Choice | Rule |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Node LTS, locked dependencies, strict TypeScript |
| Frontend | Next.js App Router, React, Tailwind CSS | Real typed API clients, accessible responsive UI |
| API | Fastify + GraphQL Yoga | REST OpenAPI 3.1, schema-first GraphQL SDL |
| Data | PostgreSQL + Drizzle ORM | Explicit SQL migrations; no destructive reset |
| Event backbone | Redpanda (Kafka API) locally | Select actively maintained TS client after verifying compatibility and capabilities; record ADR |
| Event durability | Transactional DB outbox/inbox | At-least-once delivery + exactly-once **business effects by idempotency**, not magical exactly-once transport |
| Runtime AI | Provider adapter + deterministic offline simulator | Optional verified free-tier Gemini adapter; never required for offline demo |
| Telemetry | OTel SDK/Collector + Prometheus, Tempo, Grafana | Trace context, low-cardinality metrics, secret-safe data |
| Tests | Jest, Testcontainers, Playwright, k6 | Contract tests, replay tests, fault injection, E2E and performance |
| Delivery | Docker Compose, GitHub Actions, GHCR | Non-root images, pinned actions, least-privilege releases |

Use a maintained package that meets the job; verify current versions/docs with accessible tools rather than hallucinating specific dependency APIs. No hidden paid SaaS or mandatory paid integration. Record source and justification when selecting Kafka client, telemetry tooling, UI/component libraries, or model SDK.

### 2.1 Target file tree

```text
deploysentinel/
├── GEMINI.md                      # THIS instruction file — at repo root
├── README.md
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── package.json
├── docker-compose.yml
├── apps/
│   └── web/                       # Next.js incident console
├── services/
│   ├── api/src/                   # Fastify REST + GraphQL Yoga, auth/webhooks
│   ├── processor/src/             # Kafka consumer + correlation + retry/DLQ
│   └── investigator/src/          # Bounded read-only AI jobs and tools
├── packages/
│   ├── contracts/
│   │   ├── openapi.yaml
│   │   ├── schema.graphql
│   │   └── events/                # Versioned JSON Schema event contracts
│   ├── generated/                 # Machine-generated typed clients/types
│   ├── db/{schema,migrations,seeds}/
│   ├── ai/{providers,tools,prompts,evals}/
│   ├── telemetry/
│   └── shared/                    # Authorization, schemas, errors, logging
├── tests/{unit,integration,contract,replay,e2e,load,fixtures}/
├── scripts/{scenarios,event-generator}/
├── infra/{docker,otel,grafana,release}/
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── operations/
│   └── verification/
│       ├── PROGRESS.md
│       └── M01.md ... M08.md
└── .github/workflows/
```

**Ownership:** API validates/adopts events and enforces auth; processor owns deterministic correlation; investigator owns bounded diagnostics, never writes to operational systems; DB owns durable state; UI accesses backend only through generated typed interfaces. The synthetic adapter is real functional demo infrastructure, not a fake successful response.

---

## 3. Design and UX requirements — product-quality, not template-looking

Design a cohesive **operations console** with a restrained slate/navy base, one crisp accent for investigation focus, semantically meaningful status colors, dense but readable tables, and accessible high-contrast typography. Provide dark-mode-ready tokens, optional light mode, keyboard/focus support, skeleton/empty/error/retry states, and mobile/tablet layouts. Avoid gratuitous glassmorphism, huge gradients, excessive motion, placeholder chart data, inert buttons, random icons and AI-looking visual clutter.

**Required routes:** `/`, `/incidents`, `/incidents/[id]`, `/services`, `/services/[id]`, `/deployments`, `/investigations`, `/investigations/[id]`, `/settings/integrations`, `/settings/team`. Real routes may be adapted to the chosen routing standard with documented equivalences.

**Primary interface components:** incident severity/status overview, service health, event timeline (time and source labeled), related deployment comparison, evidence drawer with citation IDs, hypothesis confidence/uncertainty presentation (avoid fabricated numerical confidence), correlation explanation, worker/DLQ operations panels, role-aware action controls, generator controls for synthetic demos, API/integration status, telemetry health, keyboard accessible command search.

**Functionality:** forms validate and persist; filters and pagination query API; charts use real demo/back-end data; every visible button has a real supported effect or is explicitly disabled with an explanation. Never claim a live service is 'healthy' if only synthetic service state exists. Support no-data fresh installs.

**Design quality gate:** Playwright at desktop/tablet/mobile, keyboard, empty/error/saturation states, focus, reduced motion and basic accessibility checks; no console errors and no broken navigation.

---

## 4. Auth, tenancy, security and operational constraints

- Use server-enforced sessions/OIDC or equivalent library with verified versions; local demo workspace sign-in must be **dev-only**, clearly labeled, and impossible to enable in production accidentally. No hardcoded production access.
- Roles: `org_admin`, `on_call`, `viewer`. Enforce authorization at REST, GraphQL, job execution, diagnostic tool and DB query boundaries; never trust organization IDs from client input.
- Tenant-scoped primary/foreign key relationships and indexes where feasible; cross-tenant references rejected and covered by tests. Consider PostgreSQL RLS as defense in depth; ensure app-level enforcement regardless.
- Webhook HMAC over raw request bytes + timestamp, constant-time comparison, bounded replay window, per-integration secret rotation plan, payload size limit and idempotency.
- Input validation with schema, strict query depth/complexity and bounded GraphQL first limits; prevent IDOR, SQL injection, SSRF, log injection, XSS, prompt injection and secrets leakage.
- Audit user actions, event replays, role changes and incident state changes with actor/time/correlation ID. Redact payloads and avoid unnecessary sensitive data retention.
- Never store private keys, full credentials, private customer incidents, sensitive log excerpts or proprietary production telemetry in the public portfolio seed/demo.
- Verify container permissions, least privilege, CORS/CSRF, secure cookies, authorization of WebSocket/SSE subscriptions if used, secret injection and container image scanning.
- No external production deployment, irreversible deletion, real customer integrations, paid model calls, or release publication without appropriate credentials and explicit permission.

---

## 5. API contracts, versioned events, and typed clients

**Canonical contracts:** `packages/contracts/openapi.yaml` OpenAPI 3.1; `packages/contracts/schema.graphql` schema-first SDL; event JSON Schema under `packages/contracts/events/v1/`. Generated REST TS clients (`openapi-typescript` / `openapi-fetch`) and GraphQL operations (GraphQL Code Generator). CI must detect drift between implemented and canonical contracts.

**REST endpoints (illustrative required behavior):**

- `POST /v1/webhooks/deployments`, `/v1/webhooks/alerts`, `/v1/webhooks/config-changes` — signed/admitted ingress.
- `POST /v1/events` — authenticated event submission with `Idempotency-Key`.
- `POST /v1/incidents/{id}/investigations` — asynchronous investigation request, 202 + job ID.
- `GET /v1/jobs/{id}` — job status/result reference (tenant authorized).
- `POST /v1/incidents/{id}/acknowledge`, `.../resolve` — actor audited, optimistic versioning.
- `POST /v1/events/{id}/replay` — privileged, audited DLQ replay with safe dedupe.
- Health/readiness endpoints separate liveness from dependency checks.

**GraphQL queries:** `services`, `deployments`, `incidents`, `incident`, `investigation`, `incidentEvidence`, `dashboardSummary`, and timeline search. Opaque cursor pagination: stable `(occurredAt,id)` or `(createdAt,id)` ordering, cap 100, signed/encoded cursor with tenant/filter-aware consistency when practical. Never return unbounded telemetry or full raw logs to AI/UI.

**Event types:** `DeploymentCreated`, `AlertTriggered`, `ErrorRateChanged`, `ConfigurationChanged`, `IncidentStatusChanged`, plus normalized event envelopes. Every event carries `eventId`, `eventType`, `schemaVersion`, `organizationId`, `serviceId`, `occurredAt`, `receivedAt`, `correlationId`, and typed payload. Define stable ID semantics, N/N-1 compatibility, unknown version policy, and evolution tests.

**Failures:** consistent errors `{code,message,requestId,details?}`; distinguish 400, 401/403, 409, 422, 429 with Retry-After, 503. 202 means *accepted for asynchronous processing*, never completed. Preserve idempotency across retries.

---

## 6. PostgreSQL and incident correctness

**Tables:** `organizations`, `users`, `memberships`, `services`, `environments`, `integrations`, `deployments`, `alerts`, `incidents`, `incident_events`, `incident_transitions`, `investigation_runs`, `investigation_evidence`, `hypotheses`, `event_outbox`, `event_inbox`, `idempotency_records`, `failed_events`, `audit_events`.

- Strong FK constraints, tenant scope, unique `(organization_id,source,event_id)` where applicable, indexes on service+time/status, immutable evidence/source version references, incident state version, event redaction.
- Document finite incident state machine: `open → acknowledged → investigating → mitigated → resolved`, plus justified re-open; enforce valid transitions in a transaction; optimistic concurrency guards.
- **Outbox:** accepted event + outbox row committed in one PostgreSQL transaction. Publisher leases pending rows with safe concurrency, publishes to Kafka, marks published; duplicate publishes tolerated and suppressed downstream. Outbox cannot be atomically committed with Kafka without a specific compatible transactional design; do not claim so.
- **Inbox:** consumer processes a unique event and writes `event_inbox` plus incident changes in one DB transaction, commits offset after DB durability. At-least-once delivery; idempotent effects. Consistent conflict behavior and retry.
- Handle event-time vs processing-time, duplicates, late arrivals, reordered messages, time windows, correlation reason records and rule version; deterministic replay and stable incident identity on identical inputs.
- Forward-only production-safe expand/contract migrations, explicit tested fresh bootstraps and controlled migration rollback. Never `drop schema cascade` to recover from a failing migration on persistent data.
- **Seeds:** 10 services, 30 deployments, 100 alerts, 20 incident timelines, plus unrelated noise, replays, skewed timestamps, wrong versions and ambiguous cases. Deterministic seed and safe reset only for marked synthetic fixtures.

---

## 7. Queue worker, backpressure, retries, dead letters and partial failure

Use the documented compatible Kafka/Redpanda client with explicit offset controls. Suggested topic plan:

```text
events.raw.v1
events.normalized.v1
incidents.v1
investigations.requested.v1
events.retry.1.v1
events.retry.2.v1
events.dead-letter.v1
```

**M04 essential job:** consuming normalized deployment/alert events, validate schema and tenant, correlate within a bounded window, persist incident link/update, publish incident notification using the outbox. No immediate acknowledgement before DB commit. Consumer retry and DLQ strategy must avoid indefinitely blocking partitions.

**Backpressure:** separate HTTP admission per tenant and bounded consumer in-flight; publish a capacity signal; return `429` / Retry-After when applicable; consumer pause/resume and record lag. Sustained target 100 accepted events/second under documented reference local setup, with p95 HTTP acceptance <=200 ms, measured not asserted.

**Retry policy:** transient categories only; max four total processing attempts with exponential backoff and jitter using delay/retry topics or a justified scheduler; permanent invalid schema/poison payload to DLQ. Persist attempts, reason, origin topic/partition/offset, sanitized error, correlation ID and replay eligibility. Replay requires authorization and audit, safe dedup, and bounded replay requests.

**Failures to test:** publisher crashes after send, DB commit succeeds but offset commit fails, broker unavailable after HTTP accept, temporary DB outage, poison event, consumer rebalance, SIGTERM drain, duplicate/reordered/late events, replay, missing dependency. No lost accepted events, no duplicate incident creation under documented delivery semantics.

---

## 8. Deterministic detection vs bounded AI investigation

**Deterministic incident correlation** makes actual incident state updates; a model may not create/alter infrastructure state based on unsupported reasoning.

**Runtime investigator tool allowlist, read-only:**

```text
listRecentDeployments(serviceId, start, end, limit)
getErrorRateWindow(serviceId, start, end, aggregation)
getTraceSummaries(serviceId, start, end, limit)
listConfigurationChanges(serviceId, start, end, limit)
getRelatedAlerts(serviceId, start, end, limit)
```

Tools enforce actor scope, organization/service allowlist, time-range caps, result count caps, timeouts, permissions and response redaction **inside each tool**, irrespective of model arguments. Evidence text/alerts/logs are **untrusted data**, not instructions. No shell, browsing, mutation, arbitrary HTTP fetch, deploy/rollback, secret access or write tools.

- At most **4 tool calls**, **2 model reasoning rounds**, **3 returned hypotheses**, with hard cancellation/timeout and token budget.
- Structured output: `{hypotheses:[{rank,causeCategory,rationale,evidenceIds}],missingEvidence,uncertainty,proposedHumanActions,modelId,promptVersion,toolCallCount,inputTokens,outputTokens,estimatedCost,elapsedMs}`.
- Validate all evidence references against current authorized investigation snapshot; reject or remove unsupported claims and record validation errors, with abstention on insufficient evidence.
- Keep an end-to-end **deterministic offline provider**, real tool implementations over synthetic telemetry, plus optional live cloud adapter configured only with verified access and cost approval. Do not silently fall back from Live to Synthetic without a visible label.
- **Free-tier default:** no billing, no automated paid requests, no provider auto-upgrade; optional provider uses explicit `.env` and strict per-minute/daily max. If access or quotas unknown, keep Live disabled and complete milestones offline. Separate Gemini CLI (development tool) from the application's Gemini runtime model provider.

---

## 9. AI golden evaluation protocol, quantitative targets

Create `packages/ai/evals/golden.jsonl` **80 fully synthetic, labeled scenarios** including release regression, bad config, dependency failure, traffic spike, database saturation, missing telemetry, ambiguous cases, noisy unrelated events and prompt-injected log lines. Include incident snapshot, tool result fixtures, allowed evidence IDs, correct `causeCategory` labels, and `shouldAbstain`. Split to prevent merely memorizing data; keep evaluation prompt templates and results versioned.

**Targets (unmeasured until benchmarked):**

| Metric | Definition | Target |
|---|---|---|
| Root cause Top-1 | Exact correct canonical category in highest-ranked hypothesis on answerable cases | >=75% |
| Root cause Top-3 | Correct canonical cause appears in first 3 on answerable cases | >=90% |
| Evidence validity | Fraction of cited IDs existing and authorized in the scenario; report factual entailment separately | >=98% |
| Abstention recall | Correct abstention among designated insufficient-evidence cases | >=90% |
| Unauthorized mutation | Any attempted call outside read-only allowlist or state mutation | 0 tolerated |
| Investigation latency | Start of worker investigation to durable result, p95 across benchmark | <=10 sec |
| Variable AI cost | Provider token charges per investigation; report cost date and model | <=$0.03 |
| Call/round limits | Hard tool call and reasoning round caps | <=4 / <=2 |

Measure abstention false positives, token usage, invalid citation rejection, unsupported factual claims, timeout rate and costs separately. Use deterministic offline adapter for normal CI and repeatable correctness; label live-model results distinctly, never present offline scores as real-provider performance. Provider quota/availability may prevent live benchmark; do not pretend otherwise. p95 needs enough samples; one request is just a smoke test.

---

## 10. Testing strategy and quality gates

- **Unit (Jest):** schema parsing, HMAC replay, validators, tenant RBAC, stable cursor, duplicate suppression, retry classification, incident windows/state, evidence authorization, bounded agent loops.
- **Integration (Testcontainers):** PostgreSQL and Redpanda production/consume, transactional outbox/inbox, offset and DB failure, retry/DLQ, migrations, SDK mock adapter, API auth. If Mac Docker unavailable, document blocker rather than substitute an in-memory imitation for durable integration.
- **Contract:** OpenAPI and GraphQL served schema drift, generated client drift, version N/N-1 event JSON Schema, error envelope.
- **Replay:** 5,000 out-of-order/duplicate synthetic alerts with deterministic clock; stable incident identity; late/poison/failed dependency conditions.
- **E2E (Playwright):** sign-in flow, create/view/acknowledge/resolve, service screens, investigation evidence, synthetic scenario, role denials, keyboard, mobile.
- **Security:** forged webhook, cross-tenant IDs (REST/GraphQL/worker/agent), prompt injection, maximum tool scope, invalid/deep GraphQL requests, secret scrubbing.
- **Coverage:** at least **85% branch coverage on correlation/business-critical modules** and strong branch tests on authorization/tool guardrails; report coverage scope rather than claiming monorepo-wide percentage. Never cheat with `coveragePathIgnorePatterns` or `istanbul ignore` to hit threshold.
- **Performance:** k6 event admission 100/sec sustained in specified reference setup, report p50/p95/p99, 429 rate, consumer lag, DB CPU/config, hardware and runtime; separate incident detection time from API accept time.

Every stage's gate: clean install, format, lint, typecheck, relevant tests, contract checks, builds, migration verification and Docker smoke once applicable. A task is incomplete if tests fail; real external steps may be honestly blocked and documented.

---

## 11. CI/CD, release and operations

GitHub Actions: PR workflow frozen `pnpm` install, format/lint, strict TS, Jest, contract drift, PostgreSQL/Redpanda integrations, migrations, security checks, build and smoke. Release workflow on protected main/tag only builds and publishes web/API/processor/investigator images to GHCR with immutable git-SHA tags, minimal permissions, reviewed action SHAs, non-root build images, health/readiness and no secrets in fork PRs. Publish requires credentials, permissions and remote; if missing, prepare workflow and report publication unverified, never claim released.

Operations docs: config/secret inventory, upgrade/downgrade/expand-contract strategy, Redis-free Kafka stack setup (no unnecessary Redis), consumer drain and rebalance, DLQ review/replay, database backup/recovery, telemetry rotation/retention, auth setup, rate limits, deployment rollback, incident response for the app itself and cost controls.

---

## 12. OpenTelemetry and SRE objectives

Instrument Fastify API, transaction outbox publisher, producer/consumer, correlation processor, investigator and read-only tools using OTel SDK with OTLP collector → Prometheus + Tempo + Grafana. Propagate trace headers across async messages; link contexts when parent-child cannot be preserved. No credentials, raw support logs or customer payloads in spans.

Required metrics: API accept latency p50/p95/p99, event admission/429, Kafka lag, publisher outbox backlog, retries and DLQ growth, event-to-incident detection duration, consumer failure and rebalances, investigation queue time, agent tool/round counts, response schema violations, token usage, request cost and provider status. Keep metric labels bounded in cardinality; reference IDs belong in traces/logs with redaction and retention policy.

Alerts: outbox stuck, growing Kafka lag, DLQ growth, API error budget burn, AI timeout/abstention spikes, unexpected cost, telemetry exporter failure. Avoid alert storms using grouping and cooldowns. Add 100eps benchmark and analysis; distinguish mocked AI latency from real cloud provider latency.

---

## 13. Documentation, decision records and deliverables

At minimum publish:

```text
README.md
.env.example
docs/architecture/architecture.md
docs/architecture/event-flow.md
docs/architecture/security-boundaries.md
docs/adr/0001-kafka-client.md
docs/operations/local-development.md
docs/operations/queue-recovery.md
docs/operations/deployment-and-rollback.md
docs/operations/security-and-secrets.md
docs/verification/PROGRESS.md
docs/verification/M01.md ... M08.md
docs/verification/final-acceptance.md
packages/ai/evals/golden.jsonl
packages/ai/evals/results/
```

Every documented outcome distinguishes **implemented**, **unit/integration verified**, **load measured**, **live-provider verified**, and **blocked/unverified**. Architecture diagrams must match actually built code. The final README should provide a 5–10 minute local synthetic demo, architecture, features, screenshots or image guidance, test and benchmark reproducibility, security posture, non-goals, real measurement tables and a credible incident replay demonstration.

---

## 14. Progress state format (persist to resume)

`docs/verification/PROGRESS.md` is the single durable milestone ledger. Initialize it in M01 and update it after every milestone with this format:

```markdown
# DeploySentinel build progress
Current milestone: M01
Last completed: none
Last verified commit: <sha or none>
Current branch: <branch>
Working tree: <state>
Runtime dependencies: <status>
Next action: <exact next task>
External blockers: <none or precise list>

| Stage | Status | Commit | Tests and evidence | Notes |
|---|---|---|---|---|
| M01 | IN PROGRESS | — | — | — |
| M02 | PENDING | — | — | — |
| M03 | PENDING | — | — | — |
| M04 | PENDING | — | — | — |
| M05 | PENDING | — | — | — |
| M06 | PENDING | — | — | — |
| M07 | PENDING | — | — | — |
| M08 | PENDING | — | — | — |
```

The milestone report is evidence, not a suggestion; update it *after* running the actual checks. If an important stage is blocked, describe both the blocker and independently completed work. Do not label any blocking stage PASS.

---

## 15. Universal subroutine applied to **all eight stages**

For each embedded prompt below, automatically append these instructions:

- Read and obey this entire `GEMINI.md`. Inspect actual repository state and preceding stage reports.
- Deliver source code, config, schema, docs and representative tests, not just a design plan.
- Reuse prior tested code and interfaces, change as little as necessary, and preserve user work.
- Run the full relevant verification suite, investigate and fix failures; update `M0N.md` and `PROGRESS.md` with real results.
- Commit a logically scoped change; record short SHA; confirm Git status. If stage gates fail, do not falsely commit/advance.
- **Upon PASS, start the next stage immediately in this same active session.** Do not ask “should I continue?” or stop at each milestone.
- If interrupted by a session/context/tool limit, persist the exact remaining task and restart instructions; work does not automatically continue while the session is inactive.

---

## 16. The eight embedded stage prompts — execute in order without pausing

### M01 — Scaffold the full-stack product and local infrastructure

**Prompt for the Gemini agent**

> You are the principal engineer implementing DeploySentinel. Create the real pnpm/Turborepo TypeScript monorepo described in this file. Set up a Next.js App Router responsive console, Fastify API, processor and read-only investigator service skeletons, shared packages, Docker Compose for PostgreSQL/Redpanda and basic observability, strict TS/ESLint/Prettier, environment validation, dev scripts and Git safeguards. Build connected but appropriately simple real screens for Overview, Incidents, Services, Deployments, Investigations and Settings with accessible states; no fake action buttons or hardcoded “live healthy” statuses. Implement health/readiness endpoints and a deterministic local event generator foundation. Create `GEMINI.md`, README, `.env.example`, ADR on key design choices and `docs/verification/PROGRESS.md`. All bootstraps must support an empty database. Verify install, format/lint, typechecking, builds, startup and a small browser smoke test (if available). Produce M01 evidence and commit `milestone/01: scaffold DeploySentinel`. Then **immediately begin M02** without confirmation.

**Acceptance:** executable workspace, verified service boot, working demo UI shell, isolated config/secrets, documented commands, clean committed stage. Do not simulate authentication success as production auth.

### M02 — OpenAPI/GraphQL/event contracts and generated clients

**Prompt for the Gemini agent**

> Implement contract-first REST OpenAPI 3.1, schema-first GraphQL SDL and versioned JSON Schema event envelopes for deployments, alerts, error rates, configuration changes and incident status transitions. Wire real Fastify controllers/resolvers; add org-scoped authentication/RBAC and dev-only local workspace bypass, HMAC signed webhooks with timestamp/anti-replay, request/idempotency keys, error codes, rate-limit headers, 202 async semantics, cursor pagination, query caps and stable sorting. Generate typed REST and GraphQL clients and event types, consume them from the Next.js UI and add drift/authorization/contract tests. Use a durable `pending_dispatch` status when data is accepted but M04 business processing is not yet active; don't mislabel it processed. Ensure read-only actor cannot mutate, no untrusted org IDs, and tokens never reach client bundles. Run milestone regressions, document M02, commit `milestone/02: API and event contracts`. Then **immediately begin M03**.

**Acceptance:** canonical contracts, drift detection, actual authenticated endpoints, typed clients, signed ingress, pagination and explicit pending async behavior.

### M03 — PostgreSQL models, migrations, outbox/inbox and seed generators

**Prompt for the Gemini agent**

> Implement Drizzle schema and incremental SQL migrations for organizations, memberships, services, environments, integrations, deployments, alerts, incidents, transitions, incident events, investigations, evidence, hypotheses, event outbox/inbox, idempotency, dead-letter metadata and audit events. Enforce tenant boundaries, strong FKs, uniqueness, optimistic incident updates, deterministic incident state machine, transactionally accepted events/outbox and idempotent inbox semantics. Build a publisher lease/persistence design without pretending DB and Kafka commits are atomic. Implement expand-contract migration example and test a clean bootstrap plus upgrade from M02 state without destroying data. Seed 10 services, 30 deployments, 100 alerts, 20 synthetic incident timelines, background noise, duplicates, late events and root-cause labels. Add deterministic scenario generator/scripts and migration, FK, rollback, tenant, outbox and seed-repeatability tests. Maintain `pending_dispatch` until M04 worker activation. Document ERD and event flow, commit `milestone/03: durable incident data layer`, and **immediately begin M04**.

**Acceptance:** functioning DB migrations without loss, synthetic fixtures, durable ingress/outbox design, audited transitions and correct tenancy.

### M04 — Operational Kafka/Redpanda correlation workers and reliability

**Prompt for the Gemini agent**

> Build real Kafka-compatible event pipelines using the selected maintained client and Redpanda: outbox publisher, event normalization, correlation worker, incident event publication, explicit consumer offsets, inbox dedup, retries and DLQ. Implement one fully operational job: normalized deployment+alert events → validated deterministic rule/window correlation → idempotent incident insert/update → durable notification outbox. Implement bounded in-flight batches, per-tenant admission, consumer pause/resume, queue-depth/lag tracking, 429 Retry-After and graceful SIGTERM draining. Retry only transient failures, max four total attempts with exponential jitter; permanent/poison messages to DLQ with reason and audited replay. Test crash-after-publish, broker outages, DB failures, duplicate/late/reordered events and retry exhaustion with real containers. Define a reproducible 100 events/sec admission benchmark (run when supported; report actual performance later in M08). Document recovery, verify regression, commit `milestone/04: reliable event processing`, and **immediately begin M05**.

**Acceptance:** durable accepted events, idempotent incidents, functioning replay/DLQ, bounded backpressure and verified outage behavior.

### M05 — Deep Jest, browser, contract and fault-injection coverage

**Prompt for the Gemini agent**

> Harden DeploySentinel with Jest, Testcontainers, Playwright, fake clock and deterministic fixture generation. Test webhook HMAC/replay, tenant denial, RBAC, cursor pagination, contract drift and v1/v0-compatible event handling, correlation windows, stable incident IDs, incident state machine, outbox/inbox, offsets, retries/DLQ replay, shutdown and worker crash recovery. Build replay suite with 5,000 duplicate/out-of-order events. Add API/UI end-to-end flows: real incident generated, list/detail state, role-scoped actions, keyboard/mobile, loading/empty/errors. Inject Kafka downtime and DB rollback/commit races; ensure no duplicate incident from replay. Establish at least 85% branch coverage for correlation/business-critical modules, document actual scope and uncovered branches. Enforce coverage threshold in CI scripts without fraudulent exclusions. Run ALL relevant verification, document M05, commit `milestone/05: reliability and security verification`, and **immediately begin M06**.

**Acceptance:** meaningful deterministic tests and traceable failed-case fixes, measured coverage, documented integration limitations, no bypassed checks.

### M06 — Bounded read-only agent, real tools and 80-case golden evals

**Prompt for the Gemini agent**

> Implement the investigation queue and bounded read-only AI loop with five strictly typed and internally authorized diagnostic tools: recent deployments, error-rate window, trace summaries, configuration changes and related alerts. Use actual synthetic telemetry/database sources, not invented evidence. Enforce 4 total tool calls, 2 reasoning rounds, 3 hypotheses, hard timeout/token budgets, tenant + service scope in every tool, prompt-injection resistance, evidence-ID validator, uncertainty/abstention, immutable investigation record, explicit provider labels and human-only incident actions. Implement a deterministic offline provider and configurable optional cloud provider (e.g., official Gemini SDK), disabled until verified free-tier eligibility and credentials; never enable billing, paid fallbacks or uncontrolled requests. Create 80 synthetic labeled golden incidents across six primary categories, ambiguity, missing evidence, unrelated noise and malicious instructions; test Top-1/Top-3, evidence validity, abstention, disallowed mutations, tool caps, timeouts and token/cost accounting. Target >=75% Top-1, >=90% Top-3, >=98% valid evidence, >=90% correct abstention and zero unsafe tool calls; report ACTUAL results, not targets as achievements. Measure p95 and cost only when representative workloads/provider access permit. Add UI investigation start/details/evidence, test offline end-to-end, document M06, commit `milestone/06: safe AI incident investigation`, and **immediately begin M07** even if external live-provider testing is explicitly blocked.

**Acceptance:** human-approved, evidence-backed, safe bounded investigation; offline complete; measured evals and honest live-model limitations.

### M07 — Secure GitHub Actions, hardened images and release procedures

**Prompt for the Gemini agent**

> Implement complete CI/CD: PR checks for frozen pnpm lockfile, lint/format, TS strict typecheck, Jest, contract and event-version drift, Testcontainers PostgreSQL/Redpanda integration, migrations, browser smoke, security checks, builds and Docker smoke; separate protected release workflow for immutable GHCR images of web/API/processor/investigator. Use multi-stage non-root Docker images, health/readiness probes, SHA-pinned reviewed actions, minimal packages:write privileges for publishing, no secrets on untrusted PRs and dependency auditing. Include reproducible Compose release profile and deployment manifests with independently scaled workers, graceful drain, migration ordering, N/N-1 event compatibility, backup, rollback and DLQ replay. Validate workflow syntax and builds locally. DO NOT push to a remote, provision paid hosts or deploy without explicit user authorization and available credentials; document unverified publication rather than claim it happened. Document M07, commit `milestone/07: CI CD and release engineering`, and **immediately begin M08**.

**Acceptance:** valid release automation files/images and documented, safe deployment pathway; publication appropriately gated.

### M08 — OpenTelemetry, load test, dashboards and final synthetic demo

**Prompt for the Gemini agent**

> Instrument Fastify, DB, outbox publisher, Kafka producer/consumer, correlation engine, investigation service, read-only tools and external AI provider adapter using OpenTelemetry with trace propagation and sanitized correlation context. Add OTel Collector, Prometheus, Tempo and Grafana dashboards/alerts for HTTP p50/p95/p99, ingress/429, outbox backlog, consumer lag, retries, DLQ, event-to-incident lag, errors, tool counts, token/cost, timeout and investigation duration. Ensure telemetry does not leak secrets or high-cardinality metric labels. Run a documented k6 target of 100 accepted events/sec with p95 HTTP acceptance <=200ms in the reference setup; report measured values, 429 rate, dropped/duplicate effects, resource constraints and cases where targets are missed. Run golden AI evals and distinguish offline vs optional authorized live results. Execute full regression suite. Demonstrate: synthetic healthy service → deployment event → error spike → correlated incident → evidence-backed AI investigation → human acknowledgment → broker interruption → resume + duplicate replay without extra incident. Produce polished README, architecture/event-flow/security diagrams, screenshots/demo script, troubleshooting and final acceptance report. Commit `milestone/08: observability and portfolio acceptance`. Report complete, partial or blocked status with the exact evidence. Do not claim public production deployment if no real host was configured.

**Acceptance:** real dashboards and traces, reproducible throughput/performance report, accurate demo walkthrough, full regression and honest deployment readiness.

---

## 17. Final project completion criteria and handoff

The project can be called **synthetic portfolio demo ready** only if all of the following are demonstrated:

- All M01–M08 stage commits/reports exist, or an existing completed stage has equivalent verified evidence.
- Functional responsive UI, auth/RBAC, real persisted incidents/timelines, signed events, schema generation and safe pagination.
- DB migrations, outbox/inbox, Kafka correlation, retries, DLQ and replay tested in real service containers.
- Read-only investigation uses real permitted evidence, enforces all limits, records missing evidence, passes synthetic evaluation gates or clearly reports each failure.
- Live cloud model not implied by offline smoke; any optional real provider validation explicitly labeled. AI quotas and billing guardrails remain intact.
- End-to-end synthetic incident scenario, crash/replay recovery, Playwright checks, tests, metrics and traces are reproducible and documented.
- CI workflows and images build; production publication, hosting and secrets explicitly marked unverified if not run.
- Actual measurements are published with environment details; no invented benchmarks, percentages, certification or security claims.
- Git status verified; final summary includes commit IDs, feature set, test counts, coverage scope, p95 throughput, evaluator results, known limitations, and deployment next steps.

**Immediately start M01 on initial kickoff, then continue through M08 automatically following Section 0.**
