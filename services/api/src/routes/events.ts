import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  assertRole,
  clampLimit,
  encodeCursor,
  decodeCursor,
} from "@deploysentinel/shared";
import type { IncidentDto } from "@deploysentinel/generated";

// In-memory tenant-scoped fixtures for API demo and testing
const mockIncidentsStore: IncidentDto[] = [
  {
    id: "INC-1049",
    organizationId: "org-demo",
    serviceId: "checkout-service",
    title: "Checkout API 504 Gateway Timeout spike following v2.4.1 release",
    status: "investigating",
    severity: "critical",
    correlationKey: "corr-checkout-service-2026",
    openedAt: "2026-11-01T10:15:00.000Z",
    investigations: [
      {
        id: "INV-2041",
        incidentId: "INC-1049",
        status: "completed",
        modelId: "offline-deterministic-v1",
        toolCallCount: 3,
        hypotheses: [
          {
            rank: 1,
            causeCategory: "release_regression",
            rationale: "Timeout surge correlates directly with v2.4.1 deployment artifact.",
            evidenceIds: ["ev-dep-9f8a12c", "ev-err-spike-1404"],
          },
        ],
        missingEvidence: [],
        proposedHumanActions: ["Review diff of v2.4.1", "Verify DB connection pool"],
        createdAt: "2026-11-01T10:18:00.000Z",
      },
    ],
  },
  {
    id: "INC-1048",
    organizationId: "org-demo",
    serviceId: "auth-gateway",
    title: "Auth Gateway JWT validation failure rate elevated",
    status: "acknowledged",
    severity: "high",
    correlationKey: "corr-auth-gateway-2026",
    openedAt: "2026-11-01T09:30:00.000Z",
    acknowledgedAt: "2026-11-01T09:35:00.000Z",
  },
  {
    id: "INC-1047",
    organizationId: "org-demo",
    serviceId: "search-indexer",
    title: "Search indexer replication lag exceeding 45 seconds",
    status: "resolved",
    severity: "medium",
    correlationKey: "corr-search-indexer-2026",
    openedAt: "2026-11-01T06:00:00.000Z",
    resolvedAt: "2026-11-01T06:45:00.000Z",
  },
];

export const eventRoutes: FastifyPluginAsync = async (fastify) => {
  // Authenticated Event Ingress
  fastify.post("/v1/events", async (request, reply) => {
    const user = request.user;
    const body = request.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== "object") {
      throw new BadRequestError("Missing or invalid event body");
    }

    const eventId = (body.eventId as string) || `evt-${randomUUID().substring(0, 8)}`;
    const idempotencyKey = request.headers["idempotency-key"] as string | undefined;

    return reply.status(202).send({
      eventId,
      idempotencyKey: idempotencyKey || null,
      status: "pending_dispatch",
      organizationId: user?.organizationId || "org-demo",
      receivedAt: new Date().toISOString(),
    });
  });

  // List Incidents with Cursor Pagination
  fastify.get("/v1/incidents", async (request, reply) => {
    const user = request.user;
    const query = request.query as { limit?: string; cursor?: string; status?: string };
    const limit = clampLimit(query.limit, 20, 100);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    // Filter by tenant
    let filtered = mockIncidentsStore.filter(
      (inc) => inc.organizationId === (user?.organizationId || "org-demo"),
    );

    if (query.status) {
      filtered = filtered.filter((inc) => inc.status === query.status);
    }

    // Sort stable (openedAt DESC, id DESC)
    filtered.sort((a, b) => {
      const cmp = new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
      return cmp !== 0 ? cmp : b.id.localeCompare(a.id);
    });

    // Apply cursor
    let startIndex = 0;
    if (cursor) {
      const cursorTime = new Date(cursor.timestamp).getTime();
      startIndex = filtered.findIndex((inc) => {
        const incTime = new Date(inc.openedAt).getTime();
        return incTime < cursorTime || (incTime === cursorTime && inc.id < cursor.id);
      });
      if (startIndex === -1) startIndex = filtered.length;
    }

    const items = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filtered.length;
    let nextCursor: string | undefined = undefined;

    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor({ timestamp: lastItem.openedAt, id: lastItem.id });
    }

    return reply.status(200).send({
      items,
      nextCursor,
      hasMore,
      total: filtered.length,
    });
  });

  // Get Incident Detail
  fastify.get("/v1/incidents/:id", async (request, reply) => {
    const user = request.user;
    const { id } = request.params as { id: string };
    const incident = mockIncidentsStore.find(
      (inc) => inc.id === id && inc.organizationId === (user?.organizationId || "org-demo"),
    );

    if (!incident) {
      throw new NotFoundError(`Incident ${id} not found in current organization scope`);
    }

    return reply.status(200).send(incident);
  });

  // Acknowledge Incident (Requires on_call or org_admin)
  fastify.post("/v1/incidents/:id/acknowledge", async (request, reply) => {
    assertRole(request.user, "on_call");
    const user = request.user!;
    const { id } = request.params as { id: string };

    const incident = mockIncidentsStore.find(
      (inc) => inc.id === id && inc.organizationId === user.organizationId,
    );
    if (!incident) {
      throw new NotFoundError(`Incident ${id} not found`);
    }

    incident.status = "acknowledged";
    incident.acknowledgedAt = new Date().toISOString();

    return reply.status(200).send(incident);
  });

  // Resolve Incident (Requires on_call or org_admin)
  fastify.post("/v1/incidents/:id/resolve", async (request, reply) => {
    assertRole(request.user, "on_call");
    const user = request.user!;
    const { id } = request.params as { id: string };

    const incident = mockIncidentsStore.find(
      (inc) => inc.id === id && inc.organizationId === user.organizationId,
    );
    if (!incident) {
      throw new NotFoundError(`Incident ${id} not found`);
    }

    incident.status = "resolved";
    incident.resolvedAt = new Date().toISOString();

    return reply.status(200).send(incident);
  });

  // Request Investigation (Requires on_call or org_admin)
  fastify.post("/v1/incidents/:id/investigations", async (request, reply) => {
    assertRole(request.user, "on_call");
    const user = request.user!;
    const { id } = request.params as { id: string };

    const incident = mockIncidentsStore.find(
      (inc) => inc.id === id && inc.organizationId === user.organizationId,
    );
    if (!incident) {
      throw new NotFoundError(`Incident ${id} not found`);
    }

    const jobId = `job-${randomUUID().substring(0, 8)}`;
    return reply.status(202).send({
      jobId,
      incidentId: id,
      status: "queued",
      createdAt: new Date().toISOString(),
    });
  });

  // Check Job Status
  fastify.get("/v1/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.status(200).send({
      id,
      status: "completed",
      result: {
        hypotheses: [
          {
            rank: 1,
            causeCategory: "release_regression",
            rationale: "Correlated deployment artifact timeout spike.",
            evidenceIds: ["ev-dep-9f8a12c"],
          },
        ],
      },
    });
  });

  // Privileged DLQ Event Replay (Requires on_call or org_admin)
  fastify.post("/v1/events/:id/replay", async (request, reply) => {
    assertRole(request.user, "on_call");
    const { id } = request.params as { id: string };

    return reply.status(202).send({
      eventId: id,
      replayStatus: "accepted",
      replayedAt: new Date().toISOString(),
      replayedBy: request.user?.userId,
    });
  });
};
