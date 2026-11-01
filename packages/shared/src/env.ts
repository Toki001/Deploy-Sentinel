import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/deploysentinel"),
  REDPANDA_BROKERS: z.string().default("localhost:9092"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default("http://localhost:4318"),
  WEBHOOK_DEFAULT_SECRET: z.string().default("dev_webhook_signing_secret_32bytes!"),
  AI_PROVIDER: z.enum(["offline", "gemini"]).default("offline"),
  GEMINI_API_KEY: z.string().optional(),
  DEV_AUTH_BYPASS: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(rawEnv);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(`Environment validation failed: ${JSON.stringify(formatted, null, 2)}`);
  }
  return result.data;
}
