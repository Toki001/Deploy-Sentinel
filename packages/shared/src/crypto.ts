import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Compute an HMAC SHA-256 signature for raw webhook payload and timestamp.
 */
export function computeHmacSignature(
  secret: string,
  timestamp: string | number,
  payload: string | Buffer,
): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(`${timestamp}.${payload.toString()}`);
  return `v1=${hmac.digest("hex")}`;
}

/**
 * Verify HMAC signature with timing-safe comparison and timestamp age window.
 */
export function verifyHmacSignature(
  secret: string,
  signatureHeader: string,
  timestampHeader: string,
  payload: string | Buffer,
  maxAgeSeconds = 300,
): { valid: boolean; reason?: string } {
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestampHeader, 10);

  if (isNaN(ts)) {
    return { valid: false, reason: "Invalid timestamp header" };
  }

  if (Math.abs(now - ts) > maxAgeSeconds) {
    return { valid: false, reason: "Timestamp outside allowed replay window" };
  }

  const expectedSignature = computeHmacSignature(secret, timestampHeader, payload);

  const sigBuffer = Buffer.from(signatureHeader, "utf-8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");

  if (sigBuffer.length !== expectedBuffer.length) {
    return { valid: false, reason: "Signature mismatch" };
  }

  if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: "Signature mismatch" };
  }

  return { valid: true };
}

export function generateSecret(length = 32): string {
  return randomBytes(length).toString("hex");
}
