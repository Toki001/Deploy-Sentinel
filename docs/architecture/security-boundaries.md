# Security Boundaries & Guardrails

## 1. Tenancy Isolation

- All database records contain foreign keys to `organizations(id)`.
- Client requests cannot specify arbitrary tenant identifiers; all queries and mutations are filtered by authenticated session/token organization context.
- Cross-tenant references are rejected at the ORM query and diagnostic tool boundary.

## 2. Webhook Ingress Protection

- HMAC-SHA256 signature calculated over raw bytes and verified with `crypto.timingSafeEqual`.
- Mandatory timestamp header within 300-second window to prevent replay attacks.
- Payload size capped at 1MB to mitigate denial-of-service.

## 3. Bounded Read-Only AI Guardrails

- Tools allowlist is strictly read-only:
  - `listRecentDeployments`
  - `getErrorRateWindow`
  - `getTraceSummaries`
  - `listConfigurationChanges`
  - `getRelatedAlerts`
- Zero shell execution, zero network fetch, zero file system mutation, zero database write permissions.
- Hard caps:
  - Maximum 4 tool calls per investigation run.
  - Maximum 2 model reasoning rounds.
  - Maximum 3 returned hypotheses.
- Evidence citation validator: all `evidenceIds` referenced by model hypotheses are verified against the snapshot of evidence gathered by authorized tools. Unsupported claims are stripped or trigger abstention.
