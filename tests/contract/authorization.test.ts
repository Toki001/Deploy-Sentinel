import { buildApp } from "../../services/api/src/app";
import type { FastifyInstance } from "fastify";

describe("API Security & RBAC Enforcement", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should permit viewer role to list and read incidents", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/incidents",
      headers: {
        authorization: "Bearer token-viewer",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toBeDefined();
  });

  it("should reject viewer role when attempting to acknowledge an incident (403 Forbidden)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/incidents/INC-1049/acknowledge",
      headers: {
        authorization: "Bearer token-viewer",
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.code).toBe("FORBIDDEN");
    expect(body.message).toContain("requires role 'on_call'");
  });

  it("should allow on_call role to acknowledge an incident", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/incidents/INC-1049/acknowledge",
      headers: {
        authorization: "Bearer token-oncall",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("acknowledged");
  });

  it("should reject cross-tenant access with 404 (IDOR isolation)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/incidents/INC-1049",
      headers: {
        authorization: "Bearer token-other-org", // user in org-other-tenant
      },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.message).toContain("not found in current organization scope");
  });

  it("should reject unauthenticated request when dev bypass disabled", async () => {
    const oldVal = process.env.DEV_AUTH_BYPASS;
    process.env.DEV_AUTH_BYPASS = "false";

    const res = await app.inject({
      method: "GET",
      url: "/v1/incidents",
    });

    process.env.DEV_AUTH_BYPASS = oldVal;
    expect(res.statusCode).toBe(401);
  });
});
