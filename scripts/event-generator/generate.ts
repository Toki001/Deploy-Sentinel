import { randomUUID } from "node:crypto";
import { computeHmacSignature } from "../../packages/shared/src/crypto";

export interface SyntheticEventOptions {
  serviceId?: string;
  scenario?: "deploy_regression" | "bad_config" | "dependency_failure" | "normal";
  timestamp?: string;
}

export function generateDeploymentEvent(serviceId = "checkout-service", version = "v2.4.1") {
  const now = new Date().toISOString();
  return {
    eventId: `evt-dep-${randomUUID().substring(0, 8)}`,
    eventType: "DeploymentCreated",
    schemaVersion: "1.0.0",
    organizationId: "org-demo",
    serviceId,
    environment: "production",
    occurredAt: now,
    receivedAt: now,
    correlationId: `corr-${serviceId}-2026`,
    payload: {
      version,
      commitSha: "9f8a12c4b",
      deployedBy: "alice@company.internal",
      changeSummary: "Update upstream payment connection pool defaults",
    },
  };
}

export function generateAlertEvent(
  serviceId = "checkout-service",
  severity: "critical" | "high" = "critical",
) {
  const now = new Date().toISOString();
  return {
    eventId: `evt-alt-${randomUUID().substring(0, 8)}`,
    eventType: "AlertTriggered",
    schemaVersion: "1.0.0",
    organizationId: "org-demo",
    serviceId,
    environment: "production",
    occurredAt: now,
    receivedAt: now,
    correlationId: `corr-${serviceId}-2026`,
    payload: {
      alertName: "HighErrorRate5xx",
      severity,
      metricName: "http_5xx_rate",
      metricValue: 24.5,
      threshold: 2.0,
      description: "HTTP 5xx rate exceeded 2% threshold on service checkout-service",
    },
  };
}

export function generateConfigChangeEvent(serviceId = "checkout-service") {
  const now = new Date().toISOString();
  return {
    eventId: `evt-cfg-${randomUUID().substring(0, 8)}`,
    eventType: "ConfigurationChanged",
    schemaVersion: "1.0.0",
    organizationId: "org-demo",
    serviceId,
    environment: "production",
    occurredAt: now,
    receivedAt: now,
    correlationId: `corr-${serviceId}-2026`,
    payload: {
      key: "MAX_DB_POOL_SIZE",
      previousValue: "50",
      newValue: "5",
      changedBy: "bob@company.internal",
      reason: "Cost tuning test",
    },
  };
}

if (process.argv[1]?.endsWith("generate.ts")) {
  const dep = generateDeploymentEvent();
  const alt = generateAlertEvent();
  const cfg = generateConfigChangeEvent();

  console.log("=== Deterministic Synthetic Events ===");
  console.log(JSON.stringify({ deployment: dep, alert: alt, config: cfg }, null, 2));
}
