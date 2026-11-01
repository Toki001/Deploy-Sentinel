import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DeploymentCreatedPayloadSchema,
  AlertTriggeredPayloadSchema,
  ErrorRateChangedPayloadSchema,
  ConfigurationChangedPayloadSchema,
  IncidentStatusChangedPayloadSchema,
  EventEnvelopeSchema,
} from "@deploysentinel/contracts";

describe("Event Contract Versioning & JSON Schema Validation", () => {
  const schemaFiles = [
    "deployment-created.json",
    "alert-triggered.json",
    "error-rate-changed.json",
    "configuration-changed.json",
    "incident-status-changed.json",
  ];

  it("should have valid v1 JSON Schema files in packages/contracts/events/v1/", () => {
    for (const fileName of schemaFiles) {
      const fullPath = join(process.cwd(), "packages/contracts/events/v1", fileName);
      const content = readFileSync(fullPath, "utf-8");
      const schema = JSON.parse(content);

      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(schema.required).toContain("eventId");
      expect(schema.required).toContain("eventType");
      expect(schema.required).toContain("schemaVersion");
      expect(schema.required).toContain("payload");
    }
  });

  it("should validate compliant DeploymentCreated envelope", () => {
    const raw = {
      eventId: "evt-dep-101",
      eventType: "DeploymentCreated",
      schemaVersion: "1.0.0",
      organizationId: "org-demo",
      serviceId: "checkout-service",
      environment: "production",
      occurredAt: "2026-11-01T10:00:00.000Z",
      receivedAt: "2026-11-01T10:00:01.000Z",
      correlationId: "corr-101",
      payload: {
        version: "v2.4.1",
        commitSha: "9f8a12c",
      },
    };

    const envelopeParsed = EventEnvelopeSchema.safeParse(raw);
    expect(envelopeParsed.success).toBe(true);

    const payloadParsed = DeploymentCreatedPayloadSchema.safeParse(raw.payload);
    expect(payloadParsed.success).toBe(true);
  });

  it("should reject invalid AlertTriggered severity", () => {
    const invalidPayload = {
      alertName: "TestAlert",
      severity: "ultra-critical", // invalid enum
    };
    const parsed = AlertTriggeredPayloadSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
