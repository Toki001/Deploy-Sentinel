import { logger } from "@deploysentinel/shared";

export interface SpanContext {
  traceId: string;
  spanId: string;
  name: string;
  startTime: number;
  attributes: Record<string, unknown>;
}

export class SimpleTracer {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  public startSpan(name: string, attributes: Record<string, unknown> = {}): SpanContext {
    const traceId = Math.random().toString(16).substring(2, 18).padStart(16, "0");
    const spanId = Math.random().toString(16).substring(2, 18).padStart(16, "0");
    return {
      traceId,
      spanId,
      name,
      startTime: Date.now(),
      attributes: {
        service: this.serviceName,
        ...attributes,
      },
    };
  }

  public endSpan(span: SpanContext, extraAttributes: Record<string, unknown> = {}): void {
    const durationMs = Date.now() - span.startTime;
    logger.debug(`[trace] ${span.name} duration=${durationMs}ms`, {
      traceId: span.traceId,
      spanId: span.spanId,
      durationMs,
      ...span.attributes,
      ...extraAttributes,
    });
  }

  public async withSpan<T>(
    name: string,
    attributes: Record<string, unknown>,
    fn: (span: SpanContext) => Promise<T>,
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn(span);
      this.endSpan(span, { status: "ok" });
      return result;
    } catch (err: unknown) {
      this.endSpan(span, { status: "error", error: (err as Error)?.message });
      throw err;
    }
  }
}

export interface MetricSample {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export class MetricsRegistry {
  private samples: MetricSample[] = [];

  public recordCount(name: string, value = 1, labels: Record<string, string> = {}): void {
    this.samples.push({
      name,
      value,
      labels,
      timestamp: Date.now(),
    });
    // keep recent samples bounded
    if (this.samples.length > 5000) {
      this.samples = this.samples.slice(-2500);
    }
  }

  public recordLatency(name: string, ms: number, labels: Record<string, string> = {}): void {
    this.recordCount(`${name}_duration_ms`, ms, labels);
  }

  public getSamples(): MetricSample[] {
    return [...this.samples];
  }

  public clear(): void {
    this.samples = [];
  }
}

export const defaultTracer = new SimpleTracer("deploysentinel");
export const defaultMetrics = new MetricsRegistry();
