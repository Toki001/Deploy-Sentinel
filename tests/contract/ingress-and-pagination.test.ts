import { buildApp } from "../../services/api/src/app";
import { computeHmacSignature } from "@deploysentinel/shared";
import type { FastifyInstance } from "fastify";

describe("Webhook Ingress & Pagination Semantics", () => {
  let app: FastifyInstance;
  const secret = "dev_webhook_signing_secret_32bytes!";

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should accept HMAC signed deployment webhook and return 202 pending_dispatch", async () => {
    const payload = {
      serviceId: "checkout-service",
      version: "v2.4.1",
      environment: "production",
    };
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const rawBody = JSON.stringify(payload);
    const signature = computeHmacSignature(secret, timestamp, rawBody);

    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks/deployments",
      headers: {
        "content-type": "application/json",
        "x-signature": signature,
        "x-timestamp": timestamp,
      },
      payload,
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("pending_dispatch");
    expect(body.eventId).toBeDefined();
    expect(res.headers["x-ratelimit-limit"]).toBe("100");
  });

  it("should reject tampered webhook signature with 401 Unauthorized", async () => {
    const payload = { serviceId: "checkout-service", version: "v2.4.1" };
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks/deployments",
      headers: {
        "content-type": "application/json",
        "x-signature": "v1=invalid_tampered_signature_hex",
        "x-timestamp": timestamp,
      },
      payload,
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("should accept authenticated event submission with Idempotency-Key", async () => {
    const event = {
      eventId: "evt-test-123",
      eventType: "DeploymentCreated",
      serviceId: "auth-gateway",
    };

    const res = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: {
        "idempotency-key": "idem-key-8899",
        authorization: "Bearer token-oncall",
      },
      payload: event,
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("pending_dispatch");
    expect(body.idempotencyKey).toBe("idem-key-8899");
  });

  it("should clamp pagination limit to max 100", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/incidents?limit=500",
      headers: {
        authorization: "Bearer token-oncall",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items.length).toBeLessThanOrEqual(100);
  });
});
