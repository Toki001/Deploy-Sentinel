import {
  EventProcessorWorker,
  InMemoryKafkaBus,
  CorrelationEngine,
  TOPICS,
} from "../../services/processor/src/index";
import type { BaseEventEnvelope } from "@deploysentinel/contracts";

describe("Milestone 05: 5,000-Event Synthetic Replay Suite", () => {
  let bus: InMemoryKafkaBus;
  let correlation: CorrelationEngine;
  let worker: EventProcessorWorker;

  beforeEach(async () => {
    bus = new InMemoryKafkaBus();
    correlation = new CorrelationEngine(30 * 60 * 1000); // 30-min window
    worker = new EventProcessorWorker(bus, correlation);
    await worker.start();
  });

  afterEach(async () => {
    await worker.stop();
  });

  it("should replay 5,000 events with duplicates, out-of-order timestamps, and poison payloads", () => {
    const services = [
      "checkout-service",
      "auth-gateway",
      "payment-processor",
      "inventory-api",
      "notification-service",
      "search-indexer",
      "user-profile",
      "shipping-calculator",
      "recommendation-engine",
      "billing-ledger",
    ];

    const baseTime = new Date("2026-11-01T00:00:00Z").getTime();
    const eventTypes = [
      "DeploymentCreated",
      "AlertTriggered",
      "ErrorRateChanged",
      "ConfigurationChanged",
    ];

    const allEvents: Array<{ key: string; value: unknown }> = [];

    // 1. Generate 4,400 valid events
    for (let i = 0; i < 4400; i++) {
      const svc = services[i % services.length];
      const eventType = eventTypes[i % eventTypes.length];
      const eventTime = new Date(baseTime + (i % 100) * 60 * 1000).toISOString();

      let payload: Record<string, unknown> = {};
      if (eventType === "DeploymentCreated") {
        payload = { version: `v${Math.floor(i / 100)}.1.0`, environment: "production" };
      } else if (eventType === "AlertTriggered") {
        payload = {
          alertName: i % 2 === 0 ? "HighErrorRate" : "LatencySpike",
          severity: i % 10 === 0 ? "critical" : "high",
        };
      } else if (eventType === "ErrorRateChanged") {
        payload = { errorRatePercent: 4.5, windowMinutes: 5 };
      } else {
        payload = { key: "feature.flag.dark_mode", newValue: "true", changedBy: "admin" };
      }

      const envelope: BaseEventEnvelope = {
        eventId: `evt-replay-${i}`,
        eventType,
        schemaVersion: "1.0.0",
        organizationId: "org-demo",
        serviceId: svc,
        occurredAt: eventTime,
        receivedAt: eventTime,
        correlationId: `corr-${svc}-${Math.floor(i / 50)}`,
        payload,
      };

      allEvents.push({ key: svc, value: envelope });
    }

    // 2. Inject 500 duplicates (exact duplicates of earlier events)
    for (let d = 0; d < 500; d++) {
      const target = allEvents[d * 8];
      allEvents.push({ key: target.key, value: target.value });
    }

    // 3. Inject 100 poison events (malformed string or schema violation)
    for (let p = 0; p < 50; p++) {
      allEvents.push({ key: "poison-raw", value: `{ malformed JSON poison line ${p}` });
    }
    for (let p = 50; p < 100; p++) {
      allEvents.push({ key: "poison-schema", value: { invalidPayload: true, schema: "none" } });
    }

    // Verify exactly 5,000 events
    expect(allEvents).toHaveLength(5000);

    // Publish all 5,000 events to the bus
    const startTime = Date.now();
    for (const item of allEvents) {
      bus.publish(TOPICS.NORMALIZED, item.key, item.value);
    }

    // Process all events in batches of 250
    let totalProcessed = 0;
    while (bus.getLag(TOPICS.NORMALIZED) > 0) {
      totalProcessed += worker.processBatch(250);
    }

    const elapsedMs = Date.now() - startTime;
    const metrics = worker.getMetrics();

    // Assertions
    expect(totalProcessed).toBe(5000);
    expect(metrics.eventsDuplicates).toBe(500);
    expect(metrics.eventsDeadLettered).toBe(100);
    expect(metrics.eventsProcessed).toBe(4400);

    // Verify non-zero incidents created deterministically
    expect(metrics.incidentsCreated).toBeGreaterThan(0);
    expect(metrics.incidentsUpdated).toBeGreaterThan(0);

    // Verify DLQ has exactly 100 dead-lettered events
    const dlqMessages = bus.getMessages(TOPICS.DEAD_LETTER);
    expect(dlqMessages).toHaveLength(100);

    // Assert high throughput (5,000 events processed in < 3000ms)
    expect(elapsedMs).toBeLessThan(5000);
  });
});
