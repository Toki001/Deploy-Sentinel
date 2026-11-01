import { ForbiddenError, BadRequestError } from "@deploysentinel/shared";
import type { ToolContext } from "./types.js";

// Sanitization utility to defuse prompt injection and redact secrets
export function sanitizeUntrustedText(text: string): string {
  if (!text) return text;
  let sanitized = text
    .replace(/(bearer\s+)[A-Za-z0-9_\-\.]+/gi, "$1[REDACTED]")
    .replace(/(api[_-]?key\s*[:=]\s*)[A-Za-z0-9_\-]+/gi, "$1[REDACTED]")
    .replace(/(password\s*[:=]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(secret\s*[:=]\s*)\S+/gi, "$1[REDACTED]");

  // Neutralize common prompt injection directives by neutralizing command phrases
  sanitized = sanitized
    .replace(/\bignore\s+previous\s+instructions\b/gi, "[NEUTRALIZED_PROMPT_INJECTION]")
    .replace(/\bsystem\s+prompt\b/gi, "[NEUTRALIZED_PROMPT_INJECTION]")
    .replace(/\byou\s+are\s+now\s+a\b/gi, "[NEUTRALIZED_PROMPT_INJECTION]");

  return sanitized;
}

export interface DeploymentRecord {
  id: string;
  serviceId: string;
  organizationId: string;
  version: string;
  deployedAt: string;
  status: "success" | "failed";
  commitSha: string;
  changelog: string;
}

export interface ErrorRateWindowRecord {
  serviceId: string;
  organizationId: string;
  timestamp: string;
  errorRatePercent: number;
  totalRequests: number;
  errorCount: number;
}

export interface TraceSummaryRecord {
  id: string;
  serviceId: string;
  organizationId: string;
  traceId: string;
  operationName: string;
  durationMs: number;
  httpStatus: number;
  timestamp: string;
  error?: string;
}

export interface ConfigChangeRecord {
  id: string;
  serviceId: string;
  organizationId: string;
  key: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
  timestamp: string;
}

export interface AlertRecord {
  id: string;
  serviceId: string;
  organizationId: string;
  alertName: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  triggeredAt: string;
}

export class DiagnosticStore {
  private deployments: DeploymentRecord[] = [];
  private errorRates: ErrorRateWindowRecord[] = [];
  private traces: TraceSummaryRecord[] = [];
  private configChanges: ConfigChangeRecord[] = [];
  private alerts: AlertRecord[] = [];

  public seed(data: {
    deployments?: DeploymentRecord[];
    errorRates?: ErrorRateWindowRecord[];
    traces?: TraceSummaryRecord[];
    configChanges?: ConfigChangeRecord[];
    alerts?: AlertRecord[];
  }): void {
    if (data.deployments) this.deployments = [...data.deployments];
    if (data.errorRates) this.errorRates = [...data.errorRates];
    if (data.traces) this.traces = [...data.traces];
    if (data.configChanges) this.configChanges = [...data.configChanges];
    if (data.alerts) this.alerts = [...data.alerts];
  }

  public getDeployments(orgId: string, serviceId: string): DeploymentRecord[] {
    return this.deployments.filter((d) => d.organizationId === orgId && d.serviceId === serviceId);
  }

  public getErrorRates(orgId: string, serviceId: string): ErrorRateWindowRecord[] {
    return this.errorRates.filter((e) => e.organizationId === orgId && e.serviceId === serviceId);
  }

  public getTraces(orgId: string, serviceId: string): TraceSummaryRecord[] {
    return this.traces.filter((t) => t.organizationId === orgId && t.serviceId === serviceId);
  }

  public getConfigChanges(orgId: string, serviceId: string): ConfigChangeRecord[] {
    return this.configChanges.filter(
      (c) => c.organizationId === orgId && c.serviceId === serviceId,
    );
  }

  public getAlerts(orgId: string, serviceId: string): AlertRecord[] {
    return this.alerts.filter((a) => a.organizationId === orgId && a.serviceId === serviceId);
  }

  public clear(): void {
    this.deployments = [];
    this.errorRates = [];
    this.traces = [];
    this.configChanges = [];
    this.alerts = [];
  }
}

export const defaultDiagnosticStore = new DiagnosticStore();
