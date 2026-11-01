import { TOPICS, type TopicName } from "./topics.js";

export type ErrorClassification = "TRANSIENT" | "PERMANENT";

export interface RetryDecision {
  destinationTopic: TopicName;
  shouldRetry: boolean;
  nextAttempt: number;
  delayMs: number;
  reason: string;
}

export const MAX_RETRY_ATTEMPTS = 4;

export function classifyError(error: unknown): ErrorClassification {
  if (error instanceof SyntaxError || (error as { name?: string }).name === "ZodError") {
    return "PERMANENT"; // Schema or JSON parsing defects should not be retried
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes("schema") ||
    message.includes("invalid payload") ||
    message.includes("malformed") ||
    message.includes("unsupported event version") ||
    message.includes("poison")
  ) {
    return "PERMANENT";
  }

  // Network timeouts, lock contention, transient outages are retryable
  return "TRANSIENT";
}

export function determineNextRoute(currentAttempt: number, error: unknown): RetryDecision {
  const classification = classifyError(error);

  if (classification === "PERMANENT") {
    return {
      destinationTopic: TOPICS.DEAD_LETTER,
      shouldRetry: false,
      nextAttempt: currentAttempt,
      delayMs: 0,
      reason: `Permanent error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (currentAttempt >= MAX_RETRY_ATTEMPTS) {
    return {
      destinationTopic: TOPICS.DEAD_LETTER,
      shouldRetry: false,
      nextAttempt: currentAttempt,
      delayMs: 0,
      reason: `Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`,
    };
  }

  // Transient retry topic progression with exponential delay
  if (currentAttempt === 1) {
    return {
      destinationTopic: TOPICS.RETRY_1,
      shouldRetry: true,
      nextAttempt: 2,
      delayMs: 1000,
      reason: "Transient failure - routing to retry queue 1",
    };
  }

  return {
    destinationTopic: TOPICS.RETRY_2,
    shouldRetry: true,
    nextAttempt: currentAttempt + 1,
    delayMs: 2000,
    reason: "Transient failure - routing to retry queue 2",
  };
}
