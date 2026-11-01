import { ForbiddenError, BadRequestError } from "@deploysentinel/shared";
import type { ToolContext, ReadOnlyTool } from "./types.js";
import {
  DiagnosticStore,
  defaultDiagnosticStore,
  sanitizeUntrustedText,
} from "./diagnostic-store.js";

const MAX_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours maximum
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function validateAndCapTimeRange(startStr?: string, endStr?: string): { start: Date; end: Date } {
  const end = endStr ? new Date(endStr) : new Date();
  let start = startStr ? new Date(startStr) : new Date(end.getTime() - 60 * 60 * 1000); // 1h default

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new BadRequestError("Invalid date format in tool arguments");
  }

  // Cap window duration to 24 hours
  if (end.getTime() - start.getTime() > MAX_WINDOW_MS) {
    start = new Date(end.getTime() - MAX_WINDOW_MS);
  }

  return { start, end };
}

function assertAuthorizedService(argServiceId: string | undefined, contextServiceId: string): void {
  if (argServiceId && argServiceId !== contextServiceId) {
    throw new ForbiddenError(
      `Cross-service diagnostic access denied: requested '${argServiceId}', but context is restricted to '${contextServiceId}'`,
    );
  }
}

// 1. listRecentDeployments(serviceId, start, end, limit)
export interface ListRecentDeploymentsArgs {
  serviceId?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export class ListRecentDeploymentsTool implements ReadOnlyTool<
  ListRecentDeploymentsArgs,
  Record<string, unknown>
> {
  public readonly name = "listRecentDeployments";
  public readonly description =
    "Retrieve deployments within the specified time window for the authorized service.";

  constructor(private store: DiagnosticStore = defaultDiagnosticStore) {}

  public async execute(
    args: ListRecentDeploymentsArgs,
    context: ToolContext,
  ): Promise<{ output: Record<string, unknown>; evidenceIds: string[] }> {
    assertAuthorizedService(args.serviceId, context.serviceId);
    const { start, end } = validateAndCapTimeRange(args.start, args.end);
    const limit = Math.min(Math.max(1, args.limit || DEFAULT_LIMIT), MAX_LIMIT);

    const all = this.store.getDeployments(context.organizationId, context.serviceId);
    const filtered = all
      .filter((d) => {
        const t = new Date(d.deployedAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      })
      .slice(0, limit)
      .map((d) => ({
        ...d,
        changelog: sanitizeUntrustedText(d.changelog),
      }));

    const evidenceIds = filtered.map((d) => d.id);
    return {
      output: {
        serviceId: context.serviceId,
        deployments: filtered,
        count: filtered.length,
        windowStart: start.toISOString(),
        windowEnd: end.toISOString(),
      },
      evidenceIds,
    };
  }
}

// 2. getErrorRateWindow(serviceId, start, end, aggregation)
export interface GetErrorRateWindowArgs {
  serviceId?: string;
  start?: string;
  end?: string;
  aggregation?: "1m" | "5m" | "15m";
}

export class GetErrorRateWindowTool implements ReadOnlyTool<
  GetErrorRateWindowArgs,
  Record<string, unknown>
> {
  public readonly name = "getErrorRateWindow";
  public readonly description = "Fetch time-series error rate summary for the authorized service.";

  constructor(private store: DiagnosticStore = defaultDiagnosticStore) {}

  public async execute(
    args: GetErrorRateWindowArgs,
    context: ToolContext,
  ): Promise<{ output: Record<string, unknown>; evidenceIds: string[] }> {
    assertAuthorizedService(args.serviceId, context.serviceId);
    const { start, end } = validateAndCapTimeRange(args.start, args.end);

    const records = this.store.getErrorRates(context.organizationId, context.serviceId);
    const inWindow = records.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    let peakErrorRate = 0;
    let totalReqs = 0;
    let totalErrors = 0;

    for (const r of inWindow) {
      if (r.errorRatePercent > peakErrorRate) peakErrorRate = r.errorRatePercent;
      totalReqs += r.totalRequests;
      totalErrors += r.errorCount;
    }

    const averageErrorRate = totalReqs > 0 ? (totalErrors / totalReqs) * 100 : 0;
    const evidenceIds = inWindow.map((r, idx) => `err-rate-${context.serviceId}-${idx}`);

    return {
      output: {
        serviceId: context.serviceId,
        pointsCount: inWindow.length,
        peakErrorRate: Number(peakErrorRate.toFixed(2)),
        averageErrorRate: Number(averageErrorRate.toFixed(2)),
        totalRequests: totalReqs,
        totalErrors,
        aggregation: args.aggregation || "5m",
      },
      evidenceIds: evidenceIds.slice(0, 10),
    };
  }
}

// 3. getTraceSummaries(serviceId, start, end, limit)
export interface GetTraceSummariesArgs {
  serviceId?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export class GetTraceSummariesTool implements ReadOnlyTool<
  GetTraceSummariesArgs,
  Record<string, unknown>
> {
  public readonly name = "getTraceSummaries";
  public readonly description =
    "Retrieve trace span summaries and error callstacks for the authorized service.";

  constructor(private store: DiagnosticStore = defaultDiagnosticStore) {}

  public async execute(
    args: GetTraceSummariesArgs,
    context: ToolContext,
  ): Promise<{ output: Record<string, unknown>; evidenceIds: string[] }> {
    assertAuthorizedService(args.serviceId, context.serviceId);
    const { start, end } = validateAndCapTimeRange(args.start, args.end);
    const limit = Math.min(Math.max(1, args.limit || DEFAULT_LIMIT), MAX_LIMIT);

    const traces = this.store.getTraces(context.organizationId, context.serviceId);
    const filtered = traces
      .filter((t) => {
        const time = new Date(t.timestamp).getTime();
        return time >= start.getTime() && time <= end.getTime();
      })
      .slice(0, limit)
      .map((t) => ({
        ...t,
        error: t.error ? sanitizeUntrustedText(t.error) : undefined,
      }));

    const evidenceIds = filtered.map((t) => t.id);
    return {
      output: {
        serviceId: context.serviceId,
        traces: filtered,
        count: filtered.length,
      },
      evidenceIds,
    };
  }
}

// 4. listConfigurationChanges(serviceId, start, end, limit)
export interface ListConfigurationChangesArgs {
  serviceId?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export class ListConfigurationChangesTool implements ReadOnlyTool<
  ListConfigurationChangesArgs,
  Record<string, unknown>
> {
  public readonly name = "listConfigurationChanges";
  public readonly description =
    "Retrieve audit log of environment variables and configuration changes for the service.";

  constructor(private store: DiagnosticStore = defaultDiagnosticStore) {}

  public async execute(
    args: ListConfigurationChangesArgs,
    context: ToolContext,
  ): Promise<{ output: Record<string, unknown>; evidenceIds: string[] }> {
    assertAuthorizedService(args.serviceId, context.serviceId);
    const { start, end } = validateAndCapTimeRange(args.start, args.end);
    const limit = Math.min(Math.max(1, args.limit || DEFAULT_LIMIT), MAX_LIMIT);

    const changes = this.store.getConfigChanges(context.organizationId, context.serviceId);
    const filtered = changes
      .filter((c) => {
        const t = new Date(c.timestamp).getTime();
        return t >= start.getTime() && t <= end.getTime();
      })
      .slice(0, limit)
      .map((c) => ({
        ...c,
        previousValue: sanitizeUntrustedText(c.previousValue),
        newValue: sanitizeUntrustedText(c.newValue),
      }));

    const evidenceIds = filtered.map((c) => c.id);
    return {
      output: {
        serviceId: context.serviceId,
        changes: filtered,
        count: filtered.length,
      },
      evidenceIds,
    };
  }
}

// 5. getRelatedAlerts(serviceId, start, end, limit)
export interface GetRelatedAlertsArgs {
  serviceId?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export class GetRelatedAlertsTool implements ReadOnlyTool<
  GetRelatedAlertsArgs,
  Record<string, unknown>
> {
  public readonly name = "getRelatedAlerts";
  public readonly description =
    "Retrieve active and resolved alerts associated with the authorized service within the time window.";

  constructor(private store: DiagnosticStore = defaultDiagnosticStore) {}

  public async execute(
    args: GetRelatedAlertsArgs,
    context: ToolContext,
  ): Promise<{ output: Record<string, unknown>; evidenceIds: string[] }> {
    assertAuthorizedService(args.serviceId, context.serviceId);
    const { start, end } = validateAndCapTimeRange(args.start, args.end);
    const limit = Math.min(Math.max(1, args.limit || DEFAULT_LIMIT), MAX_LIMIT);

    const alerts = this.store.getAlerts(context.organizationId, context.serviceId);
    const filtered = alerts
      .filter((a) => {
        const t = new Date(a.triggeredAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      })
      .slice(0, limit)
      .map((a) => ({
        ...a,
        description: sanitizeUntrustedText(a.description),
      }));

    const evidenceIds = filtered.map((a) => a.id);
    return {
      output: {
        serviceId: context.serviceId,
        alerts: filtered,
        count: filtered.length,
      },
      evidenceIds,
    };
  }
}

export class ToolRegistry {
  private tools: Map<string, ReadOnlyTool> = new Map();

  constructor(store: DiagnosticStore = defaultDiagnosticStore) {
    this.register(new ListRecentDeploymentsTool(store));
    this.register(new GetErrorRateWindowTool(store));
    this.register(new GetTraceSummariesTool(store));
    this.register(new ListConfigurationChangesTool(store));
    this.register(new GetRelatedAlertsTool(store));
  }

  public register(tool: ReadOnlyTool): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ReadOnlyTool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ForbiddenError(
        `Disallowed tool '${name}': tool is not in the read-only diagnostic allowlist`,
      );
    }
    return tool;
  }

  public getAllowlist(): string[] {
    return Array.from(this.tools.keys());
  }
}
