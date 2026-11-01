import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildApp } from "../../services/api/src/app";

describe("Contract Drift: OpenAPI 3.1 Spec vs Implemented Routes", () => {
  it("should implement all endpoints declared in packages/contracts/openapi.yaml", async () => {
    const yamlPath = join(process.cwd(), "packages/contracts/openapi.yaml");
    const yamlContent = readFileSync(yamlPath, "utf-8");

    // Extract path keys declared in openapi.yaml
    const declaredPaths: string[] = [];
    const lines = yamlContent.split("\n");
    let inPaths = false;

    for (const line of lines) {
      if (line.startsWith("paths:")) {
        inPaths = true;
        continue;
      }
      if (inPaths) {
        if (line.startsWith("components:")) {
          break;
        }
        const match = line.match(/^  (\/[^:]+):/);
        if (match) {
          declaredPaths.push(match[1]);
        }
      }
    }

    expect(declaredPaths.length).toBeGreaterThan(0);

    const registeredRoutes: string[] = [];
    const app = await buildApp({
      onRoute: (r) => registeredRoutes.push(r.url),
    });
    await app.ready();

    for (const openApiPath of declaredPaths) {
      // Normalize openapi path {param} to fastify :param
      const fastifyPattern = openApiPath.replace(/\{([^}]+)\}/g, ":$1");
      expect(registeredRoutes).toContain(fastifyPattern);
    }

    await app.close();
  });
});
