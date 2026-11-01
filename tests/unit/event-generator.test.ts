import {
  generateDeploymentEvent,
  generateAlertEvent,
  generateConfigChangeEvent,
} from "../../scripts/event-generator/generate";

describe("Event Generator Foundation", () => {
  it("should generate compliant DeploymentCreated events", () => {
    const event = generateDeploymentEvent("checkout-service", "v2.5.0");
    expect(event.eventType).toBe("DeploymentCreated");
    expect(event.serviceId).toBe("checkout-service");
    expect(event.schemaVersion).toBe("1.0.0");
    expect(event.payload.version).toBe("v2.5.0");
    expect(event.occurredAt).toBeDefined();
    expect(event.correlationId).toContain("checkout-service");
  });

  it("should generate compliant AlertTriggered events", () => {
    const event = generateAlertEvent("checkout-service", "critical");
    expect(event.eventType).toBe("AlertTriggered");
    expect(event.payload.severity).toBe("critical");
    expect(event.payload.alertName).toBe("HighErrorRate5xx");
  });

  it("should generate compliant ConfigurationChanged events", () => {
    const event = generateConfigChangeEvent("checkout-service");
    expect(event.eventType).toBe("ConfigurationChanged");
    expect(event.payload.key).toBe("MAX_DB_POOL_SIZE");
  });
});
