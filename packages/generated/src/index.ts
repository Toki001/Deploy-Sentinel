export * from "./client.js";
import type { IncidentStatus, IncidentSeverity } from "@deploysentinel/shared";

export interface ServiceDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  tier?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentDto {
  id: string;
  organizationId: string;
  serviceId: string;
  version: string;
  environment: string;
  commitSha?: string;
  deployedBy?: string;
  deployedAt: string;
}

export interface AlertDto {
  id: string;
  organizationId: string;
  serviceId: string;
  alertName: string;
  severity: IncidentSeverity;
  metricValue?: number;
  threshold?: number;
  triggeredAt: string;
}

export interface HypothesisDto {
  rank: number;
  causeCategory: string;
  rationale: string;
  evidenceIds: string[];
}

export interface InvestigationDto {
  id: string;
  incidentId: string;
  status: string;
  modelId?: string;
  hypotheses: HypothesisDto[];
  missingEvidence: string[];
  uncertainty?: string;
  proposedHumanActions: string[];
  toolCallCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface IncidentEvidenceDto {
  id: string;
  incidentId: string;
  evidenceType: string;
  sourceId: string;
  summary: string;
  payload: string;
  createdAt: string;
}

export interface IncidentDto {
  id: string;
  organizationId: string;
  serviceId: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  correlationKey: string;
  openedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  investigations?: InvestigationDto[];
  evidence?: IncidentEvidenceDto[];
}

export interface DashboardSummaryDto {
  activeIncidentsCount: number;
  criticalIncidentsCount: number;
  totalServicesCount: number;
  deployments24hCount: number;
}
