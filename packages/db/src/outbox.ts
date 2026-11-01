import { randomUUID } from "node:crypto";

export interface OutboxMessage {
  id: string;
  organizationId: string;
  topic: string;
  eventKey: string;
  payload: Record<string, unknown>;
  status: "pending" | "published" | "failed";
  retryCount: number;
  leaseExpiresAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
}

export class OutboxManager {
  private messages: Map<string, OutboxMessage> = new Map();

  public createEntry(params: {
    organizationId: string;
    topic: string;
    eventKey: string;
    payload: Record<string, unknown>;
  }): OutboxMessage {
    const entry: OutboxMessage = {
      id: `outbox-${randomUUID()}`,
      organizationId: params.organizationId,
      topic: params.topic,
      eventKey: params.eventKey,
      payload: params.payload,
      status: "pending",
      retryCount: 0,
      leaseExpiresAt: null,
      publishedAt: null,
      createdAt: new Date(),
    };
    this.messages.set(entry.id, entry);
    return entry;
  }

  public leasePending(limit = 10, leaseDurationMs = 30000): OutboxMessage[] {
    const now = new Date();
    const leased: OutboxMessage[] = [];

    for (const msg of this.messages.values()) {
      if (leased.length >= limit) break;

      const isUnleased = !msg.leaseExpiresAt || msg.leaseExpiresAt < now;
      if (msg.status === "pending" && isUnleased) {
        msg.leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
        leased.push({ ...msg });
      }
    }

    return leased;
  }

  public markPublished(id: string): boolean {
    const msg = this.messages.get(id);
    if (!msg) return false;

    msg.status = "published";
    msg.publishedAt = new Date();
    msg.leaseExpiresAt = null;
    return true;
  }

  public markFailed(id: string, maxRetries = 3): boolean {
    const msg = this.messages.get(id);
    if (!msg) return false;

    msg.retryCount += 1;
    msg.leaseExpiresAt = null;
    if (msg.retryCount >= maxRetries) {
      msg.status = "failed";
    }
    return true;
  }

  public get(id: string): OutboxMessage | undefined {
    return this.messages.get(id);
  }

  public size(): number {
    return this.messages.size;
  }
}
