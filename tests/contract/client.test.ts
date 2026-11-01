import { buildApp } from "../../services/api/src/app";
import { createDeploySentinelClient } from "@deploysentinel/generated";
import type { FastifyInstance } from "fastify";

describe("Generated Typed Client Contract Test", () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof createDeploySentinelClient>;
  const port = 4199;

  beforeAll(async () => {
    app = await buildApp();
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    client = createDeploySentinelClient({
      baseUrl: address,
      authToken: "token-oncall",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("should query health via typed client", async () => {
    const health = await client.getHealth();
    expect(health.status).toBe("ok");
    expect(health.service).toBe("@deploysentinel/api");
  });

  it("should query incidents via typed client with pagination", async () => {
    const res = await client.getIncidents({ limit: 5 });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].id).toBe("INC-1049");
  });

  it("should acknowledge incident via typed client", async () => {
    const ack = await client.acknowledgeIncident("INC-1049");
    expect(ack.status).toBe("acknowledged");
  });

  it("should execute GraphQL queries via typed client", async () => {
    const gqlRes = await client.graphql<{ services: Array<{ id: string; name: string }> }>(`
      query {
        services {
          id
          name
        }
      }
    `);
    expect(gqlRes.data?.services).toBeDefined();
    expect(gqlRes.data?.services.length).toBeGreaterThan(0);
    expect(gqlRes.data?.services[0].name).toBe("checkout-service");
  });
});
