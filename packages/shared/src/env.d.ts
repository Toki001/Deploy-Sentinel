import { z } from "zod";
export declare const EnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    HOST: z.ZodDefault<z.ZodString>;
    DATABASE_URL: z.ZodDefault<z.ZodString>;
    REDPANDA_BROKERS: z.ZodDefault<z.ZodString>;
    OTEL_EXPORTER_OTLP_ENDPOINT: z.ZodDefault<z.ZodString>;
    WEBHOOK_DEFAULT_SECRET: z.ZodDefault<z.ZodString>;
    AI_PROVIDER: z.ZodDefault<z.ZodEnum<["offline", "gemini"]>>;
    GEMINI_API_KEY: z.ZodOptional<z.ZodString>;
    DEV_AUTH_BYPASS: z.ZodDefault<z.ZodBoolean>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
}, "strip", z.ZodTypeAny, {
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    HOST: string;
    DATABASE_URL: string;
    REDPANDA_BROKERS: string;
    OTEL_EXPORTER_OTLP_ENDPOINT: string;
    WEBHOOK_DEFAULT_SECRET: string;
    AI_PROVIDER: "offline" | "gemini";
    DEV_AUTH_BYPASS: boolean;
    GEMINI_API_KEY?: string | undefined;
}, {
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    HOST?: string | undefined;
    DATABASE_URL?: string | undefined;
    REDPANDA_BROKERS?: string | undefined;
    OTEL_EXPORTER_OTLP_ENDPOINT?: string | undefined;
    WEBHOOK_DEFAULT_SECRET?: string | undefined;
    AI_PROVIDER?: "offline" | "gemini" | undefined;
    GEMINI_API_KEY?: string | undefined;
    DEV_AUTH_BYPASS?: boolean | undefined;
}>;
export type Env = z.infer<typeof EnvSchema>;
export declare function validateEnv(rawEnv?: NodeJS.ProcessEnv): Env;
//# sourceMappingURL=env.d.ts.map