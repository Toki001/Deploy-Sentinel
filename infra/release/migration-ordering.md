# Database Migration Ordering & N/N-1 Compatibility Strategy

## 1. Zero-Downtime Migration Policy

DeploySentinel enforces **forward-only, non-destructive schema migrations** using Drizzle ORM and PostgreSQL.
To ensure zero-downtime deployments and support concurrent versions ($N$ and $N-1$) running during rolling updates, migrations follow the **Expand/Contract** design pattern.

### The Expand/Contract Lifecycle

```
Phase 1: Expand (Pre-deployment)
├── Add new tables, nullable columns, or dual-write triggers
├── Old application code ($N-1$) ignores new columns
└── DB migrations run via init-containers before app deployment

Phase 2: Transition (Rolling update)
├── New application version ($N$) starts up alongside ($N-1$)
├── New version writes to new columns/tables
└── Both versions read compatible structures safely

Phase 3: Contract (Post-deployment cleanup)
├── All instances running version ($N$)
├── Background job backfills legacy data if necessary
└── Subsequent migration drops legacy column or deprecates obsolete table
```

---

## 2. Execution Ordering

In both Docker Compose Release profile and Kubernetes manifests, execution ordering is strictly guaranteed:

1. **PostgreSQL & Redpanda Health Gate**: PostgreSQL must report healthy (`pg_isready`), and Redpanda cluster state must be green.
2. **Migration Job (`db-migrate`)**: Runs as an init-container / pre-step (`node packages/db/dist/migrate.js`). The application containers (`api`, `processor`, `investigator`) will NOT start until migrations terminate successfully with exit code 0.
3. **API Service (`api`)**: Starts once migration succeeds, passes readiness probe (`/health/ready`).
4. **Workers (`processor`, `investigator`)**: Start and join consumer groups with graceful signal handling (`SIGTERM`/`SIGINT`).
5. **Web Console (`web`)**: Starts and routes requests to the API.

---

## 3. N/N-1 Event Schema Evolution

Event contracts located under `packages/contracts/events/v1/` adhere to additive schema evolution rules:

- **Field Addition**: New fields must be optional or provide defaults.
- **Field Removal**: Fields cannot be removed without a deprecation window across two minor releases ($N \to N+1 \to N+2$).
- **Type Alteration**: Event payloads cannot change types; new payload semantics require a new `schemaVersion` (e.g., `v2`).
- **Unknown Fields**: Consumers must ignore unknown fields without throwing validation errors.
