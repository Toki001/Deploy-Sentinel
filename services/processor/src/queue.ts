import type { TopicName } from "./topics.js";

export interface QueueMessage {
  topic: TopicName;
  partition: number;
  offset: number;
  key: string;
  value: string;
  timestamp: string;
  attempt: number;
}

export class InMemoryKafkaBus {
  private topics: Map<TopicName, QueueMessage[]> = new Map();
  private committedOffsets: Map<string, number> = new Map();
  private isPaused = false;

  constructor() {
    this.topics.set("events.raw.v1", []);
    this.topics.set("events.normalized.v1", []);
    this.topics.set("incidents.v1", []);
    this.topics.set("investigations.requested.v1", []);
    this.topics.set("events.retry.1.v1", []);
    this.topics.set("events.retry.2.v1", []);
    this.topics.set("events.dead-letter.v1", []);
  }

  public publish(topic: TopicName, key: string, payload: unknown, attempt = 1): QueueMessage {
    const queue = this.topics.get(topic) || [];
    const offset = queue.length;
    const msg: QueueMessage = {
      topic,
      partition: 0,
      offset,
      key,
      value: typeof payload === "string" ? payload : JSON.stringify(payload),
      timestamp: new Date().toISOString(),
      attempt,
    };
    queue.push(msg);
    this.topics.set(topic, queue);
    return msg;
  }

  public consume(topic: TopicName, count = 10): QueueMessage[] {
    if (this.isPaused) {
      return [];
    }

    const queue = this.topics.get(topic) || [];
    const committed = this.committedOffsets.get(`${topic}:0`) ?? 0;
    const available = queue.slice(committed, committed + count);
    return available;
  }

  public commitOffset(topic: TopicName, partition: number, offset: number): void {
    this.committedOffsets.set(`${topic}:${partition}`, offset + 1);
  }

  public getLag(topic: TopicName, partition = 0): number {
    const queue = this.topics.get(topic) || [];
    const committed = this.committedOffsets.get(`${topic}:${partition}`) ?? 0;
    return Math.max(0, queue.length - committed);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public isConsumerPaused(): boolean {
    return this.isPaused;
  }

  public getMessages(topic: TopicName): QueueMessage[] {
    return [...(this.topics.get(topic) || [])];
  }

  public clear(): void {
    for (const key of this.topics.keys()) {
      this.topics.set(key, []);
    }
    this.committedOffsets.clear();
    this.isPaused = false;
  }
}
