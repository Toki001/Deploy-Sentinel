export interface SeedData {
  organizations: Array<{ id: string; name: string; slug: string }>;
  users: Array<{ id: string; email: string; name: string }>;
  services: Array<{
    id: string;
    organizationId: string;
    name: string;
    tier: string;
    status: string;
    description: string;
  }>;
  deployments: Array<{
    id: string;
    organizationId: string;
    serviceId: string;
    version: string;
    environment: string;
    commitSha: string;
    deployedBy: string;
    deployedAt: string;
  }>;
  alerts: Array<{
    id: string;
    organizationId: string;
    serviceId: string;
    alertName: string;
    severity: string;
    metricValue: number;
    threshold: number;
    triggeredAt: string;
  }>;
  incidents: Array<{
    id: string;
    organizationId: string;
    serviceId: string;
    title: string;
    status: string;
    severity: string;
    correlationKey: string;
    version: number;
    openedAt: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
  }>;
  investigations: Array<{
    id: string;
    incidentId: string;
    organizationId: string;
    status: string;
    modelId: string;
    toolCallCount: number;
    hypotheses: Array<{
      rank: number;
      causeCategory: string;
      rationale: string;
      evidenceIds: string[];
    }>;
  }>;
}

export function generateSeedData(): SeedData {
  const orgId = "org-demo";

  const organizations = [
    { id: orgId, name: "Acme Cloud Platform", slug: "acme-cloud" },
    { id: "org-secondary", name: "Staging Sandbox", slug: "staging-sandbox" },
  ];

  const users = [
    { id: "usr-admin-1", email: "admin@deploysentinel.local", name: "Lead SRE" },
    { id: "usr-oncall-1", email: "oncall@company.internal", name: "Primary On-Call" },
    { id: "usr-viewer-1", email: "viewer@company.internal", name: "Stakeholder Viewer" },
  ];

  const serviceNames = [
    {
      name: "checkout-service",
      tier: "tier-1",
      desc: "Customer checkout and shopping cart finalization",
    },
    { name: "auth-gateway", tier: "tier-1", desc: "Authentication and session token verification" },
    { name: "payment-processor", tier: "tier-1", desc: "Third-party payment gateway integration" },
    { name: "inventory-api", tier: "tier-2", desc: "Warehouse inventory reservation" },
    {
      name: "notification-service",
      tier: "tier-3",
      desc: "Transactional email and SMS dispatcher",
    },
    { name: "search-indexer", tier: "tier-2", desc: "Catalog search indexing and query pipeline" },
    { name: "user-profile", tier: "tier-2", desc: "User identity and profile management" },
    { name: "shipping-calculator", tier: "tier-2", desc: "Real-time courier rate quotation" },
    { name: "recommendation-engine", tier: "tier-3", desc: "Machine learning recommendations" },
    { name: "billing-ledger", tier: "tier-1", desc: "Double-entry financial accounting ledger" },
  ];

  const services = serviceNames.map((svc, idx) => ({
    id: `svc-${idx + 101}`,
    organizationId: orgId,
    name: svc.name,
    tier: svc.tier,
    status: idx === 0 ? "degraded" : "healthy",
    description: svc.desc,
  }));

  // Generate 30 Deployments (3 per service)
  const baseTime = new Date("2026-11-01T08:00:00Z").getTime();
  const deployments: SeedData["deployments"] = [];

  services.forEach((svc, svcIdx) => {
    for (let d = 1; d <= 3; d++) {
      const depTime = new Date(baseTime + (svcIdx * 3 + d) * 3600 * 1000).toISOString();
      deployments.push({
        id: `dep-${svcIdx * 3 + d + 200}`,
        organizationId: orgId,
        serviceId: svc.id,
        version: `v${d}.${svcIdx}.0`,
        environment: "production",
        commitSha: `commit-${svcIdx}-${d}a8f9c`,
        deployedBy: "deploy-bot@company.internal",
        deployedAt: depTime,
      });
    }
  });

  // Generate 100 Alerts across services (including noise and correlated alerts)
  const alerts: SeedData["alerts"] = [];
  const alertTypes = [
    { name: "High5xxErrorRate", severity: "critical", threshold: 5.0 },
    { name: "LatencyP99Spike", severity: "high", threshold: 500.0 },
    { name: "DatabaseConnectionPoolSaturation", severity: "critical", threshold: 85.0 },
    { name: "CpuThrottlingAlert", severity: "medium", threshold: 75.0 },
    { name: "MemoryNearLimit", severity: "medium", threshold: 90.0 },
  ];

  for (let i = 1; i <= 100; i++) {
    const svc = services[i % services.length];
    const alertDef = alertTypes[i % alertTypes.length];
    const alertTime = new Date(baseTime + i * 900 * 1000).toISOString();
    alerts.push({
      id: `alt-${i + 1000}`,
      organizationId: orgId,
      serviceId: svc.id,
      alertName: alertDef.name,
      severity: alertDef.severity,
      metricValue: alertDef.threshold + (i % 20),
      threshold: alertDef.threshold,
      triggeredAt: alertTime,
    });
  }

  // Generate 20 Incidents
  const incidents: SeedData["incidents"] = [];
  const incidentStatuses = ["investigating", "acknowledged", "open", "mitigated", "resolved"];

  for (let i = 1; i <= 20; i++) {
    const svc = services[i % services.length];
    const status = incidentStatuses[i % incidentStatuses.length];
    const openTime = new Date(baseTime + i * 3600 * 1000).toISOString();
    incidents.push({
      id: `INC-${1000 + i}`,
      organizationId: orgId,
      serviceId: svc.id,
      title: `${svc.name}: Latency degradation and error rate elevation`,
      status,
      severity: i % 4 === 0 ? "critical" : i % 3 === 0 ? "high" : "medium",
      correlationKey: `corr-${svc.name}-${i}`,
      version: 1,
      openedAt: openTime,
      acknowledgedAt:
        status !== "open"
          ? new Date(new Date(openTime).getTime() + 120000).toISOString()
          : undefined,
      resolvedAt:
        status === "resolved"
          ? new Date(new Date(openTime).getTime() + 1800000).toISOString()
          : undefined,
    });
  }

  // Generate 20 Investigation records corresponding to incidents
  const investigations: SeedData["investigations"] = incidents.map((inc, idx) => ({
    id: `INV-${3000 + idx}`,
    incidentId: inc.id,
    organizationId: orgId,
    status: "completed",
    modelId: "offline-deterministic-v1",
    toolCallCount: 3,
    hypotheses: [
      {
        rank: 1,
        causeCategory: "release_regression",
        rationale: `Regression introduced by recent deployment ${deployments[idx % deployments.length].version}.`,
        evidenceIds: [deployments[idx % deployments.length].id, alerts[idx % alerts.length].id],
      },
      {
        rank: 2,
        causeCategory: "downstream_dependency_saturation",
        rationale: "Downstream database connection pool exhausted under concurrent traffic.",
        evidenceIds: [alerts[(idx + 1) % alerts.length].id],
      },
    ],
  }));

  return {
    organizations,
    users,
    services,
    deployments,
    alerts,
    incidents,
    investigations,
  };
}
