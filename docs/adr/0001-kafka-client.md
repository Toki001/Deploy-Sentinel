# ADR 0001: Event Streaming Client Selection

## Context

DeploySentinel requires a robust Kafka-compatible client in TypeScript/Node.js to produce and consume events from a local Redpanda cluster and production Kafka backbones. The client must support:

- Explicit consumer offset commits (commit after database transaction durability)
- Manual partition pause/resume for backpressure and in-flight throttling
- Low memory overhead and active open-source maintenance
- Transactional outbox publisher integration

## Decision

We select `kafkajs` (or standard KafkaJS-compatible client) as the primary Kafka client for TypeScript services.

- Mature TypeScript typings and battle-tested Redpanda compatibility.
- Direct support for manual offset control (`commitOffsets`), consumer pause/resume, and heartbeat lifecycle management.
- Pure JavaScript runtime without native C++ compilation dependencies (avoiding platform-specific build failures on macOS ARM64 / Linux x86_64).

## Consequences

- At-least-once delivery semantics require strict database inbox deduplication (`event_inbox` table with unique constraint on `event_id`).
- Backpressure and exponential jitter retry policies are implemented at the application consumer worker layer with delayed/dead-letter topics.
