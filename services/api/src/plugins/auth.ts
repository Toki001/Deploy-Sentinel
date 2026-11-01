import type { FastifyInstance, FastifyRequest } from "fastify";
import { resolveUserContext, type UserContext } from "@deploysentinel/shared";

declare module "fastify" {
  interface FastifyRequest {
    user?: UserContext;
  }
}

export function registerAuthHooks(fastify: FastifyInstance): void {
  fastify.decorateRequest("user", undefined);

  fastify.addHook("onRequest", async (request: FastifyRequest, reply) => {
    // Add rate limit headers to all responses
    reply.header("X-RateLimit-Limit", "100");
    reply.header("X-RateLimit-Remaining", "99");

    // Public health routes
    if (request.url === "/healthz" || request.url === "/readyz") {
      return;
    }

    // Webhooks authenticate via HMAC signatures in their specific handlers
    if (request.url.startsWith("/v1/webhooks/")) {
      return;
    }

    // Resolve user context for all other routes
    try {
      request.user = resolveUserContext(request.headers);
    } catch (err) {
      if (request.url.startsWith("/graphql")) {
        // GraphQL allows unauthenticated introspection or handles inside resolvers
        return;
      }
      throw err;
    }
  });
}
