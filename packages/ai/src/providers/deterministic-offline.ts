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

    let hasDeployments = false;
    let hasConfigChanges = false;
    let hasDependencyFailure = false;
    let hasTrafficSpike = false;
    let hasDatabaseSaturation = false;
    let hasNoiseOnly = false;

    const evidenceBySource: Record<string, string[]> = {
      deployments: [],
      configs: [],
      dependencies: [],
      traffic: [],
      database: [],
      alerts: [],
    };

    for (const res of toolResults) {
      if (res.evidenceIds && Array.isArray(res.evidenceIds)) {
        collectedEvidenceIds.push(...res.evidenceIds);
      }

      if (res.toolName === "listRecentDeployments") {
        const deps = (res.output.deployments as Array<{ id: string; version: string }>) || [];
        if (deps.length > 0) {
          hasDeployments = true;
          evidenceBySource.deployments.push(...deps.map((d) => d.id));
        }
      } else if (res.toolName === "listConfigurationChanges") {
        const changes = (res.output.changes as Array<{ id: string; key: string }>) || [];
        if (changes.length > 0) {
          hasConfigChanges = true;
          evidenceBySource.configs.push(...changes.map((c) => c.id));
        }
      } else if (res.toolName === "getTraceSummaries") {
        const traces =
          (res.output.traces as Array<{
            id: string;
            operationName: string;
            httpStatus: number;
            error?: string;
          }>) || [];
        for (const t of traces) {
          const err = (t.error || "").toLowerCase();
          const op = (t.operationName || "").toLowerCase();
          if (
            err.includes("downstream") ||
            err.includes("502") ||
            err.includes("504") ||
            err.includes("gateway") ||
            err.includes("upstream") ||
            err.includes("connection refused")
          ) {
            hasDependencyFailure = true;
            evidenceBySource.dependencies.push(t.id);
          } else if (
            err.includes("database") ||
            err.includes("pool") ||
            err.includes("connection timeout") ||
            err.includes("deadlock") ||
            op.includes("sql") ||
            op.includes("query")
          ) {
            hasDatabaseSaturation = true;
            evidenceBySource.database.push(t.id);
          }
        }
      } else if (res.toolName === "getErrorRateWindow") {
        const totalReqs = (res.output.totalRequests as number) || 0;
        const peakRate = (res.output.peakErrorRate as number) || 0;
        if (totalReqs > 10000 || peakRate > 50) {
          hasTrafficSpike = true;
          if (res.evidenceIds) evidenceBySource.traffic.push(...res.evidenceIds);
        }
      } else if (res.toolName === "getRelatedAlerts") {
        const alerts =
          (res.output.alerts as Array<{ id: string; alertName: string; description: string }>) ||
          [];
        for (const a of alerts) {
          const name = (a.alertName || "").toLowerCase();
          const desc = (a.description || "").toLowerCase();
          if (name.includes("pool") || desc.includes("database") || name.includes("postgres")) {
            hasDatabaseSaturation = true;
            evidenceBySource.database.push(a.id);
          } else if (name.includes("traffic") || desc.includes("surge") || name.includes("rps")) {
            hasTrafficSpike = true;
            evidenceBySource.traffic.push(a.id);
          } else if (name.includes("upstream") || desc.includes("gateway")) {
            hasDependencyFailure = true;
            evidenceBySource.dependencies.push(a.id);
          } else if (name.includes("noise") || desc.includes("unrelated")) {
            hasNoiseOnly = true;
          }
        }
      }
    }

    const hypotheses: InvestigationHypothesis[] = [];
    const missingEvidence: string[] = [];
    let uncertainty = "Low";

    // Detect signal combinations
    const signalCount = [
      hasDeployments,
      hasConfigChanges,
      hasDependencyFailure,
      hasTrafficSpike,
      hasDatabaseSaturation,
    ].filter(Boolean).length;

    if (collectedEvidenceIds.length === 0 || toolResults.length === 0) {
      // Telemetry gap / insufficient evidence -> Abstain
      hypotheses.push({
        rank: 1,
        causeCategory: "telemetry_gap",
        rationale:
          "Insufficient telemetry records found in the incident window to identify root cause.",
        evidenceIds: [],
      });
      missingEvidence.push("deployment_history", "trace_spans", "error_rate_metrics");
      uncertainty = "High - Evidence insufficient, human inspection required";
    } else if (signalCount > 2) {
      // Ambiguous multiple conflicting signals
      hypotheses.push(
        {
          rank: 1,
          causeCategory: hasDeployments ? "release_regression" : "bad_configuration",
          rationale:
            "Multiple high-severity operational anomalies coincided; deployment correlation is primary candidate.",
          evidenceIds: (hasDeployments
            ? evidenceBySource.deployments
            : evidenceBySource.configs
          ).slice(0, 3),
        },
        {
          rank: 2,
          causeCategory: hasDependencyFailure ? "dependency_failure" : "database_saturation",
          rationale:
            "Downstream service error cascading detected during the same correlation window.",
          evidenceIds: (hasDependencyFailure
            ? evidenceBySource.dependencies
            : evidenceBySource.database
          ).slice(0, 3),
        },
        {
          rank: 3,
          causeCategory: "ambiguous",
          rationale: "Conflicting evidence spans across infrastructure and application layers.",
          evidenceIds: collectedEvidenceIds.slice(0, 3),
        },
      );
      uncertainty = "High - Multiple simultaneous anomalies";
    } else if (hasDeployments && !hasConfigChanges && !hasDatabaseSaturation) {
      // Primary: release_regression
      hypotheses.push({
        rank: 1,
        causeCategory: "release_regression",
        rationale:
          "Incident onset timestamp directly aligns with latest artifact deployment and subsequent error surge.",
        evidenceIds: evidenceBySource.deployments.slice(0, 5),
      });
      if (hasDependencyFailure) {
        hypotheses.push({
          rank: 2,
          causeCategory: "dependency_failure",
          rationale: "Downstream calls failed concurrently following new release roll-out.",
          evidenceIds: evidenceBySource.dependencies.slice(0, 3),
        });
      }
    } else if (hasConfigChanges && !hasDeployments) {
      // Primary: bad_configuration
      hypotheses.push({
        rank: 1,
        causeCategory: "bad_configuration",
        rationale:
          "Runtime parameter / feature flag update immediately preceded service degradation.",
        evidenceIds: evidenceBySource.configs.slice(0, 5),
      });
    } else if (hasDatabaseSaturation && !hasDeployments && !hasConfigChanges) {
      // Primary: database_saturation
      hypotheses.push({
        rank: 1,
        causeCategory: "database_saturation",
        rationale: "Database connection pool exhaustion and query latency degradation detected.",
        evidenceIds: evidenceBySource.database.slice(0, 5),
      });
    } else if (hasDependencyFailure && !hasDeployments && !hasConfigChanges) {
      // Primary: dependency_failure
      hypotheses.push({
        rank: 1,
        causeCategory: "dependency_failure",
        rationale: "HTTP 502/504 errors isolated to external/downstream service integration.",
        evidenceIds: evidenceBySource.dependencies.slice(0, 5),
      });
    } else if (hasTrafficSpike && !hasDeployments && !hasConfigChanges) {
      // Primary: traffic_spike
      hypotheses.push({
        rank: 1,
        causeCategory: "traffic_spike",
        rationale:
          "Unprecedented incoming request volume surge exceeding normal provisioning limits.",
        evidenceIds: (evidenceBySource.traffic.length > 0
          ? evidenceBySource.traffic
          : collectedEvidenceIds
        ).slice(0, 5),
      });
    } else if (hasNoiseOnly) {
      // Primary: unrelated_noise
      hypotheses.push({
        rank: 1,
        causeCategory: "unrelated_noise",
        rationale:
          "Telemetry alerts represent non-impacting background noise or routine maintenance notices.",
        evidenceIds: collectedEvidenceIds.slice(0, 3),
      });
      uncertainty = "Moderate";
    } else {
      // Fallback: ambiguous
      hypotheses.push({
        rank: 1,
        causeCategory: "ambiguous",
        rationale: "Correlation window contains inconclusive telemetry metrics.",
        evidenceIds: collectedEvidenceIds.slice(0, 3),
      });
      uncertainty = "High";
    }

    const proposedHumanActions = [
      "Review git diff of target service release commits",
      "Check health of upstream gateways and downstream dependencies",
      "Inspect database active query count and lock waits",
    ];

    return {
      hypotheses,
      missingEvidence,
      uncertainty,
      proposedHumanActions,
      modelId: "offline-deterministic-v1",
      promptVersion: "1.0.0",
      toolCallCount: toolResults.length,
      inputTokens: 420,
      outputTokens: 160,
      estimatedCost: 0.0,
      elapsedMs: Date.now() - startTime,
    };
  }
}
