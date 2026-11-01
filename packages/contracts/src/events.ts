import { z } from "zod";

export const EventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  schemaVersion: z.literal("1.0.0"),
  organizationId: z.string().min(1),
  serviceId: z.string().min(1),
  environment: z.string().default("production"),
  occurredAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  correlationId: z.string().min(1),
  payload: z.record(z.unknown()),
});

export const BaseEventEnvelopeSchema = EventEnvelopeSchema;
export type BaseEventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export const DeploymentCreatedPayloadSchema = z.object({
  version: z.string().min(1),
  commitSha: z.string().optional(),
  deployedBy: z.string().optional(),
  changeSummary: z.string().optional(),
});

export const AlertTriggeredPayloadSchema = z.object({
  alertName: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low"]),
  metricName: z.string().optional(),
  metricValue: z.number().optional(),
  threshold: z.number().optional(),
  description: z.string().optional(),
});

export const ErrorRateChangedPayloadSchema = z.object({
  errorRatePercent: z.number().min(0).max(100),
  previousRatePercent: z.number().optional(),
  windowMinutes: z.number().positive(),
  totalRequests: z.number().nonnegative().optional(),
  failedRequests: z.number().nonnegative().optional(),
});

export const ConfigurationChangedPayloadSchema = z.object({
  key: z.string().min(1),
  previousValue: z.string().nullable().optional(),
  newValue: z.string(),
  changedBy: z.string().min(1),
  reason: z.string().optional(),
});

export const IncidentStatusChangedPayloadSchema = z.object({
  incidentId: z.string().min(1),
  previousStatus: z.enum(["open", "acknowledged", "investigating", "mitigated", "resolved"]),
  newStatus: z.enum(["open", "acknowledged", "investigating", "mitigated", "resolved"]),
  changedBy: z.string().min(1),
  note: z.string().optional(),
});

export type DeploymentCreatedEvent = z.infer<typeof EventEnvelopeSchema> & {
  eventType: "DeploymentCreated";
  payload: z.infer<typeof DeploymentCreatedPayloadSchema>;
};

export type AlertTriggeredEvent = z.infer<typeof EventEnvelopeSchema> & {
  eventType: "AlertTriggered";
  payload: z.infer<typeof AlertTriggeredPayloadSchema>;
};

export type ErrorRateChangedEvent = z.infer<typeof EventEnvelopeSchema> & {
  eventType: "ErrorRateChanged";
  payload: z.infer<typeof ErrorRateChangedPayloadSchema>;
};

export type ConfigurationChangedEvent = z.infer<typeof EventEnvelopeSchema> & {
  eventType: "ConfigurationChanged";
  payload: z.infer<typeof ConfigurationChangedPayloadSchema>;
};

export type IncidentStatusChangedEvent = z.infer<typeof EventEnvelopeSchema> & {
  eventType: "IncidentStatusChanged";
  payload: z.infer<typeof IncidentStatusChangedPayloadSchema>;
};
