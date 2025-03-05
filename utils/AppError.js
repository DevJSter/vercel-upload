/**
 * Custom error class for handling application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Marks as operational error, not programming error

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for invalid input data
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message || "Invalid input data", 400);
    this.name = "ValidationError";
  }
}

/**
 * Error for unauthorized access
 */
class AuthenticationError extends AppError {
  constructor(message) {
    super(message || "Authentication required", 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Error for forbidden actions
 */
class ForbiddenError extends AppError {
  constructor(message) {
    super(message || "Access denied", 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Error for resource not found
 */
class NotFoundError extends AppError {
  constructor(message) {
    super(message || "Resource not found", 404);
    this.name = "NotFoundError";
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
};
