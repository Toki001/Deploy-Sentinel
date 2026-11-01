export const TOPICS = {
  RAW: "events.raw.v1",
  NORMALIZED: "events.normalized.v1",
  INCIDENTS: "incidents.v1",
  INVESTIGATIONS_REQUESTED: "investigations.requested.v1",
  RETRY_1: "events.retry.1.v1",
  RETRY_2: "events.retry.2.v1",
  DEAD_LETTER: "events.dead-letter.v1",
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
