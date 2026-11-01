import { logger } from "@deploysentinel/shared";

// ==============================================================================
// OpenTelemetry & Prometheus Telemetry Engine
// Strictly secret-safe, low-cardinality labels, W3C trace context propagation
// ==============================================================================

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  attributes: Record<string, unknown>;
}

// Secret keys that must never be emitted into traces or metric labels
const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "token",
  "secret",
  "password",
  "key",
  "x-signature",
  "apikey",
]);

/**
 * Sanitizes attributes to ensure no credential or unbounded high-cardinality values leak.
 */
export function sanitizeAttributes(attrs: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    const lowerKey = k.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.length > 256) {
      sanitized[k] = `${v.substring(0, 253)}...`;
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Normalizes HTTP route paths to low-cardinality templates
 * e.g. /v1/incidents/INC-12345 -> /v1/incidents/:id
 */
export function normalizeRoute(path: string): string {
  return path
    .replace(/\/incidents\/[a-zA-Z0-9_-]+/g, "/incidents/:id")
    .replace(/\/events\/[a-zA-Z0-9_-]+/g, "/events/:id")
    .replace(/\/services\/[a-zA-Z0-9_-]+/g, "/services/:id")
    .replace(/\/investigations\/[a-zA-Z0-9_-]+/g, "/investigations/:id")
    .replace(/\/jobs\/[a-zA-Z0-9_-]+/g, "/jobs/:id")
    .split("?")[0];
}

export class SimpleTracer {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Parses W3C traceparent header: 00-<trace_id>-<span_id>-<trace_flags>
   */
  public extractTraceParent(header?: string): { traceId: string; parentSpanId: string } | null {
    if (!header) return null;
    const parts = header.trim().split("-");
    if (parts.length >= 3 && parts[0] === "00" && parts[1].length === 32) {
      return { traceId: parts[1], parentSpanId: parts[2] };
    }
    return null;
  }

  public createTraceParent(span: SpanContext): string {
    return `00-${span.traceId.padStart(32, "0")}-${span.spanId.padStart(16, "0")}-01`;
  }

  public startSpan(
    name: string,
    attributes: Record<string, unknown> = {},
    parentHeader?: string,
  ): SpanContext {
    const parent = this.extractTraceParent(parentHeader);
    const traceId =
      parent?.traceId || Math.random().toString(16).substring(2, 18).padStart(32, "0");
    const spanId = Math.random().toString(16).substring(2, 18).padStart(16, "0");

    return {
      traceId,
      spanId,
      parentSpanId: parent?.parentSpanId,
      name,
      startTime: Date.now(),
      attributes: {
        service: this.serviceName,
        ...sanitizeAttributes(attributes),
      },
    };
  }

  public endSpan(span: SpanContext, extraAttributes: Record<string, unknown> = {}): number {
    const durationMs = Date.now() - span.startTime;
    logger.debug(`[trace] ${span.name} duration=${durationMs}ms`, {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      durationMs,
      ...span.attributes,
      ...sanitizeAttributes(extraAttributes),
    });
    return durationMs;
  }

  public async withSpan<T>(
    name: string,
    attributes: Record<string, unknown>,
    fn: (span: SpanContext) => Promise<T>,
    parentHeader?: string,
  ): Promise<T> {
    const span = this.startSpan(name, attributes, parentHeader);
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
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  private makeKey(name: string, labels: Record<string, string>): string {
    const sorted = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    return `${name}{${sorted}}`;
  }

  public increment(name: string, value = 1, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels);
    const curr = this.counters.get(key) || 0;
    this.counters.set(key, curr + value);
  }

  public setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, value);
  }

  public observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels);
    const existing = this.histograms.get(key) || [];
    existing.push(value);
    // Keep max 2000 points per histogram bucket series
    if (existing.length > 2000) {
      this.histograms.set(key, existing.slice(-1000));
    } else {
      this.histograms.set(key, existing);
    }
  }

  /**
   * Computes p50, p90, p95, p99 percentiles for a histogram series
   */
  public getQuantiles(
    name: string,
    labels: Record<string, string> = {},
  ): {
    count: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
  } {
    const key = this.makeKey(name, labels);
    const values = (this.histograms.get(key) || []).slice().sort((a, b) => a - b);
    if (values.length === 0) {
      return { count: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
    }
    const quantile = (q: number) =>
      values[Math.min(Math.floor(values.length * q), values.length - 1)];

    return {
      count: values.length,
      p50: quantile(0.5),
      p90: quantile(0.9),
      p95: quantile(0.95),
      p99: quantile(0.99),
      max: values[values.length - 1],
    };
  }

  /**
   * Formats all metrics into standard Prometheus text exposition format
   */
  public toPrometheusText(): string {
    const lines: string[] = [];

    // Counters
    for (const [key, val] of this.counters.entries()) {
      lines.push(`${key} ${val}`);
    }

    // Gauges
    for (const [key, val] of this.gauges.entries()) {
      lines.push(`${key} ${val}`);
    }

    // Histograms
    for (const [key, values] of this.histograms.entries()) {
      const metricBase = key.substring(0, key.indexOf("{"));
      const labelStr = key.substring(key.indexOf("{") + 1, key.length - 1);
      const prefix = labelStr ? `${labelStr},` : "";

      const count = values.length;
      const sum = values.reduce((acc, v) => acc + v, 0);

      lines.push(`${metricBase}_count{${labelStr}} ${count}`);
      lines.push(`${metricBase}_sum{${labelStr}} ${sum.toFixed(3)}`);

      // Default buckets in milliseconds: [5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000]
      const buckets = [5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000];
      for (const le of buckets) {
        const countLe = values.filter((v) => v <= le).length;
        lines.push(`${metricBase}_bucket{${prefix}le="${le}"} ${countLe}`);
      }
      lines.push(`${metricBase}_bucket{${prefix}le="+Inf"} ${count}`);
    }

    return lines.join("\n") + "\n";
  }

  public clear(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

export const defaultTracer = new SimpleTracer("deploysentinel");
export const defaultMetrics = new MetricsRegistry();
