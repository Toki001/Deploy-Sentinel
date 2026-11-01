export const CONTRACT_VERSIONS = {
  openapi: "1.0.0",
  graphql: "1.0.0",
  events: "1.0.0",
} as const;

export interface WebhookHeaders {
  "x-signature": string;
  "x-timestamp": string;
}
