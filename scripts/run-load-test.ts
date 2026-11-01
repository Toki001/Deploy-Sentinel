import { buildApp } from "../services/api/src/app";
import { computeHmacSignature } from "../packages/shared/src/crypto";

// ==============================================================================
// DeploySentinel — 100 EPS Ingress Benchmark Runner
// ==============================================================================

export interface BenchmarkResult {
  totalRequests: number;
  acceptedCount: number;
  rateLimit429Count: number;
  error5xxCount: number;
  durationMs: number;
  actualThroughputEps: number;
  latencies: number[];
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  meetsP95Target: boolean;
}

export async function runLoadBenchmark(
  targetEps = 100,
  durationSeconds = 5,
): Promise<BenchmarkResult> {
  const app = await buildApp();
  await app.ready();

  const orgId = "org-enterprise-001";
  const webhookSecret = process.env.WEBHOOK_DEFAULT_SECRET || "dev_webhook_signing_secret_32bytes!";
  const totalTarget = targetEps * durationSeconds;

  const latencies: number[] = [];
  let accepted = 0;
  let count429 = 0;
  let count5xx = 0;

  console.log(
    `[Benchmark] Running sustained load test: ${targetEps} req/s for ${durationSeconds}s (target ${totalTarget} events)...`,
  );

  const startTime = Date.now();
  const batchIntervalMs = 100; // 10 batches per second
  const batchSize = Math.ceil(targetEps / 10); // e.g. 10 requests per 100ms = 100 req/s

  for (let s = 0; s < durationSeconds * 10; s++) {
    const batchStart = Date.now();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < batchSize; i++) {
      const idx = s * batchSize + i;
      const eventId = `bench-evt-${idx}-${Date.now()}`;
      const payloadObj = {
        eventId,
        eventType: "DeploymentCreated",
        schemaVersion: "1.0.0",
        organizationId: orgId,
        serviceId: "svc-auth",
        environment: "production",
        occurredAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        correlationId: `corr-${eventId}`,
        version: "v2.1.0",
        payload: {
          deploymentId: `dep-${eventId}`,
          serviceId: "svc-auth",
          version: "v2.1.0",
          commitSha: "abc1234567890",
          deployedBy: "ci-bot",
          environment: "production",
          status: "succeeded",
        },
      };

      const rawPayload = JSON.stringify(payloadObj);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signatureHeader = computeHmacSignature(webhookSecret, timestamp, rawPayload);

      promises.push(
        (async () => {
          const reqStart = process.hrtime.bigint();
          const res = await app.inject({
            method: "POST",
            url: "/v1/webhooks/deployments",
            headers: {
              "content-type": "application/json",
              "x-signature": signatureHeader,
              "x-timestamp": timestamp,
              "x-organization-id": orgId,
              "idempotency-key": `idemp-${eventId}`,
            },
            payload: rawPayload,
          });
          const reqEnd = process.hrtime.bigint();
          const latencyMs = Number(reqEnd - reqStart) / 1_000_000;
          latencies.push(latencyMs);

          if (res.statusCode === 202) {
            accepted += 1;
          } else if (res.statusCode === 429) {
            count429 += 1;
          } else if (res.statusCode >= 500) {
            count5xx += 1;
          }
        })(),
      );
    }

    await Promise.all(promises);

    const elapsed = Date.now() - batchStart;
    const waitTime = Math.max(0, batchIntervalMs - elapsed);
    if (waitTime > 0 && s < durationSeconds * 10 - 1) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  const totalTimeMs = Date.now() - startTime;
  await app.close();

  latencies.sort((a, b) => a - b);
  const q = (pct: number) =>
    latencies[Math.min(Math.floor(latencies.length * pct), latencies.length - 1)];

  const p50 = q(0.5);
  const p90 = q(0.9);
  const p95 = q(0.95);
  const p99 = q(0.99);
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const actualThroughputEps = latencies.length / (totalTimeMs / 1000);

  return {
    totalRequests: latencies.length,
    acceptedCount: accepted,
    rateLimit429Count: count429,
    error5xxCount: count5xx,
    durationMs: totalTimeMs,
    actualThroughputEps,
    latencies,
    p50,
    p90,
    p95,
    p99,
    min,
    max,
    meetsP95Target: p95 <= 200,
  };
}

if (process.argv[1] && process.argv[1].endsWith("run-load-test.ts")) {
  runLoadBenchmark(100, 5).then((res) => {
    console.log("\n=======================================================");
    console.log("DeploySentinel 100 EPS Ingress Benchmark Results");
    console.log("=======================================================");
    console.log(`Total Requests:      ${res.totalRequests}`);
    console.log(
      `Accepted (202):      ${res.acceptedCount} (${((res.acceptedCount / res.totalRequests) * 100).toFixed(1)}%)`,
    );
    console.log(`Rate-limited (429):  ${res.rateLimit429Count}`);
    console.log(`Server Errors (5xx): ${res.error5xxCount}`);
    console.log(`Duration:            ${(res.durationMs / 1000).toFixed(2)}s`);
    console.log(`Measured Throughput: ${res.actualThroughputEps.toFixed(1)} req/sec (Target: 100)`);
    console.log(`Latency p50:         ${res.p50.toFixed(2)} ms`);
    console.log(`Latency p90:         ${res.p90.toFixed(2)} ms`);
    console.log(`Latency p95:         ${res.p95.toFixed(2)} ms (Target: <= 200 ms)`);
    console.log(`Latency p99:         ${res.p99.toFixed(2)} ms`);
    console.log(`Latency Max:         ${res.max.toFixed(2)} ms`);
    console.log(`Target Status:       ${res.meetsP95Target ? "PASS" : "FAIL"}`);
    console.log("=======================================================\n");
  });
}
