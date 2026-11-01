import { runLoadBenchmark } from "../../scripts/run-load-test.js";

describe("Milestone 08: Ingress Load Benchmark (100 EPS Target)", () => {
  // Test a 2-second burst of 100 req/sec (200 requests) to verify sustained throughput and p95 latency
  it("should sustain 100 accepted events/sec with p95 HTTP admission <= 200ms", async () => {
    const result = await runLoadBenchmark(100, 2);

    expect(result.totalRequests).toBeGreaterThanOrEqual(180);
    expect(result.acceptedCount).toBe(result.totalRequests);
    expect(result.rateLimit429Count).toBe(0);
    expect(result.error5xxCount).toBe(0);

    // Verify p95 latency target <= 200ms
    expect(result.p95).toBeLessThanOrEqual(200);
    expect(result.meetsP95Target).toBe(true);
  }, 10000);
});
