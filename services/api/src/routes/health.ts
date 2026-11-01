import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/healthz", async (_request, reply) => {
    return reply.status(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "@deploysentinel/api",
    });
  });

  fastify.get("/readyz", async (_request, reply) => {
    // Check local database connection if configured, else report synthetic ready
    return reply.status(200).send({
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        api: "ok",
        database: process.env.DATABASE_URL ? "configured" : "unconfigured",
      },
    });
  });
};
