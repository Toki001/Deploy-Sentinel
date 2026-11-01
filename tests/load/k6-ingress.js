import http from "k6/http";
import { check, sleep } from "k6";
import crypto from "k6/crypto";

// ==============================================================================
// DeploySentinel — k6 Ingress Benchmark Load Test
// Target: Sustained 100 accepted events/sec with p95 HTTP acceptance <= 200ms
// ==============================================================================

export const options = {
  scenarios: {
    constant_rate_ingress: {
      executor: "constant-arrival-rate",
      rate: 100, // 100 events per second
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    // p95 latency must be <= 200ms
    http_req_duration: ["p(95)<200", "p(99)<400"],
    // Error rate must be under 1%
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:4000";
const ORG_ID = "org-enterprise-001";
const WEBHOOK_SECRET = "test-webhook-secret-32-chars-long";

export default function () {
  const eventId = `k6-evt-${__VU}-${__ITER}-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = JSON.stringify({
    eventId,
    eventType: "DeploymentCreated",
    schemaVersion: "1.0.0",
    organizationId: ORG_ID,
    serviceId: "svc-auth",
    environment: "production",
    occurredAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    correlationId: `corr-${eventId}`,
    payload: {
      deploymentId: `dep-${eventId}`,
      serviceId: "svc-auth",
      version: "v2.1.0",
      commitSha: "abc1234567890",
      deployedBy: "ci-bot",
      environment: "production",
      status: "succeeded",
    },
  });

  // Generate HMAC SHA-256 signature
  const signature = crypto.hmac("sha256", WEBHOOK_SECRET, `${timestamp}.${payload}`, "hex");

  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-Signature": `t=${timestamp},v1=${signature}`,
      "X-Organization-Id": ORG_ID,
      "Idempotency-Key": `idemp-${eventId}`,
    },
  };

  const res = http.post(`${BASE_URL}/v1/webhooks/deployments`, payload, params);

  check(res, {
    "status is 202 Accepted": (r) => r.status === 202,
    "has job id or received": (r) => r.json("received") === true,
  });
}
