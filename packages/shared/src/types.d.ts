export type Role = "org_admin" | "on_call" | "viewer";
export interface UserContext {
    userId: string;
    email: string;
    organizationId: string;
    role: Role;
}
export type IncidentStatus = "open" | "acknowledged" | "investigating" | "mitigated" | "resolved";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type CauseCategory = "release_regression" | "bad_configuration" | "dependency_failure" | "traffic_spike" | "database_saturation" | "telemetry_gap" | "ambiguous" | "unrelated_noise";
export interface EventEnvelope<T = Record<string, unknown>> {
    eventId: string;
    eventType: string;
    schemaVersion: string;
    organizationId: string;
    serviceId: string;
    environment: string;
    occurredAt: string;
    receivedAt: string;
    correlationId: string;
    payload: T;
    traceContext?: {
        traceId?: string;
        spanId?: string;
    };
}
export interface PaginationParams {
    limit?: number;
    cursor?: string;
}
export interface PaginatedResult<T> {
    items: T[];
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
}
//# sourceMappingURL=types.d.ts.map