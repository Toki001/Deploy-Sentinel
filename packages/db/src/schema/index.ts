import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const services = pgTable("services", {
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
});

export const deployments = pgTable("deployments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  serviceId: text("serviceId")
    .notNull()
    .references(() => services.id),
  version: text("version").notNull(),
  environment: text("environment").notNull(),
  commitSha: text("commit_sha"),
  deployedBy: text("deployed_by"),
  deployedAt: timestamp("deployed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
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
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const incidents = pgTable("incidents", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  title: text("title").notNull(),
  status: text("status").notNull(), // open, acknowledged, investigating, mitigated, resolved
  severity: text("severity").notNull(),
  correlationKey: text("correlation_key").notNull(),
  version: integer("version").default(1).notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eventOutbox = pgTable("event_outbox", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  topic: text("topic").notNull(),
  eventKey: text("event_key").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").default("pending").notNull(), // pending, published, failed
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eventInbox = pgTable("event_inbox", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  eventId: text("event_id").notNull().unique(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});
