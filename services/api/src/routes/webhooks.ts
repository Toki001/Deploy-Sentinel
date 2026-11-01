import type { FastifyPluginAsync } from "fastify";
import { verifyHmacSignature, UnauthorizedError, BadRequestError } from "@deploysentinel/shared";
import { randomUUID } from "node:crypto";

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  const secret = process.env.WEBHOOK_DEFAULT_SECRET || "dev_webhook_signing_secret_32bytes!";

  const verifySignature = (
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ) => {
    const signature = headers["x-signature"] as string | undefined;
    const timestamp = headers["x-timestamp"] as string | undefined;

    if (!signature || !timestamp) {
      // In dev bypass mode if explicitly permitted
      if (process.env.DEV_AUTH_BYPASS === "true") {
        return;
      }
      throw new UnauthorizedError("Missing signature or timestamp header");
    }

    const { valid, reason } = verifyHmacSignature(secret, signature, timestamp, rawBody);
    if (!valid) {
      throw new UnauthorizedError(`Webhook signature verification failed: ${reason}`);
    }
  };

  fastify.post("/v1/webhooks/deployments", async (request, reply) => {
    const rawBody = JSON.stringify(request.body || {});
    verifySignature(request.headers, rawBody);

    const eventId = randomUUID();
    return reply.status(202).send({
      eventId,
      status: "pending_dispatch",
      receivedAt: new Date().toISOString(),
    });
  });

  fastify.post("/v1/webhooks/alerts", async (request, reply) => {
    const rawBody = JSON.stringify(request.body || {});
    verifySignature(request.headers, rawBody);

    const eventId = randomUUID();
    return reply.status(202).send({
      eventId,
      status: "pending_dispatch",
      receivedAt: new Date().toISOString(),
    });
  });

  fastify.post("/v1/webhooks/config-changes", async (request, reply) => {
    const rawBody = JSON.stringify(request.body || {});
    verifySignature(request.headers, rawBody);

    const eventId = randomUUID();
    return reply.status(202).send({
      eventId,
      status: "pending_dispatch",
      receivedAt: new Date().toISOString(),
    });
  });
};
