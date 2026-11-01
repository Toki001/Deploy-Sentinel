import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// 1. Organizations
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Memberships
export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(), // org_admin, on_call, viewer
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("memberships_org_user_idx").on(table.organizationId, table.userId)],
);

// 4. Environments
export const environments = pgTable(
  "environments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("environments_org_slug_idx").on(table.organizationId, table.slug)],
);

// 5. Integrations
export const integrations = pgTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    type: text("type").notNull(), // github, pagerduty, datadog, custom_webhook
    secretHash: text("secret_hash").notNull(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("integrations_org_idx").on(table.organizationId)],
);

// 6. Services
export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    tier: text("tier").default("tier-2"),
    status: text("status").default("healthy").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("services_org_name_idx").on(table.organizationId, table.name)],
);

// 7. Deployments
export const deployments = pgTable(
  "deployments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    environmentId: text("environment_id").references(() => environments.id),
    version: text("version").notNull(),
    environment: text("environment").notNull(),
    commitSha: text("commit_sha"),
    deployedBy: text("deployed_by"),
    deployedAt: timestamp("deployed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("deployments_org_svc_deployed_idx").on(
      table.organizationId,
      table.serviceId,
      table.deployedAt,
    ),
  ],
);

// 8. Alerts
export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    alertName: text("alert_name").notNull(),
    severity: text("severity").notNull(),
    metricValue: doublePrecision("metric_value"),
    threshold: doublePrecision("threshold"),
    fingerprint: text("fingerprint"),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("alerts_org_svc_triggered_idx").on(
      table.organizationId,
      table.serviceId,
      table.triggeredAt,
    ),
  ],
);

// 9. Incidents
export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    title: text("title").notNull(),
    status: text("status").notNull(), // open, acknowledged, investigating, mitigated, resolved
    severity: text("severity").notNull(), // critical, high, medium, low
    correlationKey: text("correlation_key").notNull(),
    version: integer("version").default(1).notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    mitigatedAt: timestamp("mitigated_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("incidents_org_status_idx").on(table.organizationId, table.status),
    index("incidents_org_svc_opened_idx").on(table.organizationId, table.serviceId, table.openedAt),
  ],
);

// 10. Incident Events
export const incidentEvents = pgTable(
  "incident_events",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("incident_events_incident_idx").on(table.incidentId)],
);

// 11. Incident Transitions (Audit History of State Machine)
export const incidentTransitions = pgTable(
  "incident_transitions",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    actorId: text("actor_id").notNull(),
    reason: text("reason"),
    transitionedAt: timestamp("transitioned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("incident_transitions_incident_idx").on(table.incidentId)],
);

// 12. Investigation Runs
export const investigationRuns = pgTable(
  "investigation_runs",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    status: text("status").notNull(), // pending, running, completed, failed, abstained
    modelId: text("model_id").notNull(),
    toolCallCount: integer("tool_call_count").default(0).notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    estimatedCost: doublePrecision("estimated_cost").default(0.0).notNull(),
    uncertainty: text("uncertainty"),
    missingEvidence: jsonb("missing_evidence").default([]).notNull(),
    proposedHumanActions: jsonb("proposed_human_actions").default([]).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("investigation_runs_incident_idx").on(table.incidentId)],
);

// 13. Investigation Evidence
export const investigationEvidence = pgTable(
  "investigation_evidence",
  {
    id: text("id").primaryKey(),
    investigationRunId: text("investigation_run_id")
      .notNull()
      .references(() => investigationRuns.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    evidenceType: text("evidence_type").notNull(), // deployment, error_rate, trace, config, alert
    sourceId: text("source_id").notNull(),
    description: text("description").notNull(),
    data: jsonb("data").notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("investigation_evidence_run_idx").on(table.investigationRunId)],
);

// 14. Hypotheses
export const hypotheses = pgTable(
  "hypotheses",
  {
    id: text("id").primaryKey(),
    investigationRunId: text("investigation_run_id")
      .notNull()
      .references(() => investigationRuns.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    rank: integer("rank").notNull(),
    causeCategory: text("cause_category").notNull(),
    rationale: text("rationale").notNull(),
    evidenceIds: jsonb("evidence_ids").notNull(), // string[]
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("hypotheses_run_rank_idx").on(table.investigationRunId, table.rank)],
);

// 15. Event Outbox
export const eventOutbox = pgTable(
  "event_outbox",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    topic: text("topic").notNull(),
    eventKey: text("event_key").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").default("pending").notNull(), // pending, published, failed
    retryCount: integer("retry_count").default(0).notNull(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("event_outbox_status_lease_idx").on(table.status, table.leaseExpiresAt)],
);

// 16. Event Inbox (Deduplication)
export const eventInbox = pgTable(
  "event_inbox",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    correlationId: text("correlation_id"),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("event_inbox_org_event_idx").on(table.organizationId, table.eventId)],
);

// 17. Idempotency Records
export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    lockedAt: timestamp("locked_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idempotency_org_key_idx").on(table.organizationId, table.idempotencyKey),
  ],
);

// 18. Failed Events (DLQ)
export const failedEvents = pgTable(
  "failed_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    eventId: text("event_id").notNull(),
    topic: text("topic").notNull(),
    partition: integer("partition").notNull(),
    offset: text("offset").notNull(),
    errorDetails: text("error_details").notNull(),
    retryCount: integer("retry_count").default(0).notNull(),
    status: text("status").default("dead_letter").notNull(), // dead_letter, replayed, discarded
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("failed_events_org_status_idx").on(table.organizationId, table.status)],
);

// 19. Audit Events
export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(), // incident.state_change, event.replay, role.change
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    correlationId: text("correlation_id"),
    metadata: jsonb("metadata").default({}).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_events_org_occurred_idx").on(table.organizationId, table.occurredAt)],
);
