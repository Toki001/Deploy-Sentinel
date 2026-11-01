"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
class Logger {
    level;
    defaultContext;
    constructor(defaultContext = {}, level = "info") {
        this.defaultContext = defaultContext;
        this.level = process.env.LOG_LEVEL || level;
    }
    shouldLog(level) {
        const levels = {
            debug: 10,
            info: 20,
            warn: 30,
            error: 40,
        };
        return levels[level] >= levels[this.level];
    }
    write(level, message, context, error) {
        if (!this.shouldLog(level))
            return;
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
        }
        else {
            process.stdout.write(line + "\n");
        }
    }
    debug(message, context) {
        this.write("debug", message, context);
    }
    info(message, context) {
        this.write("info", message, context);
    }
    warn(message, context) {
        this.write("warn", message, context);
    }
    error(message, error, context) {
        this.write("error", message, context, error);
    }
    child(context) {
        return new Logger({ ...this.defaultContext, ...context }, this.level);
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map