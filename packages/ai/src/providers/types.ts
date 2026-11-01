import type { CauseCategory } from "@deploysentinel/shared";

export interface InvestigationToolResult {
  toolName: string;
  args: Record<string, unknown>;
  output: Record<string, unknown>;
  evidenceIds: string[];
}

export interface InvestigationHypothesis {
  rank: number;
  causeCategory: CauseCategory;
  rationale: string;
  evidenceIds: string[];
}

export interface InvestigationOutput {
  hypotheses: InvestigationHypothesis[];
  missingEvidence: string[];
  uncertainty?: string;
  proposedHumanActions: string[];
  modelId: string;
  promptVersion: string;
  toolCallCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  elapsedMs: number;
}

export interface AIProvider {
  name: string;
  isOffline: boolean;
  investigate(
    incidentSnapshot: Record<string, unknown>,
    toolResults: InvestigationToolResult[],
  ): Promise<InvestigationOutput>;
}
