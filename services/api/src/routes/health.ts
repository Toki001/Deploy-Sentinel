import type { FastifyPluginAsync } from "fastify";
import { defaultMetrics } from "@deploysentinel/telemetry";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/healthz", async (_request, reply) => {
    return reply.status(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "@deploysentinel/api",
    });
  });

  fastify.get("/readyz", async (_request, reply) => {
    return reply.status(200).send({
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        api: "ok",
        database: process.env.DATABASE_URL ? "configured" : "unconfigured",
      },
    });
  });

  fastify.get("/health/live", async (_request, reply) => {
    return reply.status(200).send({ status: "alive" });
  });

  fastify.get("/health/ready", async (_request, reply) => {
    return reply.status(200).send({ status: "ready" });
  });

  // Prometheus Metrics Exposition Endpoint
  fastify.get("/metrics", async (_request, reply) => {
    const text = defaultMetrics.toPrometheusText();
    return reply
      .header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
      .status(200)
      .send(text);
  });
};
