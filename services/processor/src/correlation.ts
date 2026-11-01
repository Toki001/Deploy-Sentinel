import { createHash } from "node:crypto";
import type { BaseEventEnvelope } from "@deploysentinel/contracts";

export interface CorrelatedIncident {
  id: string;
  organizationId: string;
  serviceId: string;
  title: string;
  status: "open" | "acknowledged" | "investigating" | "mitigated" | "resolved";
  severity: "critical" | "high" | "medium" | "low";
  correlationKey: string;
  version: number;
  openedAt: string;
  eventIds: string[];
  recentDeploymentVersion?: string;
}

export interface CorrelationResult {
  action: "CREATED" | "UPDATED" | "IGNORED";
  incident?: CorrelatedIncident;
  reason: string;
}

export class CorrelationEngine {
  private incidents: Map<string, CorrelatedIncident> = new Map();
  private windowMs: number;

  constructor(windowMs = 30 * 60 * 1000) {
    // 30 minute default sliding window
    this.windowMs = windowMs;
  }

  /**
   * Deterministically calculate a stable correlation key based on service, tenant, and time bucket.
   */
  public calculateCorrelationKey(orgId: string, serviceId: string, eventTimestamp: number): string {
    const bucket = Math.floor(eventTimestamp / this.windowMs);
    return `corr-${orgId}-${serviceId}-${bucket}`;
  }

  /**
   * Generate stable incident ID deterministically from correlation key.
   */
  public generateIncidentId(correlationKey: string): string {
    const hash = createHash("sha256").update(correlationKey).digest("hex").slice(0, 8);
    return `INC-${hash.toUpperCase()}`;
  }

  public processEvent(envelope: BaseEventEnvelope): CorrelationResult {
    const orgId = envelope.organizationId;
    const serviceId = envelope.serviceId;
    const eventTime = new Date(envelope.occurredAt).getTime();
    const correlationKey = this.calculateCorrelationKey(orgId, serviceId, eventTime);

    let incident = this.incidents.get(correlationKey);

    if (!incident) {
      // Only alerts or error rate changes create an incident; standalone deploy or config change does not
      if (envelope.eventType === "AlertTriggered" || envelope.eventType === "ErrorRateChanged") {
        const incidentId = this.generateIncidentId(correlationKey);
        const payload = envelope.payload as { severity?: string };
        const initialSeverity =
          payload.severity === "critical"
            ? "critical"
            : envelope.eventType === "AlertTriggered"
              ? "high"
              : "medium";
        incident = {
          id: incidentId,
          organizationId: orgId,
          serviceId,
          title: `${serviceId}: Incident triggered by ${envelope.eventType}`,
          status: "open",
          severity: initialSeverity,
          correlationKey,
          version: 1,
          openedAt: envelope.occurredAt,
          eventIds: [envelope.eventId],
        };
        this.incidents.set(correlationKey, incident);
        return {
          action: "CREATED",
          incident: { ...incident },
          reason: `Created incident ${incidentId} for ${envelope.eventType} in window`,
        };
      }

      return {
        action: "IGNORED",
        reason: `Informational event ${envelope.eventType} did not trigger an incident`,
      };
    }

    // Incident already exists in this correlation window: update timeline
    if (!incident.eventIds.includes(envelope.eventId)) {
      incident.eventIds.push(envelope.eventId);
    }

    // If an alert is added, escalate severity if critical
    if (envelope.eventType === "AlertTriggered") {
      const payload = envelope.payload as { severity?: string };
      if (payload.severity === "critical") {
        incident.severity = "critical";
      }
    }

    // If deployment event occurs in same correlation window, associate version
    if (envelope.eventType === "DeploymentCreated") {
      const payload = envelope.payload as { version?: string };
      if (payload.version) {
        incident.recentDeploymentVersion = payload.version;
      }
    }

    incident.version += 1;

    return {
      action: "UPDATED",
      incident: { ...incident },
      reason: `Correlated ${envelope.eventType} into active incident ${incident.id}`,
    };
  }

  public getIncident(correlationKey: string): CorrelatedIncident | undefined {
    return this.incidents.get(correlationKey);
  }

  public getActiveIncident(
    orgId: string,
    serviceId: string,
    timestamp = Date.now(),
  ): CorrelatedIncident | undefined {
    const key = this.calculateCorrelationKey(orgId, serviceId, timestamp);
    return this.incidents.get(key);
  }

  public getAllActiveIncidents(): CorrelatedIncident[] {
    return Array.from(this.incidents.values());
  }

  public getActiveIncidentsCount(): number {
    return this.incidents.size;
  }

  public clear(): void {
    this.incidents.clear();
  }
}
