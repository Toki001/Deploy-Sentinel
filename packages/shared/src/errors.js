"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 422, "VALIDATION_ERROR", details);
    }
}
exports.ValidationError = ValidationError;
class BadRequestError extends AppError {
    constructor(message, details) {
        super(message, 400, "BAD_REQUEST", details);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized", details) {
        super(message, 401, "UNAUTHORIZED", details);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = "Forbidden", details) {
        super(message, 403, "FORBIDDEN", details);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = "Resource not found", details) {
        super(message, 404, "NOT_FOUND", details);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message, details) {
        super(message, 409, "CONFLICT", details);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    retryAfterSeconds;
    constructor(message = "Too Many Requests", retryAfterSeconds = 60, details) {
        super(message, 429, "RATE_LIMITED", details);
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
exports.RateLimitError = RateLimitError;
//# sourceMappingURL=errors.js.map