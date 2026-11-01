import {
  ToolRegistry,
  ListRecentDeploymentsTool,
  GetErrorRateWindowTool,
  GetTraceSummariesTool,
  ListConfigurationChangesTool,
  GetRelatedAlertsTool,
} from "./tools/diagnostic-tools.js";
import type { ToolContext } from "./tools/types.js";
import { DeterministicOfflineProvider } from "./providers/deterministic-offline.js";
import type {
  AIProvider,
  InvestigationOutput,
  InvestigationToolResult,
} from "./providers/types.js";
import {
  validateInvestigationCaps,
  validateEvidenceCitations,
  MAX_TOOL_CALLS,
} from "./guardrails.js";
import { defaultDiagnosticStore, DiagnosticStore } from "./tools/diagnostic-store.js";
import { defaultMetrics } from "@deploysentinel/telemetry";

export interface RunInvestigationParams {
  organizationId: string;
  serviceId: string;
  incidentId: string;
  incidentSnapshot: Record<string, unknown>;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  provider?: AIProvider;
  store?: DiagnosticStore;
}

export class InvestigationRunner {
  private registry: ToolRegistry;
  private provider: AIProvider;

  constructor(
    provider: AIProvider = new DeterministicOfflineProvider(),
    store: DiagnosticStore = defaultDiagnosticStore,
  ) {
    this.provider = provider;
    this.registry = new ToolRegistry(store);
  }

  public async run(params: RunInvestigationParams): Promise<InvestigationOutput> {
    const context: ToolContext = {
      organizationId: params.organizationId,
      serviceId: params.serviceId,
      timeWindowStart:
        params.timeWindowStart ||
        (typeof params.incidentSnapshot?.timeWindowStart === "string"
          ? (params.incidentSnapshot.timeWindowStart as string)
          : new Date(Date.now() - 3600000).toISOString()),
      timeWindowEnd:
        params.timeWindowEnd ||
        (typeof params.incidentSnapshot?.timeWindowEnd === "string"
          ? (params.incidentSnapshot.timeWindowEnd as string)
          : new Date().toISOString()),
    };

    const toolResults: InvestigationToolResult[] = [];
    const authorizedEvidenceIds = new Set<string>();

    // Bounded execution loop: Run standard diagnostic tools up to MAX_TOOL_CALLS (4)
    const plannedTools = [
      "listRecentDeployments",
      "getErrorRateWindow",
      "getTraceSummaries",
      "listConfigurationChanges",
    ];

    let toolCallCount = 0;
    for (const toolName of plannedTools) {
      if (toolCallCount >= MAX_TOOL_CALLS) break;

      const tool = this.registry.getTool(toolName);
      const res = await tool.execute(
        {
          serviceId: params.serviceId,
          start: context.timeWindowStart,
          end: context.timeWindowEnd,
          limit: 10,
        },
        context,
      );

      toolCallCount += 1;
      for (const eid of res.evidenceIds) {
        authorizedEvidenceIds.add(eid);
      }

      toolResults.push({
        toolName,
        args: { serviceId: params.serviceId },
        output: res.output,
        evidenceIds: res.evidenceIds,
      });
    }

    // Verify hard tool caps and reasoning rounds
    validateInvestigationCaps(toolCallCount, 1);

    // Invoke AI Provider
    const rawOutput = await this.provider.investigate(params.incidentSnapshot, toolResults);

    // Validate and sanitize evidence citations
    const validation = validateEvidenceCitations(rawOutput, authorizedEvidenceIds);

    // Record OpenTelemetry metrics
    defaultMetrics.observe(
      "deploysentinel_investigation_duration_ms",
      validation.validOutput.elapsedMs,
      { model: validation.validOutput.modelId },
    );
    defaultMetrics.increment("deploysentinel_investigation_tool_calls_total", toolCallCount);
    defaultMetrics.increment(
      "deploysentinel_investigation_tokens_total",
      validation.validOutput.inputTokens,
      { type: "input" },
    );
    defaultMetrics.increment(
      "deploysentinel_investigation_tokens_total",
      validation.validOutput.outputTokens,
      { type: "output" },
    );
    defaultMetrics.increment(
      "deploysentinel_investigation_cost_usd",
      validation.validOutput.estimatedCost,
    );

    return validation.validOutput;
  }
}
