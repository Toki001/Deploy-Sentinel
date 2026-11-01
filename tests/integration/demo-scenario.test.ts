import { runDemoScenario } from "../../scripts/scenarios/demo-incident.js";

describe("Milestone 08: End-to-End Synthetic Incident Walkthrough", () => {
  it("should run full incident lifecycle including fault, correlation, AI investigation, and replay recovery", async () => {
    const results = await runDemoScenario();

    expect(results.incidentId).toMatch(/^INC-/);
    expect(results.initialStatus).toBe("open");
    expect(results.finalStatus).toBe("resolved");

    // Exactly 1 incident created despite replaying duplicate events
    expect(results.incidentsCreated).toBe(1);
    expect(results.zeroExtraIncidentsOnReplay).toBe(true);

    // AI investigation hypotheses verified
    expect(results.investigationHypothesesCount).toBe(3);
    expect(results.topRankedCause).toBe("release_regression");
    expect(results.evidenceValidated).toBe(true);
  });
});
