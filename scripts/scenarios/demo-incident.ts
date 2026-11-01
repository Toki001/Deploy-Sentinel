import { InMemoryKafkaBus } from "../../services/processor/src/queue";
import { TOPICS } from "../../services/processor/src/topics";
import { CorrelationEngine } from "../../services/processor/src/correlation";
import { EventProcessorWorker } from "../../services/processor/src/worker";
import {
  DiagnosticStore,
  InvestigationRunner,
  DeterministicOfflineProvider,
} from "../../packages/ai/src/index";
import { applyIncidentTransition, type IncidentStatus } from "../../packages/db/src/index";
import type { BaseEventEnvelope } from "../../packages/contracts/src/index";

// ==============================================================================
// DeploySentinel — End-to-End Synthetic Incident Walkthrough Scenario
// ==============================================================================

export interface DemoRunResults {
  incidentId: string;
  initialStatus: IncidentStatus;
  finalStatus: IncidentStatus;
  eventsInjected: number;
  duplicateEventsReplayed: number;
  incidentsCreated: number;
  investigationHypothesesCount: number;
  topRankedCause: string;
  evidenceValidated: boolean;
  zeroExtraIncidentsOnReplay: boolean;
}

export async function runDemoScenario(): Promise<DemoRunResults> {
  console.log("\n=======================================================");
  console.log("DeploySentinel — End-to-End Incident Walkthrough Demo");
  console.log("=======================================================\n");

  const orgId = "org-enterprise-001";
  const serviceId = "svc-payments";
  const bus = new InMemoryKafkaBus();
  const correlation = new CorrelationEngine(30 * 60 * 1000); // 30 min window
  const worker = new EventProcessorWorker(bus, correlation);
  const diagStore = new DiagnosticStore();
  const aiProvider = new DeterministicOfflineProvider(diagStore);
  const investigator = new InvestigationRunner(aiProvider, diagStore);

  await worker.start();

  // --------------------------------------------------------------------------
  // Phase 1: Healthy Baseline
  // --------------------------------------------------------------------------
  console.log("[Phase 1] Service 'svc-payments' in healthy baseline state (0 incidents).");

  // --------------------------------------------------------------------------
  // Phase 2: Faulty Deployment Injection
  // --------------------------------------------------------------------------
  // Anchor all events deterministically within a single past 30-minute correlation bucket
  const now = Date.now();
  const baseBucketTime =
    Math.floor((now - 15 * 60 * 1000) / (30 * 60 * 1000)) * (30 * 60 * 1000) + 5 * 60 * 1000;
  const depTime = new Date(baseBucketTime).toISOString();
  const depEvent: BaseEventEnvelope = {
    eventId: "evt-dep-faulty-101",
    eventType: "DeploymentCreated",
    schemaVersion: "1.0.0",
    organizationId: orgId,
    serviceId,
    environment: "production",
    occurredAt: depTime,
    receivedAt: depTime,
    correlationId: "corr-deploy-101",
    payload: {
      deploymentId: "dep-v2-4-0",
      version: "v2.4.0",
      commitSha: "f83a1b9c",
      deployedBy: "release-bot",
      status: "succeeded",
    },
  };

  diagStore.seed({
    deployments: [
      {
        id: "evi-dep-v2-4-0",
        serviceId,
        organizationId: orgId,
        version: "v2.4.0",
        commitSha: "f83a1b9c",
        deployedAt: depTime,
        status: "success",
        changelog: "Add optimistic lock retry and connection pooling",
      },
    ],
  });

  bus.publish(TOPICS.NORMALIZED, serviceId, depEvent);
  worker.processBatch();
  console.log("[Phase 2] Deployed version v2.4.0 (commit: f83a1b9c).");

  // --------------------------------------------------------------------------
  // Phase 3: Error Rate Spike & Telemetry
  // --------------------------------------------------------------------------
  const errTime = new Date(baseBucketTime + 2 * 60 * 1000).toISOString();
  const errorEvent: BaseEventEnvelope = {
    eventId: "evt-err-spike-102",
    eventType: "ErrorRateChanged",
    schemaVersion: "1.0.0",
    organizationId: orgId,
    serviceId,
    environment: "production",
    occurredAt: errTime,
    receivedAt: errTime,
    correlationId: "corr-err-102",
    payload: {
      previousRate: 0.04,
      currentRate: 8.75,
      threshold: 1.0,
      windowMinutes: 5,
    },
  };

  diagStore.seed({
    errorRates: [
      {
        serviceId,
        organizationId: orgId,
        timestamp: errTime,
        errorRatePercent: 8.75,
        totalRequests: 15420,
        errorCount: 1350,
      },
    ],
    traces: [
      {
        id: "evi-trace-500-1",
        serviceId,
        organizationId: orgId,
        traceId: "tr-error-500-checkout",
        operationName: "POST /v1/checkout",
        durationMs: 4120,
        httpStatus: 500,
        error: "ConnectionTimeout: database connection pool exhausted",
        timestamp: errTime,
      },
    ],
    alerts: [
      {
        id: "evi-alert-5xx",
        serviceId,
        organizationId: orgId,
        alertName: "Payments5xxHigh",
        severity: "critical",
        description: "5xx error rate exceeded 5% threshold following deploy",
        triggeredAt: errTime,
      },
    ],
  });

  bus.publish(TOPICS.NORMALIZED, serviceId, errorEvent);
  worker.processBatch();
  console.log("[Phase 3] Elevated error rate detected (8.75% 5xx, DB pool exhaustion).");

  // --------------------------------------------------------------------------
  // Phase 4: Deterministic Correlation Engine
  // --------------------------------------------------------------------------
  const activeIncidents = correlation.getAllActiveIncidents();
  console.log(`[Phase 4] Correlated incidents created: ${activeIncidents.length}`);
  const incident = activeIncidents[0];
  console.log(
    `          Incident ID: ${incident.id} | Severity: ${incident.severity} | Status: ${incident.status}`,
  );

  // --------------------------------------------------------------------------
  // Phase 5: Bounded Read-Only AI Investigation
  // --------------------------------------------------------------------------
  console.log("[Phase 5] On-call engineer initiates bounded AI investigation...");
  const investigationResult = await investigator.run({
    organizationId: orgId,
    serviceId,
    incidentSnapshot: {
      id: incident.id,
      title: "Elevated error rate and alerts following v2.4.0 deployment",
      severity: incident.severity,
      serviceId,
      timeWindowStart: new Date(baseBucketTime - 5 * 60 * 1000).toISOString(),
      timeWindowEnd: new Date(baseBucketTime + 10 * 60 * 1000).toISOString(),
    },
  });

  console.log(
    `          Provider: ${investigationResult.modelId} | Cost: $${investigationResult.estimatedCost.toFixed(4)}`,
  );
  console.log(`          Tool calls: ${investigationResult.toolCallCount} | Reasoning rounds: 1`);
  console.log(`          Ranked hypotheses: ${investigationResult.hypotheses.length}`);
  for (const h of investigationResult.hypotheses) {
    console.log(`          Rank #${h.rank}: [${h.causeCategory}] ${h.rationale}`);
    console.log(`          Cited Evidence IDs: [${h.evidenceIds.join(", ")}]`);
  }

  // --------------------------------------------------------------------------
  // Phase 6: Human Incident State Transitions & OCC
  // --------------------------------------------------------------------------
  console.log("[Phase 6] Human acknowledges and investigates incident...");
  const ack = applyIncidentTransition({
    incidentId: incident.id,
    currentStatus: "open",
    currentVersion: 1,
    expectedVersion: 1,
    newStatus: "acknowledged",
    actorId: "usr-oncall-bob",
    reason: "Investigating v2.4.0 deployment correlation",
  });
  console.log(`          Transition to 'acknowledged': version=${ack.newVersion}`);

  const investigating = applyIncidentTransition({
    incidentId: incident.id,
    currentStatus: ack.newStatus,
    currentVersion: ack.newVersion,
    expectedVersion: ack.newVersion,
    newStatus: "investigating",
    actorId: "usr-oncall-bob",
  });
  console.log(`          Transition to 'investigating': version=${investigating.newVersion}`);

  // --------------------------------------------------------------------------
  // Phase 7: Simulated Broker Outage & Backpressure
  // --------------------------------------------------------------------------
  console.log("[Phase 7] Broker failure simulation: worker paused while events queue up...");
  worker.pause();

  const queueTime = new Date(baseBucketTime + 4 * 60 * 1000).toISOString();
  const queuedEvent: BaseEventEnvelope = {
    eventId: "evt-alert-p2-103",
    eventType: "AlertTriggered",
    schemaVersion: "1.0.0",
    organizationId: orgId,
    serviceId,
    environment: "production",
    occurredAt: queueTime,
    receivedAt: queueTime,
    correlationId: "corr-alert-103",
    payload: {
      alertId: "alt-p2-latency",
      alertName: "LatencyP99Breach",
      severity: "warning",
    },
  };
  bus.publish(TOPICS.NORMALIZED, serviceId, queuedEvent);
  console.log(
    `          Lag accumulated during broker pause: ${bus.getLag(TOPICS.NORMALIZED)} messages`,
  );

  // --------------------------------------------------------------------------
  // Phase 8: Broker Resume & Duplicate Replay Test
  // --------------------------------------------------------------------------
  console.log("[Phase 8] Broker restored. Worker resumes and receives duplicate event replay...");
  worker.resume();

  // Re-inject identical past events to simulate Kafka at-least-once replay
  bus.publish(TOPICS.NORMALIZED, serviceId, depEvent);
  bus.publish(TOPICS.NORMALIZED, serviceId, errorEvent);
  bus.publish(TOPICS.NORMALIZED, serviceId, queuedEvent);

  const processedCount = worker.processBatch(20);
  console.log(`          Messages processed in batch: ${processedCount}`);
  console.log(
    `          Active incidents after replay: ${correlation.getAllActiveIncidents().length} (Expected: 1)`,
  );

  const zeroExtraIncidents = correlation.getAllActiveIncidents().length === 1;

  // --------------------------------------------------------------------------
  // Phase 9: Incident Resolution
  // --------------------------------------------------------------------------
  console.log("[Phase 9] Fix confirmed, on-call marks incident resolved.");
  const resolved = applyIncidentTransition({
    incidentId: incident.id,
    currentStatus: investigating.newStatus,
    currentVersion: investigating.newVersion,
    expectedVersion: investigating.newVersion,
    newStatus: "resolved",
    actorId: "usr-oncall-bob",
    reason: "Rolled back to v2.3.9; latency normalized",
  });
  console.log(`          Final state: ${resolved.newStatus} (version ${resolved.newVersion})\n`);

  await worker.stop();

  return {
    incidentId: incident.id,
    initialStatus: "open",
    finalStatus: resolved.newStatus,
    eventsInjected: 3,
    duplicateEventsReplayed: 3,
    incidentsCreated: 1,
    investigationHypothesesCount: investigationResult.hypotheses.length,
    topRankedCause: investigationResult.hypotheses[0].causeCategory,
    evidenceValidated: investigationResult.hypotheses[0].evidenceIds.length > 0,
    zeroExtraIncidentsOnReplay: zeroExtraIncidents,
  };
}

if (process.argv[1] && process.argv[1].endsWith("demo-incident.ts")) {
  runDemoScenario().then((res) => {
    console.log("Demo Walkthrough Results Summary:");
    console.log(JSON.stringify(res, null, 2));
  });
}
