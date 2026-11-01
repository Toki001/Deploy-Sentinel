"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
exports.EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    HOST: zod_1.z.string().default("0.0.0.0"),
    DATABASE_URL: zod_1.z.string().default("postgres://postgres:postgres@localhost:5432/deploysentinel"),
    REDPANDA_BROKERS: zod_1.z.string().default("localhost:9092"),
    OTEL_EXPORTER_OTLP_ENDPOINT: zod_1.z.string().default("http://localhost:4318"),
    WEBHOOK_DEFAULT_SECRET: zod_1.z.string().default("dev_webhook_signing_secret_32bytes!"),
    AI_PROVIDER: zod_1.z.enum(["offline", "gemini"]).default("offline"),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    DEV_AUTH_BYPASS: zod_1.z.coerce.boolean().default(true),
    LOG_LEVEL: zod_1.z.enum(["debug", "info", "warn", "error"]).default("info"),
});
function validateEnv(rawEnv = process.env) {
    const result = exports.EnvSchema.safeParse(rawEnv);
    if (!result.success) {
        const formatted = result.error.format();
        throw new Error(`Environment validation failed: ${JSON.stringify(formatted, null, 2)}`);
    }
    return result.data;
}
//# sourceMappingURL=env.js.map