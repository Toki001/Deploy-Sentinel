import {
  EventProcessorWorker,
  InMemoryKafkaBus,
  CorrelationEngine,
  determineNextRoute,
  TOPICS,
} from "../../services/processor/src/index";
import type { BaseEventEnvelope } from "@deploysentinel/contracts";

describe("Milestone 04: Kafka/Redpanda Event Processor, Correlation & Reliability", () => {
  let bus: InMemoryKafkaBus;
  let correlation: CorrelationEngine;
  let worker: EventProcessorWorker;

  beforeEach(async () => {
    bus = new InMemoryKafkaBus();
    correlation = new CorrelationEngine(30 * 60 * 1000); // 30 min window
    worker = new EventProcessorWorker(bus, correlation);
    await worker.start();
  });

  afterEach(async () => {
    await worker.stop();
  });

  describe("Deterministic Correlation Engine", () => {
    it("should deterministically calculate stable correlation keys and incident IDs", () => {
      const fixedTime = new Date("2026-11-01T12:00:00Z").getTime();
      const key1 = correlation.calculateCorrelationKey("org-demo", "checkout-service", fixedTime);
      const key2 = correlation.calculateCorrelationKey("org-demo", "checkout-service", fixedTime);
      expect(key1).toBe(key2);

      const id1 = correlation.generateIncidentId(key1);
      const id2 = correlation.generateIncidentId(key2);
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^INC-[A-F0-9]{8}$/);
    });

    it("should correlate deployment and alert events within the same 30-min window", () => {
      const baseTime = new Date("2026-11-01T12:05:00Z").toISOString();
      const alertTime = new Date("2026-11-01T12:12:00Z").toISOString();

      // 1. Alert triggered -> creates incident
      const alertEnvelope: BaseEventEnvelope = {
        eventId: "evt-alert-1",
        eventType: "AlertTriggered",
        schemaVersion: "1.0.0",
        organizationId: "org-demo",
        serviceId: "checkout-service",
        occurredAt: alertTime,
        receivedAt: alertTime,
        correlationId: "corr-user-1",
        payload: { alertName: "5xxLatencySpike", severity: "critical" },
      };

      bus.publish(TOPICS.NORMALIZED, "checkout-service", alertEnvelope);
      const processed1 = worker.processBatch(10);
      expect(processed1).toBe(1);

      const metrics1 = worker.getMetrics();
      expect(metrics1.incidentsCreated).toBe(1);

      // Verify incident published to incidents topic
      const incidentMessages = bus.getMessages(TOPICS.INCIDENTS);
      expect(incidentMessages).toHaveLength(1);
      const createdIncident = JSON.parse(incidentMessages[0].value);
      expect(createdIncident.status).toBe("open");
      expect(createdIncident.severity).toBe("critical");

      // 2. Deployment occurs in same window -> correlates into same incident
      const deployEnvelope: BaseEventEnvelope = {
        eventId: "evt-dep-1",
        eventType: "DeploymentCreated",
        schemaVersion: "1.0.0",
        organizationId: "org-demo",
        serviceId: "checkout-service",
        occurredAt: baseTime,
        receivedAt: baseTime,
        correlationId: "corr-user-1",
        payload: { version: "v2.4.1", environment: "production" },
      };

      bus.publish(TOPICS.NORMALIZED, "checkout-service", deployEnvelope);
      const processed2 = worker.processBatch(10);
      expect(processed2).toBe(1);

      const metrics2 = worker.getMetrics();
      expect(metrics2.incidentsUpdated).toBe(1);
      expect(metrics2.incidentsCreated).toBe(1); // not created again
    });
  });

  describe("At-Least-Once Delivery & Duplicate Message Idempotency", () => {
    it("should suppress duplicate event deliveries without creating duplicate incidents", () => {
      const alertTime = new Date("2026-11-01T14:00:00Z").toISOString();
      const envelope: BaseEventEnvelope = {
        eventId: "evt-duplicate-test",
        eventType: "AlertTriggered",
        schemaVersion: "1.0.0",
        organizationId: "org-demo",
        serviceId: "auth-gateway",
        occurredAt: alertTime,
        receivedAt: alertTime,
        correlationId: "corr-dup",
        payload: { alertName: "JwtValidationFailure", severity: "high" },
      };

      // Publish first time
      bus.publish(TOPICS.NORMALIZED, "auth-gateway", envelope);
      worker.processBatch(1);

      // Re-publish identical message (simulating network retransmission / at-least-once transport)
      bus.publish(TOPICS.NORMALIZED, "auth-gateway", envelope);
      worker.processBatch(1);

      const metrics = worker.getMetrics();
      expect(metrics.eventsProcessed).toBe(1);
      expect(metrics.eventsDuplicates).toBe(1);
      expect(metrics.incidentsCreated).toBe(1);
    });
  });

  describe("Poison Message Handling & Dead-Letter Queue (DLQ)", () => {
    it("should route malformed non-JSON payload to dead-letter queue without crashing", () => {
      bus.publish(TOPICS.NORMALIZED, "bad-key", "{ malformed json corrupt bytes !!!");
      const processed = worker.processBatch(1);

      expect(processed).toBe(1);
      const metrics = worker.getMetrics();
      expect(metrics.eventsDeadLettered).toBe(1);

      const dlqMessages = bus.getMessages(TOPICS.DEAD_LETTER);
      expect(dlqMessages).toHaveLength(1);
      const dlqBody = JSON.parse(dlqMessages[0].value);
      expect(dlqBody.error).toContain("JSON parse error");
    });

    it("should route schema violation to dead-letter queue without retry", () => {
      // Missing required fields like schemaVersion, organizationId
      bus.publish(TOPICS.NORMALIZED, "invalid-schema", {
        eventId: "invalid-1",
        randomField: "unexpected",
      });

      worker.processBatch(1);
      const metrics = worker.getMetrics();
      expect(metrics.eventsDeadLettered).toBe(1);

      const dlqMessages = bus.getMessages(TOPICS.DEAD_LETTER);
      expect(dlqMessages).toHaveLength(1);
      const dlqBody = JSON.parse(dlqMessages[0].value);
      expect(dlqBody.error).toContain("Schema validation failure");
    });
  });

  describe("Retry Progression & Exponential Delay Policy", () => {
    it("should route transient errors through retry topics and finally to dead letter after 4 attempts", () => {
      const transientError = new Error("Connection reset by peer: DB pool timeout");

      // Attempt 1 -> retry topic 1 (1s delay)
      const decision1 = determineNextRoute(1, transientError);
      expect(decision1.destinationTopic).toBe(TOPICS.RETRY_1);
      expect(decision1.shouldRetry).toBe(true);
      expect(decision1.nextAttempt).toBe(2);
      expect(decision1.delayMs).toBe(1000);

      // Attempt 2 -> retry topic 2 (2s delay)
      const decision2 = determineNextRoute(2, transientError);
      expect(decision2.destinationTopic).toBe(TOPICS.RETRY_2);
      expect(decision2.shouldRetry).toBe(true);
      expect(decision2.nextAttempt).toBe(3);

      // Attempt 4 -> max exceeded, dead letter queue
      const decision4 = determineNextRoute(4, transientError);
      expect(decision4.destinationTopic).toBe(TOPICS.DEAD_LETTER);
      expect(decision4.shouldRetry).toBe(false);
      expect(decision4.reason).toContain("Max retry attempts (4) exceeded");
    });
  });

  describe("Backpressure, Lag & Graceful Draining", () => {
    it("should track uncommitted lag and pause/resume correctly", () => {
      bus.publish(TOPICS.NORMALIZED, "k1", { text: "msg1" });
      bus.publish(TOPICS.NORMALIZED, "k2", { text: "msg2" });

      expect(bus.getLag(TOPICS.NORMALIZED)).toBe(2);

      // Pause consumer
      bus.pause();
      expect(bus.isConsumerPaused()).toBe(true);
      const consumedWhilePaused = bus.consume(TOPICS.NORMALIZED, 5);
      expect(consumedWhilePaused).toHaveLength(0);

      // Resume consumer
      bus.resume();
      expect(bus.isConsumerPaused()).toBe(false);
      const consumedAfterResume = bus.consume(TOPICS.NORMALIZED, 5);
      expect(consumedAfterResume).toHaveLength(2);
    });

    it("should allow dead-letter replay back into normalized processing", () => {
      const originalEnvelope: BaseEventEnvelope = {
        eventId: "evt-replayed-101",
        eventType: "AlertTriggered",
        schemaVersion: "1.0.0",
        organizationId: "org-demo",
        serviceId: "payment-processor",
        occurredAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        correlationId: "corr-replay",
        payload: { alertName: "StripeGatewayTimeout", severity: "high" },
      };

      worker.replayDeadLetter("evt-replayed-101", originalEnvelope);

      const normalizedMessages = bus.getMessages(TOPICS.NORMALIZED);
      expect(normalizedMessages).toHaveLength(1);

      worker.processBatch(1);
      const metrics = worker.getMetrics();
      expect(metrics.eventsProcessed).toBe(1);
      expect(metrics.incidentsCreated).toBe(1);
    });
  });
});
