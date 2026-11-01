import { createSchema, createYoga } from "graphql-yoga";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Simple fallback schema if file read not resolved
const typeDefs = `
  enum IncidentStatus {
    OPEN
    ACKNOWLEDGED
    INVESTIGATING
    MITIGATED
    RESOLVED
  }

  enum IncidentSeverity {
    CRITICAL
    HIGH
    MEDIUM
    LOW
  }

  type Service {
    id: ID!
    organizationId: ID!
    name: String!
    description: String
    tier: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type Deployment {
    id: ID!
    organizationId: ID!
    serviceId: ID!
    version: String!
    environment: String!
    commitSha: String
    deployedBy: String
    deployedAt: String!
  }

  type Incident {
    id: ID!
    organizationId: ID!
    serviceId: ID!
    title: String!
    status: IncidentStatus!
    severity: IncidentSeverity!
    correlationKey: String!
    openedAt: String!
    acknowledgedAt: String
    resolvedAt: String
  }

  type DashboardSummary {
    activeIncidentsCount: Int!
    criticalIncidentsCount: Int!
    totalServicesCount: Int!
    deployments24hCount: Int!
  }

  type Query {
    services: [Service!]!
    service(id: ID!): Service
    deployments(serviceId: ID, limit: Int): [Deployment!]!
    incidents(status: IncidentStatus, limit: Int, cursor: String): [Incident!]!
    incident(id: ID!): Incident
    dashboardSummary: DashboardSummary!
  }

  type Mutation {
    acknowledgeIncident(id: ID!): Incident!
    resolveIncident(id: ID!): Incident!
  }
`;

const resolvers = {
  Query: {
    services: () => [
      {
        id: "svc-checkout",
        organizationId: "org-demo",
        name: "checkout-service",
        description: "Payment and checkout processing pipeline",
        tier: "tier-1",
        status: "healthy",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "svc-auth",
        organizationId: "org-demo",
        name: "auth-gateway",
        description: "Edge authentication and session token verification",
        tier: "tier-1",
        status: "healthy",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    service: (_: unknown, { id }: { id: string }) => ({
      id,
      organizationId: "org-demo",
      name: `service-${id}`,
      description: "Service instance",
      tier: "tier-2",
      status: "healthy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    deployments: () => [],
    incidents: () => [],
    incident: (_: unknown, { id }: { id: string }) => ({
      id,
      organizationId: "org-demo",
      serviceId: "svc-checkout",
      title: "Checkout latency surge after v2.4.1 deployment",
      status: "OPEN",
      severity: "CRITICAL",
      correlationKey: "corr-101",
      openedAt: new Date().toISOString(),
    }),
    dashboardSummary: () => ({
      activeIncidentsCount: 0,
      criticalIncidentsCount: 0,
      totalServicesCount: 2,
      deployments24hCount: 4,
    }),
  },
  Mutation: {
    acknowledgeIncident: (_: unknown, { id }: { id: string }) => ({
      id,
      organizationId: "org-demo",
      serviceId: "svc-checkout",
      title: "Acknowledged Incident",
      status: "ACKNOWLEDGED",
      severity: "HIGH",
      correlationKey: "corr-101",
      openedAt: new Date().toISOString(),
      acknowledgedAt: new Date().toISOString(),
    }),
    resolveIncident: (_: unknown, { id }: { id: string }) => ({
      id,
      organizationId: "org-demo",
      serviceId: "svc-checkout",
      title: "Resolved Incident",
      status: "RESOLVED",
      severity: "HIGH",
      correlationKey: "corr-101",
      openedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    }),
  },
};

export const schema = createSchema({
  typeDefs,
  resolvers,
});

export const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
});
