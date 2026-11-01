/**
 * Compute an HMAC SHA-256 signature for raw webhook payload and timestamp.
 */
export declare function computeHmacSignature(secret: string, timestamp: string | number, payload: string | Buffer): string;
/**
 * Verify HMAC signature with timing-safe comparison and timestamp age window.
 */
export declare function verifyHmacSignature(secret: string, signatureHeader: string, timestampHeader: string, payload: string | Buffer, maxAgeSeconds?: number): {
    valid: boolean;
    reason?: string;
};
export declare function generateSecret(length?: number): string;
//# sourceMappingURL=crypto.d.ts.map