# DeploySentinel Event Flow & State Durability

## Ingress & Outbox

1. Ingress webhook received at `POST /v1/webhooks/*` or `POST /v1/events`.
2. Raw HMAC signature (`x-signature`) and timestamp (`x-timestamp`) verified in constant time.
3. Event envelope parsed and validated against versioned JSON Schema.
4. Transactional Outbox write:
   - In one database transaction, the accepted event is written to `event_outbox` with status `pending`.
   - API immediately returns HTTP `202 Accepted` with `pending_dispatch` status.
5. Outbox publisher worker leases pending records with optimistic locking, publishes to Redpanda topic `events.raw.v1` or `events.normalized.v1`, and marks rows as `published`.

## Deterministic Correlation

1. Processor consumer reads from `events.normalized.v1`.
2. Inbox check: insert into `event_inbox` with unique constraint on `(organization_id, event_id)` to suppress duplicate deliveries.
3. Sliding time window correlation:
   - Match service deployments within correlation window (e.g., 10 minutes preceding error spike).
   - Evaluate against incident state machine: `open -> acknowledged -> investigating -> mitigated -> resolved`.
   - Atomically commit incident updates and inbox record before committing Kafka partition offset.
