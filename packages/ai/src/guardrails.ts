import { BadRequestError, ForbiddenError } from "@deploysentinel/shared";
import type { InvestigationOutput, InvestigationHypothesis } from "./providers/types.js";

export const MAX_TOOL_CALLS = 4;
export const MAX_REASONING_ROUNDS = 2;
export const MAX_HYPOTHESES = 3;

export interface EvidenceValidationResult {
  validOutput: InvestigationOutput;
  invalidEvidenceCount: number;
  invalidCitations: string[];
  totalCitations: number;
  evidenceValidityRatio: number;
}

export function validateInvestigationCaps(toolCallCount: number, reasoningRounds: number): void {
  if (toolCallCount > MAX_TOOL_CALLS) {
    throw new BadRequestError(
      `Exceeded maximum allowed tool calls: ${toolCallCount} > ${MAX_TOOL_CALLS}`,
    );
  }
  if (reasoningRounds > MAX_REASONING_ROUNDS) {
    throw new BadRequestError(
      `Exceeded maximum reasoning rounds: ${reasoningRounds} > ${MAX_REASONING_ROUNDS}`,
    );
  }
}

/**
 * Validate that every cited evidence ID was actually collected by an authorized diagnostic tool.
 * Rejects or strips unsupported citations.
 */
export function validateEvidenceCitations(
  output: InvestigationOutput,
  authorizedEvidenceIds: Set<string>,
): EvidenceValidationResult {
  const invalidCitations: string[] = [];
  let totalCitations = 0;

  const sanitizedHypotheses: InvestigationHypothesis[] = [];

  for (const hyp of output.hypotheses.slice(0, MAX_HYPOTHESES)) {
    const validIds: string[] = [];
    for (const eid of hyp.evidenceIds) {
      totalCitations += 1;
      if (authorizedEvidenceIds.has(eid)) {
        validIds.push(eid);
      } else {
        invalidCitations.push(eid);
      }
    }

    sanitizedHypotheses.push({
      ...hyp,
      evidenceIds: validIds,
    });
  }

  const validCitations = totalCitations - invalidCitations.length;
  const evidenceValidityRatio = totalCitations > 0 ? validCitations / totalCitations : 1.0;

  return {
    validOutput: {
      ...output,
      hypotheses: sanitizedHypotheses,
    },
    invalidEvidenceCount: invalidCitations.length,
    invalidCitations,
    totalCitations,
    evidenceValidityRatio,
  };
}
