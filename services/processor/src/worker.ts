import { logger } from "@deploysentinel/shared";
import { InboxDeduplicator } from "@deploysentinel/db";
import { BaseEventEnvelopeSchema, type BaseEventEnvelope } from "@deploysentinel/contracts";
import { TOPICS, type TopicName } from "./topics.js";
import { CorrelationEngine, type CorrelatedIncident } from "./correlation.js";
import { InMemoryKafkaBus, type QueueMessage } from "./queue.js";
import { determineNextRoute } from "./retry-strategy.js";

export interface ProcessorMetrics {
  eventsProcessed: number;
  eventsDuplicates: number;
  eventsDeadLettered: number;
  eventsRetried: number;
  incidentsCreated: number;
  incidentsUpdated: number;
}

export class EventProcessorWorker {
  private isRunning = false;
  private bus: InMemoryKafkaBus;
  private correlation: CorrelationEngine;
  private deduplicator: InboxDeduplicator;
  private metrics: ProcessorMetrics;

  constructor(bus?: InMemoryKafkaBus, correlation?: CorrelationEngine) {
    this.bus = bus || new InMemoryKafkaBus();
    this.correlation = correlation || new CorrelationEngine();
    this.deduplicator = new InboxDeduplicator();
    this.metrics = {
      eventsProcessed: 0,
      eventsDuplicates: 0,
      eventsDeadLettered: 0,
      eventsRetried: 0,
      incidentsCreated: 0,
      incidentsUpdated: 0,
    };
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    logger.info("EventProcessorWorker started processing Kafka events");
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.bus.pause();
    logger.info("EventProcessorWorker stopped gracefully (drained inflight messages)");
  }

  public processBatch(batchSize = 20): number {
    if (!this.isRunning) return 0;

    const messages = this.bus.consume(TOPICS.NORMALIZED, batchSize);
    for (const msg of messages) {
      this.handleMessage(msg);
      this.bus.commitOffset(TOPICS.NORMALIZED, msg.partition, msg.offset);
    }

    return messages.length;
  }

  public handleMessage(msg: QueueMessage): { success: boolean; action: string } {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(msg.value);
    } catch (parseErr) {
      // Poison JSON payload
      const decision = determineNextRoute(msg.attempt, parseErr);
      this.bus.publish(decision.destinationTopic, msg.key, {
        raw: msg.value,
        error: "JSON parse error in event envelope",
        failedAt: new Date().toISOString(),
      });
      this.metrics.eventsDeadLettered += 1;
      return { success: false, action: "DEAD_LETTER_POISON_JSON" };
    }

    // Schema validation using Zod
    const validation = BaseEventEnvelopeSchema.safeParse(parsedJson);
    if (!validation.success) {
      const decision = determineNextRoute(msg.attempt, validation.error);
      this.bus.publish(decision.destinationTopic, msg.key, {
        raw: parsedJson,
        error: "Schema validation failure",
        issues: validation.error.issues,
        failedAt: new Date().toISOString(),
      });
      this.metrics.eventsDeadLettered += 1;
      return { success: false, action: "DEAD_LETTER_SCHEMA_VIOLATION" };
    }

    const envelope = validation.data as BaseEventEnvelope;

    // Idempotent Inbox Check (At-least-once transport to exactly-once business effects)
    const isNew = this.deduplicator.recordProcessed({
      organizationId: envelope.organizationId,
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      correlationId: envelope.correlationId,
    });

    if (!isNew) {
      this.metrics.eventsDuplicates += 1;
      return { success: true, action: "DUPLICATE_SUPPRESSED" };
    }

    // Deterministic Correlation
    const result = this.correlation.processEvent(envelope);
    this.metrics.eventsProcessed += 1;

    if (result.action === "CREATED") {
      this.metrics.incidentsCreated += 1;
      this.bus.publish(TOPICS.INCIDENTS, envelope.serviceId, result.incident);
    } else if (result.action === "UPDATED") {
      this.metrics.incidentsUpdated += 1;
      this.bus.publish(TOPICS.INCIDENTS, envelope.serviceId, result.incident);
    }

    return { success: true, action: result.action };
  }

  /**
   * Replay an event from dead-letter back to normalized queue.
   */
  public replayDeadLetter(eventId: string, rawPayload: unknown): void {
    logger.info(`Replaying dead letter event ${eventId} to ${TOPICS.NORMALIZED}`);
    this.bus.publish(TOPICS.NORMALIZED, `replay-${eventId}`, rawPayload, 1);
  }

  public getBus(): InMemoryKafkaBus {
    return this.bus;
  }

  public getCorrelation(): CorrelationEngine {
    return this.correlation;
  }

  public getMetrics(): ProcessorMetrics {
    return { ...this.metrics };
  }

  public getStatus() {
    return {
      running: this.isRunning,
      workerId: "processor-node-1",
      lag: this.bus.getLag(TOPICS.NORMALIZED),
      metrics: this.metrics,
    };
  }
}
