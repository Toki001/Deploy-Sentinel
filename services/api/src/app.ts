import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { eventRoutes } from "./routes/events.js";
import { yoga } from "./graphql/yoga.js";
import { AppError, logger } from "@deploysentinel/shared";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Error handling
  app.setErrorHandler((error, request, reply) => {
    logger.error(`[API Error] ${request.method} ${request.url}: ${error.message}`, error);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: request.id,
      });
    }

    return reply.status(500).send({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message || "An unexpected error occurred",
      requestId: request.id,
    });
  });

  // Health and business routes
  await app.register(healthRoutes);
  await app.register(webhookRoutes);
  await app.register(eventRoutes);

  // GraphQL Yoga mount
  app.route({
    url: "/graphql",
    method: ["GET", "POST", "OPTIONS"],
    handler: async (req, reply) => {
      const response = await yoga.handleNodeRequestAndResponse(req.raw, reply.raw);
      reply.sent = true;
      return response;
    },
  });

  return app;
}
