import {
  EventProcessorWorker,
  InMemoryKafkaBus,
  CorrelationEngine,
  TOPICS,
  determineNextRoute,
  classifyError,
  MAX_RETRY_ATTEMPTS,
} from "../../services/processor/src/index";
import {
  OutboxManager,
  InboxDeduplicator,
  applyIncidentTransition,
  isValidTransition,
  assertValidTransition,
  type IncidentStatus,
} from "@deploysentinel/db";
import {
  assertRole,
  resolveUserContext,
  hasRequiredRole,
  type UserContext,
} from "@deploysentinel/shared";
import type { BaseEventEnvelope } from "@deploysentinel/contracts";

describe("Milestone 05: Fault Injection & Reliability Suite", () => {
  describe("1. Outbox Lease Expiration and Failover Recovery", () => {
    it("should allow a secondary worker to claim and publish an expired lease", () => {
      const outbox = new OutboxManager();
      const entry = outbox.createEntry({
        organizationId: "org-fault-1",
        topic: TOPICS.NORMALIZED,
        eventKey: "svc-alpha",
        payload: { test: "data" },
      });

      expect(entry.status).toBe("pending");

      // Lease with default parameters (tests default limit and leaseDurationMs)
      const defaultLease = outbox.leasePending();
      expect(defaultLease).toHaveLength(1);

      // Fast-forward lease expiration
      const activeMsg = outbox.get(entry.id);
      expect(activeMsg).toBeDefined();
      activeMsg!.leaseExpiresAt = new Date(Date.now() - 5000);

      // Worker 2 leases the expired entry
      const leasedWorker2 = outbox.leasePending(1, 1000);
      expect(leasedWorker2).toHaveLength(1);
      expect(leasedWorker2[0].id).toBe(entry.id);

      // Worker 2 successfully publishes
      const published = outbox.markPublished(entry.id);
      expect(published).toBe(true);

      const finalized = outbox.get(entry.id);
      expect(finalized?.status).toBe("published");
      expect(finalized?.publishedAt).toBeDefined();

      // Ensure outbox handle invalid operations gracefully
      expect(outbox.markPublished("non-existent")).toBe(false);
      expect(outbox.markFailed("non-existent")).toBe(false);
    });

    it("should mark outbox entry failed when retry count reaches max", () => {
      const outbox = new OutboxManager();
      const entry = outbox.createEntry({
        organizationId: "org-fault-2",
        topic: TOPICS.NORMALIZED,
        eventKey: "svc-beta",
        payload: { error: true },
      });

      // markFailed using default maxRetries (3)
      expect(outbox.markFailed(entry.id)).toBe(true);
      expect(outbox.get(entry.id)?.status).toBe("pending");
      expect(outbox.markFailed(entry.id)).toBe(true);
      expect(outbox.get(entry.id)?.status).toBe("pending");
      expect(outbox.markFailed(entry.id)).toBe(true);
      expect(outbox.get(entry.id)?.status).toBe("failed");
      expect(outbox.size()).toBe(1);
    });
  });

  describe("2. Error Classification and Dead-Letter Queue Routing", () => {
    it("should classify schema and poison errors as permanent immediately", () => {
      expect(classifyError(new SyntaxError("Unexpected token"))).toBe("PERMANENT");
      expect(classifyError(new Error("Zod validation failed: invalid payload"))).toBe("PERMANENT");
      expect(classifyError(new Error("Malformed JSON received"))).toBe("PERMANENT");
      expect(classifyError(new Error("Unsupported event version v99"))).toBe("PERMANENT");
      expect(classifyError(new Error("Event marked as poison pill"))).toBe("PERMANENT");
      expect(classifyError({ name: "ZodError" })).toBe("PERMANENT");

      const permanentDecision = determineNextRoute(1, new Error("Poison message"));
      expect(permanentDecision.destinationTopic).toBe(TOPICS.DEAD_LETTER);
      expect(permanentDecision.shouldRetry).toBe(false);
      expect(permanentDecision.delayMs).toBe(0);
    });

    it("should retry transient errors with progression until MAX_RETRY_ATTEMPTS", () => {
      const transientErr = new Error("Connection timed out to downstream broker");
      expect(classifyError(transientErr)).toBe("TRANSIENT");

      // Attempt 1 -> Retry queue 1 (1000ms delay)
      const decision1 = determineNextRoute(1, transientErr);
      expect(decision1.destinationTopic).toBe(TOPICS.RETRY_1);
      expect(decision1.shouldRetry).toBe(true);
      expect(decision1.nextAttempt).toBe(2);
      expect(decision1.delayMs).toBe(1000);

      // Attempt 2 -> Retry queue 2 (2000ms delay)
      const decision2 = determineNextRoute(2, transientErr);
      expect(decision2.destinationTopic).toBe(TOPICS.RETRY_2);
      expect(decision2.shouldRetry).toBe(true);
      expect(decision2.nextAttempt).toBe(3);

      // Attempt 3 -> Retry queue 2
      const decision3 = determineNextRoute(3, transientErr);
      expect(decision3.destinationTopic).toBe(TOPICS.RETRY_2);
      expect(decision3.shouldRetry).toBe(true);
      expect(decision3.nextAttempt).toBe(4);

      // Attempt 4 -> Max exceeded -> DLQ
      const decision4 = determineNextRoute(MAX_RETRY_ATTEMPTS, transientErr);
      expect(decision4.destinationTopic).toBe(TOPICS.DEAD_LETTER);
      expect(decision4.shouldRetry).toBe(false);
      expect(decision4.reason).toContain("Max retry attempts");
    });
  });

  describe("3. Transactional Inbox Deduplication and Idempotency", () => {
    it("should reject duplicate event recording across organizations", () => {
      const inbox = new InboxDeduplicator();

      const record1 = {
        organizationId: "org-1",
        eventId: "evt-dup-100",
        eventType: "AlertTriggered",
        correlationId: "corr-100",
      };

      expect(inbox.isProcessed("org-1", "evt-dup-100")).toBe(false);
      expect(inbox.recordProcessed(record1)).toBe(true);
      expect(inbox.isProcessed("org-1", "evt-dup-100")).toBe(true);

      // Re-recording same event in same org returns false
      expect(inbox.recordProcessed(record1)).toBe(false);

      // Same eventId in a different org is treated independently (tenant isolation)
      const recordOtherOrg = {
        organizationId: "org-2",
        eventId: "evt-dup-100",
        eventType: "AlertTriggered",
      };
      expect(inbox.isProcessed("org-2", "evt-dup-100")).toBe(false);
      expect(inbox.recordProcessed(recordOtherOrg)).toBe(true);
      expect(inbox.count()).toBe(2);
    });
  });

  describe("4. Consumer Backpressure, Lag, and Drain", () => {
    it("should track lag, pause consumption, and drain cleanly", async () => {
      const bus = new InMemoryKafkaBus();
      const correlation = new CorrelationEngine(30 * 60 * 1000);
      const worker = new EventProcessorWorker(bus, correlation);

      await worker.start();

      // Publish 10 messages
      for (let i = 0; i < 10; i++) {
        bus.publish(TOPICS.NORMALIZED, `svc-${i}`, {
          eventId: `evt-bp-${i}`,
          eventType: "AlertTriggered",
          schemaVersion: "1.0.0",
          organizationId: "org-bp",
          serviceId: `svc-${i}`,
          occurredAt: new Date().toISOString(),
          receivedAt: new Date().toISOString(),
          correlationId: `corr-${i}`,
          payload: { alertName: "LatencySpike", severity: "high" },
        });
      }

      expect(bus.getLag(TOPICS.NORMALIZED)).toBe(10);

      // Pause worker
      worker.pause();
      expect(worker.isPausedConsumer()).toBe(true);

      // Processing while paused returns 0
      const processedWhilePaused = worker.processBatch(10);
      expect(processedWhilePaused).toBe(0);
      expect(bus.getLag(TOPICS.NORMALIZED)).toBe(10);

      // Resume worker
      worker.resume();
      expect(worker.isPausedConsumer()).toBe(false);

      // Process in a batch of 5
      const processedBatch1 = worker.processBatch(5);
      expect(processedBatch1).toBe(5);
      expect(bus.getLag(TOPICS.NORMALIZED)).toBe(5);

      // Stop worker drains remaining messages
      await worker.stop();
      expect(bus.getLag(TOPICS.NORMALIZED)).toBe(0);
    });
  });

  describe("5. Multi-Tenant Interleaved Stream Isolation", () => {
    it("should maintain strict isolation when events from distinct orgs target the same serviceId", async () => {
      const bus = new InMemoryKafkaBus();
      const correlation = new CorrelationEngine(30 * 60 * 1000);
      const worker = new EventProcessorWorker(bus, correlation);
      await worker.start();

      const orgs = ["org-north", "org-south", "org-west"];
      const commonService = "checkout-gateway";
      const now = new Date().toISOString();

      // Interleave events across orgs
      for (let i = 0; i < 15; i++) {
        const orgId = orgs[i % orgs.length];
        const envelope: BaseEventEnvelope = {
          eventId: `evt-interleave-${i}`,
          eventType: "AlertTriggered",
          schemaVersion: "1.0.0",
          organizationId: orgId,
          serviceId: commonService,
          occurredAt: now,
          receivedAt: now,
          correlationId: `corr-${orgId}`,
          payload: { alertName: "PaymentTimeout", severity: "critical" },
        };
        bus.publish(TOPICS.NORMALIZED, commonService, envelope);
      }

      worker.processBatch(20);

      // Verify each org got its own distinct incident
      for (const orgId of orgs) {
        const active = correlation.getActiveIncident(orgId, commonService, new Date(now).getTime());
        expect(active).toBeDefined();
        expect(active?.organizationId).toBe(orgId);
        expect(active?.serviceId).toBe(commonService);
        // Each org received exactly 5 events
        expect(active?.eventIds).toHaveLength(5);
      }

      // Check all active incidents count across the 3 orgs
      const allIncidents = correlation.getAllActiveIncidents();
      expect(allIncidents).toHaveLength(3);
    });
  });

  describe("6. Incident State Machine Finite Transitions & Optimistic Concurrency", () => {
    it("should allow valid state transitions and guard against illegal transitions", () => {
      // Valid: open -> acknowledged
      expect(isValidTransition("open", "acknowledged")).toBe(true);
      const acked = applyIncidentTransition({
        incidentId: "inc-sm-1",
        currentStatus: "open",
        currentVersion: 1,
        expectedVersion: 1,
        newStatus: "acknowledged",
        actorId: "usr-admin-1",
      });
      expect(acked.newStatus).toBe("acknowledged");
      expect(acked.newVersion).toBe(2);

      // Valid: acknowledged -> investigating
      expect(isValidTransition(acked.newStatus, "investigating")).toBe(true);
      const investigating = applyIncidentTransition({
        incidentId: "inc-sm-1",
        currentStatus: acked.newStatus,
        currentVersion: acked.newVersion,
        expectedVersion: acked.newVersion,
        newStatus: "investigating",
        actorId: "usr-admin-1",
      });
      expect(investigating.newStatus).toBe("investigating");
      expect(investigating.newVersion).toBe(3);

      // Valid: investigating -> mitigated
      expect(isValidTransition(investigating.newStatus, "mitigated")).toBe(true);
      const mitigated = applyIncidentTransition({
        incidentId: "inc-sm-1",
        currentStatus: investigating.newStatus,
        currentVersion: investigating.newVersion,
        expectedVersion: investigating.newVersion,
        newStatus: "mitigated",
        actorId: "usr-admin-1",
      });
      expect(mitigated.newStatus).toBe("mitigated");
      expect(mitigated.newVersion).toBe(4);

      // Valid: mitigated -> resolved
      expect(isValidTransition(mitigated.newStatus, "resolved")).toBe(true);
      const resolved = applyIncidentTransition({
        incidentId: "inc-sm-1",
        currentStatus: mitigated.newStatus,
        currentVersion: mitigated.newVersion,
        expectedVersion: mitigated.newVersion,
        newStatus: "resolved",
        actorId: "usr-admin-1",
      });
      expect(resolved.newStatus).toBe("resolved");
      expect(resolved.newVersion).toBe(5);

      // Valid: resolved -> open (Re-open)
      expect(isValidTransition(resolved.newStatus, "open")).toBe(true);
      const reopened = applyIncidentTransition({
        incidentId: "inc-sm-1",
        currentStatus: resolved.newStatus,
        currentVersion: resolved.newVersion,
        expectedVersion: resolved.newVersion,
        newStatus: "open",
        actorId: "usr-admin-1",
      });
      expect(reopened.newStatus).toBe("open");
      expect(reopened.newVersion).toBe(6);

      // Same-state transition (from === to returns true)
      expect(isValidTransition("open", "open")).toBe(true);

      // Unknown state transition
      expect(isValidTransition("unknown" as any, "open")).toBe(false);
      expect(() => assertValidTransition("unknown" as any, "open")).toThrow(
        /Invalid incident transition/,
      );

      // Invalid: open cannot jump directly to mitigated
      expect(isValidTransition("open", "mitigated")).toBe(false);
      expect(() =>
        applyIncidentTransition({
          incidentId: "inc-sm-1",
          currentStatus: "open",
          currentVersion: 1,
          expectedVersion: 1,
          newStatus: "mitigated",
          actorId: "usr-admin-1",
        }),
      ).toThrow(/Invalid incident transition/);

      // Invalid: Stale version (Optimistic concurrency conflict)
      expect(() =>
        applyIncidentTransition({
          incidentId: "inc-sm-1",
          currentStatus: "open",
          currentVersion: 1,
          expectedVersion: 999, // Stale version
          newStatus: "acknowledged",
          actorId: "usr-admin-1",
        }),
      ).toThrow(/Optimistic concurrency conflict/);
    });
  });

  describe("7. Auth Roles and Tenant Denial", () => {
    it("should enforce role hierarchy and deny unauthorized actions", () => {
      // Role hierarchy
      expect(hasRequiredRole("org_admin", "viewer")).toBe(true);
      expect(hasRequiredRole("org_admin", "on_call")).toBe(true);
      expect(hasRequiredRole("org_admin", "org_admin")).toBe(true);

      expect(hasRequiredRole("on_call", "viewer")).toBe(true);
      expect(hasRequiredRole("on_call", "on_call")).toBe(true);
      expect(hasRequiredRole("on_call", "org_admin")).toBe(false);

      expect(hasRequiredRole("viewer", "viewer")).toBe(true);
      expect(hasRequiredRole("viewer", "on_call")).toBe(false);
      expect(hasRequiredRole("viewer", "org_admin")).toBe(false);

      // assertRole assertions
      const viewerUser: UserContext = {
        userId: "usr-view",
        email: "v@example.com",
        organizationId: "org-1",
        role: "viewer",
      };
      const onCallUser: UserContext = {
        userId: "usr-call",
        email: "c@example.com",
        organizationId: "org-1",
        role: "on_call",
      };

      expect(() => assertRole(viewerUser, "on_call")).toThrow(/Insufficient permissions/);
      expect(() => assertRole(onCallUser, "org_admin")).toThrow(/Insufficient permissions/);
      expect(() => assertRole(viewerUser, "viewer")).not.toThrow();
      expect(() => assertRole(undefined, "viewer")).toThrow(/Authentication required/);

      // resolveUserContext from bearer tokens
      const adminCtx = resolveUserContext({
        authorization: "Bearer token-admin",
      });
      expect(adminCtx.role).toBe("org_admin");

      const onCallCtx = resolveUserContext({
        authorization: "Bearer token-oncall",
      });
      expect(onCallCtx.role).toBe("on_call");

      const otherTenantCtx = resolveUserContext({
        authorization: "Bearer token-other-org",
      });
      expect(otherTenantCtx.organizationId).toBe("org-other-tenant");

      // Dev headers resolution
      const devCtx = resolveUserContext({
        "x-dev-user-id": "usr-custom",
        "x-dev-org-id": "org-custom",
        "x-dev-role": "on_call",
      });
      expect(devCtx.userId).toBe("usr-custom");
      expect(devCtx.organizationId).toBe("org-custom");
      expect(devCtx.role).toBe("on_call");

      // Dev headers resolution with default values and invalid roles
      const defaultDevCtx = resolveUserContext({});
      expect(defaultDevCtx.role).toBe("org_admin");

      const invalidRoleCtx = resolveUserContext({
        "x-dev-role": "superman" as any,
      });
      expect(invalidRoleCtx.role).toBe("viewer");

      // Invalid bearer token with dev bypass disabled
      const prevBypass = process.env.DEV_AUTH_BYPASS;
      try {
        process.env.DEV_AUTH_BYPASS = "false";
        expect(() => resolveUserContext({ authorization: "Bearer invalid-unknown-token" })).toThrow(
          /Missing or invalid authentication/,
        );
        expect(() => resolveUserContext({})).toThrow(/Missing or invalid authentication/);
      } finally {
        process.env.DEV_AUTH_BYPASS = prevBypass;
      }
    });
  });
});
