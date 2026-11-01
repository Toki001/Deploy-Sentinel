export interface InboxRecord {
  organizationId: string;
  eventId: string;
  eventType: string;
  correlationId?: string;
  processedAt: Date;
}

export class InboxDeduplicator {
  private records: Map<string, InboxRecord> = new Map();

  private makeKey(orgId: string, eventId: string): string {
    return `${orgId}:${eventId}`;
  }

  public isProcessed(organizationId: string, eventId: string): boolean {
    return this.records.has(this.makeKey(organizationId, eventId));
  }

  public recordProcessed(record: {
    organizationId: string;
    eventId: string;
    eventType: string;
    correlationId?: string;
  }): boolean {
    const key = this.makeKey(record.organizationId, record.eventId);
    if (this.records.has(key)) {
      return false; // Already processed
    }

    this.records.set(key, {
      ...record,
      processedAt: new Date(),
    });
    return true; // Successfully recorded
  }

  public count(): number {
    return this.records.size;
  }
}
