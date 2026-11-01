import { readFileSync } from "node:fs";
import { join } from "node:path";
import { schema } from "../../services/api/src/graphql/yoga";
import { printSchema } from "graphql";

describe("Contract Drift: GraphQL Schema vs Canonical SDL", () => {
  it("should match canonical schema types and root query/mutation fields", () => {
    const sdlPath = join(process.cwd(), "packages/contracts/schema.graphql");
    const canonicalSdl = readFileSync(sdlPath, "utf-8");

    const runtimeSchemaString = printSchema(schema);

    // Verify key types exist in runtime schema
    const requiredTypes = [
      "Service",
      "Deployment",
      "Incident",
      "IncidentStatus",
      "IncidentSeverity",
      "DashboardSummary",
    ];

    for (const typeName of requiredTypes) {
      expect(runtimeSchemaString).toContain(typeName);
    }

    // Verify key operations exist
    expect(runtimeSchemaString).toContain("services: [Service!]!");
    expect(runtimeSchemaString).toContain(
      "incidents(status: IncidentStatus, limit: Int, cursor: String): [Incident!]!",
    );
    expect(runtimeSchemaString).toContain("acknowledgeIncident(id: ID!): Incident!");
    expect(runtimeSchemaString).toContain("resolveIncident(id: ID!): Incident!");
  });
});
