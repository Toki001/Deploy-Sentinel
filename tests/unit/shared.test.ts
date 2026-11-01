import {
  computeHmacSignature,
  verifyHmacSignature,
  EnvSchema,
  validateEnv,
  AppError,
  ValidationError,
  RateLimitError,
} from "@deploysentinel/shared";

describe("Shared Package: Cryptography & Security", () => {
  const secret = "test_signing_secret_32bytes_value!";
  const payload = JSON.stringify({ serviceId: "checkout-service", version: "v2.4.1" });
  const timestamp = Math.floor(Date.now() / 1000).toString();

  it("should compute and verify valid HMAC SHA-256 signature", () => {
    const signature = computeHmacSignature(secret, timestamp, payload);
    expect(signature.startsWith("v1=")).toBe(true);

    const result = verifyHmacSignature(secret, signature, timestamp, payload);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should reject tampered payload", () => {
    const signature = computeHmacSignature(secret, timestamp, payload);
    const tamperedPayload = JSON.stringify({ serviceId: "checkout-service", version: "v2.4.2" });

    const result = verifyHmacSignature(secret, signature, timestamp, tamperedPayload);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Signature mismatch");
  });

  it("should reject expired timestamp (anti-replay window)", () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const signature = computeHmacSignature(secret, oldTimestamp, payload);

    const result = verifyHmacSignature(secret, signature, oldTimestamp, payload, 300);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Timestamp outside allowed replay window");
  });
});

describe("Shared Package: Environment Validation", () => {
  it("should validate default configuration with valid defaults", () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(4000);
    expect(env.AI_PROVIDER).toBe("offline");
  });
});

describe("Shared Package: Error Hierarchy", () => {
  it("should construct structured application errors with proper status codes", () => {
    const err = new RateLimitError("Too many events", 30, { tenantId: "org-demo" });
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryAfterSeconds).toBe(30);
    expect(err.details?.tenantId).toBe("org-demo");
  });
});
