import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { BadRequestError } from "@deploysentinel/shared";

export const eventRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/v1/events", async (request, reply) => {
    const body = request.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== "object") {
      throw new BadRequestError("Missing or invalid event body");
    }

    const eventId = (body.eventId as string) || randomUUID();
    const idempotencyKey = request.headers["idempotency-key"] as string | undefined;

    return reply.status(202).send({
      eventId,
      idempotencyKey: idempotencyKey || null,
      status: "pending_dispatch",
      receivedAt: new Date().toISOString(),
    });
  });

  fastify.get("/v1/incidents", async (_request, reply) => {
    return reply.status(200).send({
      items: [],
      nextCursor: null,
      hasMore: false,
      total: 0,
    });
  });

  fastify.post("/v1/incidents/:id/acknowledge", async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.status(200).send({
      id,
      status: "acknowledged",
      acknowledgedAt: new Date().toISOString(),
    });
  });

  fastify.post("/v1/incidents/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.status(200).send({
      id,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    });
  });

  fastify.post("/v1/incidents/:id/investigations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const jobId = randomUUID();
    return reply.status(202).send({
      jobId,
      incidentId: id,
      status: "queued",
      createdAt: new Date().toISOString(),
    });
  });

  fastify.get("/v1/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.status(200).send({
      id,
      status: "completed",
      result: {
        hypotheses: [],
      },
    });
  });

  fastify.post("/v1/events/:id/replay", async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.status(202).send({
      eventId: id,
      replayStatus: "accepted",
      replayedAt: new Date().toISOString(),
    });
  });
};
