import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerAuthHooks } from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { eventRoutes } from "./routes/events.js";
import { yoga } from "./graphql/yoga.js";
import { AppError, logger } from "@deploysentinel/shared";

export interface BuildAppOptions {
  onRoute?: (route: { method: string | string[]; url: string }) => void;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  if (options.onRoute) {
    app.addHook("onRoute", (routeOptions) => {
      options.onRoute?.({ method: routeOptions.method, url: routeOptions.url });
    });
  }

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Authentication and tenancy hook (global on root instance)
  registerAuthHooks(app);

  // Global Error Handler
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

  // Route registration
  await app.register(healthRoutes);
  await app.register(webhookRoutes);
  await app.register(eventRoutes);

  // GraphQL Yoga mount
  app.route({
    url: "/graphql",
    method: ["GET", "POST", "OPTIONS"],
    handler: async (req, reply) => {
      const response = await yoga.fetch(
        `http://localhost${req.url}`,
        {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === "POST" && req.body ? JSON.stringify(req.body) : undefined,
        },
        { req, reply },
      );

      for (const [name, value] of response.headers) {
        reply.header(name, value);
      }
      reply.status(response.status);
      const text = await response.text();
      return reply.send(text);
    },
  });

  return app;
}
