import { ConflictError, BadRequestError } from "@deploysentinel/shared";

export type IncidentStatus = "open" | "acknowledged" | "investigating" | "mitigated" | "resolved";

export const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["acknowledged", "investigating", "resolved"],
  acknowledged: ["investigating", "mitigated", "resolved"],
  investigating: ["mitigated", "resolved", "acknowledged"],
  mitigated: ["resolved", "investigating", "open"],
  resolved: ["open"], // Justified reopen if regression or new correlated alarm triggers
};

export function isValidTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidTransition(from: IncidentStatus, to: IncidentStatus): void {
  if (!isValidTransition(from, to)) {
    throw new BadRequestError(
      `Invalid incident transition from '${from}' to '${to}'. Allowed transitions from '${from}': [${VALID_TRANSITIONS[from]?.join(", ") || "none"}]`,
    );
  }
}

export interface TransitionContext {
  incidentId: string;
  currentStatus: IncidentStatus;
  currentVersion: number;
  expectedVersion?: number;
  newStatus: IncidentStatus;
  actorId: string;
  reason?: string;
}

export interface TransitionResult {
  incidentId: string;
  previousStatus: IncidentStatus;
  newStatus: IncidentStatus;
  newVersion: number;
  transitionedAt: string;
}

export function applyIncidentTransition(ctx: TransitionContext): TransitionResult {
  // 1. Optimistic Concurrency Check
  if (ctx.expectedVersion !== undefined && ctx.expectedVersion !== ctx.currentVersion) {
    throw new ConflictError(
      `Optimistic concurrency conflict on incident '${ctx.incidentId}': expected version ${ctx.expectedVersion}, but current version is ${ctx.currentVersion}`,
    );
  }

  // 2. State Machine Rule Check
  assertValidTransition(ctx.currentStatus, ctx.newStatus);

  return {
    incidentId: ctx.incidentId,
    previousStatus: ctx.currentStatus,
    newStatus: ctx.newStatus,
    newVersion: ctx.currentVersion + 1,
    transitionedAt: new Date().toISOString(),
  };
}
