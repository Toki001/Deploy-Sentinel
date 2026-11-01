import type { IncidentDto, ServiceDto, DeploymentDto, InvestigationDto } from "./index.js";

export interface ClientConfig {
  baseUrl: string;
  authToken?: string;
  devHeaders?: {
    userId?: string;
    orgId?: string;
    role?: "org_admin" | "on_call" | "viewer";
  };
}

export class DeploySentinelClient {
  private baseUrl: string;
  private authToken?: string;
  private devHeaders?: ClientConfig["devHeaders"];

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.authToken = config.authToken;
    this.devHeaders = config.devHeaders;
  }

  private getHeaders(
    extraHeaders: Record<string, string> = {},
    hasBody = false,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...extraHeaders,
    };
    if (hasBody && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    if (this.devHeaders) {
      if (this.devHeaders.userId) headers["x-dev-user-id"] = this.devHeaders.userId;
      if (this.devHeaders.orgId) headers["x-dev-org-id"] = this.devHeaders.orgId;
      if (this.devHeaders.role) headers["x-dev-role"] = this.devHeaders.role;
    }
    return headers;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const hasBody = Boolean(options.body);
    const headers = this.getHeaders(options.headers as Record<string, string>, hasBody);
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorBody: Record<string, unknown> = {};
      try {
        errorBody = (await res.json()) as Record<string, unknown>;
      } catch {
        // ignore JSON parse error
      }
      const err = new Error(
        (errorBody.message as string) || `HTTP error ${res.status}: ${res.statusText}`,
      );
      (err as unknown as Record<string, unknown>).status = res.status;
      (err as unknown as Record<string, unknown>).code = errorBody.code;
      (err as unknown as Record<string, unknown>).details = errorBody.details;
      throw err;
    }

    return (await res.json()) as T;
  }

  public async getHealth() {
    return this.request<{ status: string; timestamp: string; service: string }>("/healthz");
  }

  public async getReadiness() {
    return this.request<{ status: string; checks: Record<string, string> }>("/readyz");
  }

  public async postDeploymentWebhook(
    payload: Record<string, unknown>,
    signature: string,
    timestamp: string,
  ) {
    return this.request<{ eventId: string; status: string; receivedAt: string }>(
      "/v1/webhooks/deployments",
      {
        method: "POST",
        headers: {
          "x-signature": signature,
          "x-timestamp": timestamp,
        },
        body: JSON.stringify(payload),
      },
    );
  }

  public async postAlertWebhook(
    payload: Record<string, unknown>,
    signature: string,
    timestamp: string,
  ) {
    return this.request<{ eventId: string; status: string; receivedAt: string }>(
      "/v1/webhooks/alerts",
      {
        method: "POST",
        headers: {
          "x-signature": signature,
          "x-timestamp": timestamp,
        },
        body: JSON.stringify(payload),
      },
    );
  }

  public async postConfigChangeWebhook(
    payload: Record<string, unknown>,
    signature: string,
    timestamp: string,
  ) {
    return this.request<{ eventId: string; status: string; receivedAt: string }>(
      "/v1/webhooks/config-changes",
      {
        method: "POST",
        headers: {
          "x-signature": signature,
          "x-timestamp": timestamp,
        },
        body: JSON.stringify(payload),
      },
    );
  }

  public async postEvent(event: Record<string, unknown>, idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<{ eventId: string; status: string; idempotencyKey?: string }>(
      "/v1/events",
      {
        method: "POST",
        headers,
        body: JSON.stringify(event),
      },
    );
  }

  public async getIncidents(params: { limit?: number; cursor?: string; status?: string } = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.status) query.set("status", params.status);
    const qs = query.toString();
    return this.request<{
      items: IncidentDto[];
      nextCursor?: string;
      hasMore: boolean;
      total: number;
    }>(`/v1/incidents${qs ? `?${qs}` : ""}`);
  }

  public async getIncident(id: string) {
    return this.request<IncidentDto>(`/v1/incidents/${id}`);
  }

  public async acknowledgeIncident(id: string) {
    return this.request<IncidentDto>(`/v1/incidents/${id}/acknowledge`, { method: "POST" });
  }

  public async resolveIncident(id: string) {
    return this.request<IncidentDto>(`/v1/incidents/${id}/resolve`, { method: "POST" });
  }

  public async requestInvestigation(incidentId: string) {
    return this.request<{ jobId: string; incidentId: string; status: string }>(
      `/v1/incidents/${incidentId}/investigations`,
      { method: "POST" },
    );
  }

  public async getJob(id: string) {
    return this.request<{ id: string; status: string; result?: Record<string, unknown> }>(
      `/v1/jobs/${id}`,
    );
  }

  public async replayEvent(id: string) {
    return this.request<{ eventId: string; replayStatus: string }>(`/v1/events/${id}/replay`, {
      method: "POST",
    });
  }

  public async graphql<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    return this.request<{ data?: T; errors?: Array<{ message: string }> }>("/graphql", {
      method: "POST",
      body: JSON.stringify({ query, variables }),
    });
  }
}

export function createDeploySentinelClient(config: ClientConfig) {
  return new DeploySentinelClient(config);
}
