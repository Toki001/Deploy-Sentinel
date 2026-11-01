"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeHmacSignature = computeHmacSignature;
exports.verifyHmacSignature = verifyHmacSignature;
exports.generateSecret = generateSecret;
const node_crypto_1 = require("node:crypto");
/**
 * Compute an HMAC SHA-256 signature for raw webhook payload and timestamp.
 */
function computeHmacSignature(secret, timestamp, payload) {
    const hmac = (0, node_crypto_1.createHmac)("sha256", secret);
    hmac.update(`${timestamp}.${payload.toString()}`);
    return `v1=${hmac.digest("hex")}`;
}
/**
 * Verify HMAC signature with timing-safe comparison and timestamp age window.
 */
function verifyHmacSignature(secret, signatureHeader, timestampHeader, payload, maxAgeSeconds = 300) {
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
    if (!(0, node_crypto_1.timingSafeEqual)(sigBuffer, expectedBuffer)) {
        return { valid: false, reason: "Signature mismatch" };
    }
    return { valid: true };
}
function generateSecret(length = 32) {
    return (0, node_crypto_1.randomBytes)(length).toString("hex");
}
//# sourceMappingURL=crypto.js.map