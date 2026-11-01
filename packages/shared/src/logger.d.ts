export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogContext {
    correlationId?: string;
    requestId?: string;
    organizationId?: string;
    serviceId?: string;
    [key: string]: unknown;
}
export declare class Logger {
    private level;
    private defaultContext;
    constructor(defaultContext?: LogContext, level?: LogLevel);
    private shouldLog;
    private write;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, error?: Error, context?: LogContext): void;
    child(context: LogContext): Logger;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map