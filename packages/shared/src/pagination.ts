export interface CursorPayload {
  timestamp: string;
  id: string;
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf-8").toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.timestamp === "string" && typeof parsed.id === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clampLimit(limit?: number | string, defaultLimit = 20, maxLimit = 100): number {
  if (limit === undefined || limit === null) return defaultLimit;
  const num = typeof limit === "number" ? limit : parseInt(limit, 10);
  if (isNaN(num) || num <= 0) return defaultLimit;
  return Math.min(num, maxLimit);
}
