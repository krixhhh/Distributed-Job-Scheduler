"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.HttpError = void 0;
class HttpError extends Error {
    statusCode;
    errors;
    constructor(statusCode, message, errors) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.HttpError = HttpError;
class BadRequestError extends HttpError {
    constructor(message = "Bad Request", errors) {
        super(400, message, errors);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends HttpError {
    constructor(message = "Unauthorized") {
        super(401, message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends HttpError {
    constructor(message = "Forbidden") {
        super(403, message);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends HttpError {
    constructor(message = "Not Found") {
        super(404, message);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends HttpError {
    constructor(message = "Conflict") {
        super(409, message);
    }
}
exports.ConflictError = ConflictError;
class InternalServerError extends HttpError {
    constructor(message = "Internal Server Error") {
        super(500, message);
    }
}
exports.InternalServerError = InternalServerError;
