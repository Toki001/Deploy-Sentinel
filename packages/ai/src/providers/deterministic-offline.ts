import type {
  AIProvider,
  InvestigationOutput,
  InvestigationToolResult,
  InvestigationHypothesis,
} from "./types.js";
import type { CauseCategory } from "@deploysentinel/shared";

export class DeterministicOfflineProvider implements AIProvider {
  public readonly name = "offline-simulator";
  public readonly isOffline = true;

  public async investigate(
    incidentSnapshot: Record<string, unknown>,
    toolResults: InvestigationToolResult[],
  ): Promise<InvestigationOutput> {
    const startTime = Date.now();
    const collectedEvidenceIds: string[] = [];
    let suspectedCategory: CauseCategory = "ambiguous";
    let rationale = "Analyzed telemetry and service events within the correlation window.";

    for (const res of toolResults) {
      if (res.evidenceIds && Array.isArray(res.evidenceIds)) {
        collectedEvidenceIds.push(...res.evidenceIds);
      }
      if (
        res.toolName === "listRecentDeployments" &&
        (res.output.deployments as unknown[])?.length
      ) {
        suspectedCategory = "release_regression";
        rationale = "Incident timestamp closely follows recent deployment artifact update.";
      } else if (
        res.toolName === "listConfigurationChanges" &&
        (res.output.changes as unknown[])?.length
      ) {
        suspectedCategory = "bad_configuration";
        rationale = "Service error spike followed immediate environment/feature flag update.";
      } else if (
        res.toolName === "getErrorRateWindow" &&
        (res.output.peakErrorRate as number) > 20
      ) {
        if (suspectedCategory === "ambiguous") {
          suspectedCategory = "dependency_failure";
          rationale = "Elevated upstream HTTP 502/504 error response rate detected.";
        }
      }
    }

    const hypotheses: InvestigationHypothesis[] = [
      {
        rank: 1,
        causeCategory: suspectedCategory,
        rationale,
        evidenceIds: collectedEvidenceIds.slice(0, 5),
      },
    ];

    if (collectedEvidenceIds.length === 0) {
      hypotheses[0].causeCategory = "telemetry_gap";
      hypotheses[0].rationale =
        "Insufficient telemetry signals available in the requested window to attribute cause.";
    }

    return {
      hypotheses,
      missingEvidence: collectedEvidenceIds.length === 0 ? ["trace_spans", "deploy_logs"] : [],
      uncertainty:
        collectedEvidenceIds.length < 2 ? "High uncertainty due to sparse evidence" : "Moderate",
      proposedHumanActions: [
        "Review diff of latest deployment commit",
        "Inspect downstream database connection pool saturation",
        "Confirm rollback readiness for target service",
      ],
      modelId: "offline-deterministic-v1",
      promptVersion: "1.0.0",
      toolCallCount: toolResults.length,
      inputTokens: 350,
      outputTokens: 120,
      estimatedCost: 0.0,
      elapsedMs: Date.now() - startTime,
    };
  }
}
