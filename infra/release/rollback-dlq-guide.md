# Production Rollback & Dead-Letter Queue (DLQ) Recovery Guide

This runbook defines operational recovery procedures for DeploySentinel when bad releases occur or poison messages accumulate in dead-letter queues.

---

## 1. Rolling Back an Unhealthy Release

If an alert triggers post-deployment (e.g. error rate spike, worker crash loop, memory saturation):

### Step 1: Revert Application Image

Revert the container image tag in Kubernetes or Docker Compose to the previous stable immutable SHA tag ($N-1$):

```bash
# Kubernetes
kubectl rollout undo deployment/deploysentinel-api -n deploysentinel
kubectl rollout undo deployment/deploysentinel-processor -n deploysentinel

# Docker Compose
IMAGE_TAG=v0.0.9 docker compose -f docker-compose.release.yml up -d
```

### Step 2: Backward Database Compatibility

Because DeploySentinel strictly uses **Expand/Contract** migrations:

- Database schema changes made in Phase 1 (Expand) are backwards compatible with version $N-1$.
- No emergency database schema rollback (`drop table` / `drop column`) should be performed during active incident remediation.

---

## 2. Dead-Letter Queue (DLQ) Inspection & Replay

When events exceed the maximum retry count (4 attempts) or fail schema validation, they are routed to `events.dead-letter.v1` and persisted in `failed_events`.

### Inspecting DLQ Items via Admin API

```bash
curl -X GET "http://localhost:4000/v1/events?failed=true" \
  -H "Authorization: Bearer <org_admin_token>" \
  -H "X-Organization-Id: org-enterprise-001"
```

### Replaying a Dead-Lettered Event

Replays require `org_admin` permissions and generate an immutable audit log entry. Idempotency guarantees prevent duplicate incidents during replay.

```bash
curl -X POST "http://localhost:4000/v1/events/evt-failed-123/replay" \
  -H "Authorization: Bearer <org_admin_token>" \
  -H "X-Organization-Id: org-enterprise-001" \
  -H "Content-Type: application/json"
```

Response:

```json
{
  "replayed": true,
  "eventId": "evt-failed-123",
  "auditRecordId": "aud-replay-456",
  "occurredAt": "2026-11-01T12:00:00.000Z"
}
```

---

## 3. Consumer Offset Reset (Emergency Recovery)

If a downstream outage causes worker partition stall and events must be reprocessed from a specific timestamp:

```bash
# Rewind consumer group by 30 minutes
rpk group seek deploysentinel-correlation-workers \
  --to-timestamp $(date -v -30M +%s000) \
  --topics events.normalized.v1 \
  --brokers localhost:9092
```

Because the correlation engine and transactional inbox check deduplication keys (`organizationId:eventId`), re-consuming past messages does not create duplicate incidents.
