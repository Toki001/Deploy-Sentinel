export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  organizationId?: string;
  serviceId?: string;
  [key: string]: unknown;
}

export class Logger {
  private level: LogLevel;
  private defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}, level: LogLevel = "info") {
    this.defaultContext = defaultContext;
    this.level = (process.env.LOG_LEVEL as LogLevel) || level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 10,
      info: 20,
      warn: 30,
      error: 40,
    };
    return levels[level] >= levels[this.level];
  }

  private write(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.defaultContext,
      ...context,
      ...(error
        ? {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          }
        : {}),
    };

    const line = JSON.stringify(payload);
    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    this.write("error", message, context, error);
  }

  public child(context: LogContext): Logger {
    return new Logger({ ...this.defaultContext, ...context }, this.level);
  }
}

export const logger = new Logger();
