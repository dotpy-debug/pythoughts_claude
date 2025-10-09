/**
 * Centralized Error Handling
 *
 * Provides custom error classes, error logging utilities, and consistent error
 * response formatting for the Pythoughts platform.
 *
 * @module errors
 */

import { logger, getErrorMessage } from './logger';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly name: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts error to JSON format for API responses
   */
  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed', statusCode: number = 401) {
    super(message, statusCode);
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends AppError {
  public readonly query?: string;
  public readonly table?: string;

  constructor(
    message: string = 'Database operation failed',
    metadata?: { query?: string; table?: string }
  ) {
    super(message, 500);
    this.query = metadata?.query;
    this.table = metadata?.table;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        metadata: {
          table: this.table,
        },
      },
    };
  }
}

/**
 * Validation errors for user input
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string = 'Validation failed', fields?: Record<string, string[]>) {
    super(message, 400);
    this.fields = fields;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        fields: this.fields,
      },
    };
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  public readonly resource?: string;
  public readonly resourceId?: string;

  constructor(
    message: string = 'Resource not found',
    resource?: string,
    resourceId?: string
  ) {
    super(message, 404);
    this.resource = resource;
    this.resourceId = resourceId;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        metadata: {
          resource: this.resource,
          resourceId: this.resourceId,
        },
      },
    };
  }
}

/**
 * Permission/authorization errors
 */
export class ForbiddenError extends AppError {
  public readonly action?: string;
  public readonly resource?: string;

  constructor(
    message: string = 'Permission denied',
    action?: string,
    resource?: string
  ) {
    super(message, 403);
    this.action = action;
    this.resource = resource;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        metadata: {
          action: this.action,
          resource: this.resource,
        },
      },
    };
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        metadata: {
          retryAfter: this.retryAfter,
        },
      },
    };
  }
}

/**
 * External service errors (e.g., Supabase, Redis, Resend)
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(service: string, message?: string, originalError?: Error) {
    super(
      message || `External service error: ${service}`,
      503
    );
    this.service = service;
    this.originalError = originalError;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        metadata: {
          service: this.service,
        },
      },
    };
  }
}

/**
 * Conflict errors (e.g., duplicate resources)
 */
export class ConflictError extends AppError {
  public readonly conflictingField?: string;

  constructor(message: string = 'Resource conflict', conflictingField?: string) {
    super(message, 409);
    this.conflictingField = conflictingField;
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        metadata: {
          conflictingField: this.conflictingField,
        },
      },
    };
  }
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    name: string;
    message: string;
    statusCode: number;
    timestamp: string;
    fields?: Record<string, string[]>;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

/**
 * Error logging utility with proper error levels
 */
export class ErrorLogger {
  /**
   * Logs an error with appropriate level and metadata
   */
  static log(error: Error | AppError, context?: string, metadata?: Record<string, unknown>): void {
    const errorMetadata = {
      context,
      ...metadata,
      errorName: error.name,
    };

    if (error instanceof AppError) {
      // Operational errors - expected errors that we handle
      if (error.isOperational) {
        if (error.statusCode >= 500) {
          logger.error(error.message, error, {
            ...errorMetadata,
            statusCode: error.statusCode,
          });
        } else if (error.statusCode >= 400) {
          logger.warn(error.message, {
            ...errorMetadata,
            statusCode: error.statusCode,
          });
        }
      } else {
        // Non-operational errors - programming errors that need immediate attention
        logger.fatal(error.message, error, {
          ...errorMetadata,
          statusCode: error.statusCode,
          isOperational: false,
        });
      }
    } else {
      // Unknown errors - treat as fatal
      logger.error(error.message, error, errorMetadata);
    }
  }

  /**
   * Logs a validation error
   */
  static logValidation(
    error: ValidationError,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    logger.warn(error.message, {
      context,
      ...metadata,
      fields: error.fields,
    });
  }

  /**
   * Logs a database error
   */
  static logDatabase(
    error: DatabaseError,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    logger.error(error.message, error, {
      context,
      ...metadata,
      table: error.table,
      query: error.query,
    });
  }

  /**
   * Logs an external service error
   */
  static logExternalService(
    error: ExternalServiceError,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    logger.error(error.message, error.originalError || error, {
      context,
      ...metadata,
      service: error.service,
    });
  }
}

/**
 * Error boundary helper for catching and handling errors in async operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  options?: {
    onError?: (error: Error) => void;
    fallbackValue?: T;
    rethrow?: boolean;
  }
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(getErrorMessage(error));

    ErrorLogger.log(err, context);

    if (options?.onError) {
      options.onError(err);
    }

    if (options?.rethrow ?? true) {
      throw err;
    }

    return options?.fallbackValue;
  }
}

/**
 * Wraps a function with error handling
 */
export function withErrorBoundary<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context: string
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(getErrorMessage(error));
      ErrorLogger.log(err, context);
      throw err;
    }
  };
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is a specific AppError subclass
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isExternalServiceError(error: unknown): error is ExternalServiceError {
  return error instanceof ExternalServiceError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

/**
 * Converts any error to a standardized error response
 */
export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return error.toJSON();
  }

  const message = getErrorMessage(error);
  const timestamp = new Date().toISOString();

  return {
    success: false,
    error: {
      name: 'Error',
      message,
      statusCode: 500,
      timestamp,
    },
  };
}

/**
 * Creates a standardized success response
 */
export function toSuccessResponse<T>(
  data: T,
  metadata?: Record<string, unknown>
): SuccessResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Handles errors in API route handlers or server actions
 */
export function handleError(error: unknown, context?: string): ErrorResponse {
  const err = error instanceof Error ? error : new Error(getErrorMessage(error));

  ErrorLogger.log(err, context);

  return toErrorResponse(err);
}

/**
 * Creates an error handler middleware pattern
 */
export function createErrorHandler(context: string) {
  return (error: unknown): ErrorResponse => {
    return handleError(error, context);
  };
}

/**
 * Retry logic with exponential backoff for transient errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    onRetry?: (error: Error, attempt: number, delay: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(getErrorMessage(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

      if (onRetry) {
        onRetry(lastError, attempt, delay);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Helper to determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Network errors
  if (error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')) {
    return true;
  }

  // Rate limiting
  if (error instanceof RateLimitError) {
    return true;
  }

  // External service errors
  if (error instanceof ExternalServiceError) {
    return true;
  }

  // 5xx errors
  if (error instanceof AppError && error.statusCode >= 500) {
    return true;
  }

  return false;
}
