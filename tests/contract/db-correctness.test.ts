import {
  organizations,
  users,
  memberships,
  environments,
  integrations,
  services,
  deployments,
  alerts,
  incidents,
  incidentEvents,
  incidentTransitions,
  investigationRuns,
  investigationEvidence,
  hypotheses,
  eventOutbox,
  eventInbox,
  idempotencyRecords,
  failedEvents,
  auditEvents,
  applyIncidentTransition,
  assertValidTransition,
  isValidTransition,
  OutboxManager,
  InboxDeduplicator,
  generateSeedData,
} from "@deploysentinel/db";

describe("Milestone 03: PostgreSQL Schema, State Machine, Outbox/Inbox, and Seeds", () => {
  describe("Drizzle ORM Schema Tables (19 Tables Defined)", () => {
    it("should export all 19 required database tables with valid schemas", () => {
      const tables = [
        organizations,
        users,
        memberships,
        environments,
        integrations,
        services,
        deployments,
        alerts,
        incidents,
        incidentEvents,
        incidentTransitions,
        investigationRuns,
        investigationEvidence,
        hypotheses,
        eventOutbox,
        eventInbox,
        idempotencyRecords,
        failedEvents,
        auditEvents,
      ];

      expect(tables).toHaveLength(19);
      for (const table of tables) {
        expect(table).toBeDefined();
      }
    });

    it("should have correct column definitions on incidents and outbox", () => {
      expect(incidents.correlationKey).toBeDefined();
      expect(incidents.version).toBeDefined();
      expect(incidents.status).toBeDefined();
      expect(eventOutbox.leaseExpiresAt).toBeDefined();
      expect(eventOutbox.status).toBeDefined();
      expect(eventInbox.eventId).toBeDefined();
    });
  });

  describe("Incident State Machine Correctness", () => {
    it("should allow valid state transitions", () => {
      expect(isValidTransition("open", "acknowledged")).toBe(true);
      expect(isValidTransition("open", "investigating")).toBe(true);
      expect(isValidTransition("open", "resolved")).toBe(true);
      expect(isValidTransition("acknowledged", "investigating")).toBe(true);
      expect(isValidTransition("investigating", "mitigated")).toBe(true);
      expect(isValidTransition("mitigated", "resolved")).toBe(true);
      expect(isValidTransition("resolved", "open")).toBe(true); // Justified reopen
    });

    it("should reject invalid state transitions", () => {
      expect(isValidTransition("resolved", "acknowledged")).toBe(false);
      expect(isValidTransition("resolved", "investigating")).toBe(false);
      expect(isValidTransition("open", "mitigated")).toBe(false);

      expect(() => assertValidTransition("resolved", "acknowledged")).toThrow(
        /Invalid incident transition/,
      );
    });

    it("should successfully apply transition and increment version", () => {
      const result = applyIncidentTransition({
        incidentId: "INC-100",
        currentStatus: "open",
        currentVersion: 1,
        expectedVersion: 1,
        newStatus: "acknowledged",
        actorId: "usr-oncall-1",
      });

      expect(result.previousStatus).toBe("open");
      expect(result.newStatus).toBe("acknowledged");
      expect(result.newVersion).toBe(2);
      expect(result.transitionedAt).toBeDefined();
    });

    it("should guard against optimistic concurrency conflicts", () => {
      expect(() =>
        applyIncidentTransition({
          incidentId: "INC-100",
          currentStatus: "open",
          currentVersion: 3,
          expectedVersion: 2, // Outdated version submitted by client
          newStatus: "acknowledged",
          actorId: "usr-oncall-1",
        }),
      ).toThrow(/Optimistic concurrency conflict/);
    });
  });

  describe("Transactional Outbox Manager", () => {
    it("should create outbox entry with pending status and lease it", () => {
      const outbox = new OutboxManager();
      const entry = outbox.createEntry({
        organizationId: "org-demo",
        topic: "events.normalized.v1",
        eventKey: "checkout-service",
        payload: { eventType: "DeploymentCreated", version: "v2.4.1" },
      });

      expect(entry.status).toBe("pending");
      expect(entry.retryCount).toBe(0);

      // Lease entry
      const leased = outbox.leasePending(5, 5000);
      expect(leased).toHaveLength(1);
      expect(leased[0].id).toBe(entry.id);
      expect(leased[0].leaseExpiresAt).toBeDefined();

      // Second lease call while still leased returns 0 items
      const leasedAgain = outbox.leasePending(5, 5000);
      expect(leasedAgain).toHaveLength(0);

      // Mark published
      const published = outbox.markPublished(entry.id);
      expect(published).toBe(true);
      expect(outbox.get(entry.id)?.status).toBe("published");
      expect(outbox.get(entry.id)?.publishedAt).toBeDefined();
    });

    it("should track failed attempts and transition to failed on max retries", () => {
      const outbox = new OutboxManager();
      const entry = outbox.createEntry({
        organizationId: "org-demo",
        topic: "events.normalized.v1",
        eventKey: "auth-gateway",
        payload: { test: true },
      });

      outbox.markFailed(entry.id, 2);
      expect(outbox.get(entry.id)?.retryCount).toBe(1);
      expect(outbox.get(entry.id)?.status).toBe("pending");

      outbox.markFailed(entry.id, 2);
      expect(outbox.get(entry.id)?.retryCount).toBe(2);
      expect(outbox.get(entry.id)?.status).toBe("failed");
    });
  });

  describe("Transactional Inbox Deduplicator", () => {
    it("should process first event and reject duplicate event", () => {
      const inbox = new InboxDeduplicator();

      const firstPass = inbox.recordProcessed({
        organizationId: "org-demo",
        eventId: "evt-uuid-101",
        eventType: "DeploymentCreated",
      });
      expect(firstPass).toBe(true);
      expect(inbox.isProcessed("org-demo", "evt-uuid-101")).toBe(true);

      // Duplicate delivery attempt (at-least-once transport)
      const duplicatePass = inbox.recordProcessed({
        organizationId: "org-demo",
        eventId: "evt-uuid-101",
        eventType: "DeploymentCreated",
      });
      expect(duplicatePass).toBe(false); // suppressed by idempotency
    });

    it("should enforce tenant isolation in deduplication", () => {
      const inbox = new InboxDeduplicator();

      inbox.recordProcessed({
        organizationId: "org-tenant-a",
        eventId: "evt-same-id",
        eventType: "AlertTriggered",
      });

      // Same eventId under different organization is independent
      const otherOrgPass = inbox.recordProcessed({
        organizationId: "org-tenant-b",
        eventId: "evt-same-id",
        eventType: "AlertTriggered",
      });
      expect(otherOrgPass).toBe(true);
    });
  });

  describe("Deterministic Synthetic Seed Generator", () => {
    it("should generate the exact seed dataset defined in the specification", () => {
      const seed = generateSeedData();

      expect(seed.services).toHaveLength(10);
      expect(seed.deployments).toHaveLength(30);
      expect(seed.alerts).toHaveLength(100);
      expect(seed.incidents).toHaveLength(20);
      expect(seed.investigations).toHaveLength(20);

      // Verify relational consistency
      const serviceIds = new Set(seed.services.map((s) => s.id));
      for (const dep of seed.deployments) {
        expect(serviceIds.has(dep.serviceId)).toBe(true);
      }
      for (const alt of seed.alerts) {
        expect(serviceIds.has(alt.serviceId)).toBe(true);
      }
      for (const inc of seed.incidents) {
        expect(serviceIds.has(inc.serviceId)).toBe(true);
      }
    });
  });
});
