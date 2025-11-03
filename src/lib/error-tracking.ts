/**
 * Error Tracking Integration
 *
 * Centralized error tracking utilities for integration with services like:
 * - Sentry
 * - LogRocket
 * - Datadog
 * - Custom error tracking solutions
 */

import { logger } from './logger';

export interface ErrorContext {
  /**
   * User information
   */
  user?: {
    id?: string;
    username?: string;
    email?: string;
  };

  /**
   * Additional context tags
   */
  tags?: Record<string, string | number | boolean>;

  /**
   * Extra data to attach to the error
   */
  extra?: Record<string, unknown>;

  /**
   * Error severity level
   */
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';

  /**
   * Breadcrumbs leading up to the error
   */
  breadcrumbs?: ErrorBreadcrumb[];
}

export interface ErrorBreadcrumb {
  timestamp: number;
  message: string;
  category: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}

class ErrorTracker {
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private userContext: ErrorContext['user'] | null = null;
  private globalTags: Record<string, string | number | boolean> = {};

  /**
   * Initialize error tracking service
   * This is where you would initialize Sentry, LogRocket, etc.
   */
  init(config: {
    dsn?: string;
    environment?: string;
    release?: string;
    sampleRate?: number;
  }): void {
    logger.info('Error tracking initialized', {
      environment: config.environment || 'development',
      release: config.release || 'unknown',
      hasDsn: !!config.dsn,
    });

    // Example Sentry initialization (commented out - add Sentry SDK to use):
    /*
    if (config.dsn) {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        tracesSampleRate: config.sampleRate || 0.1,
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay(),
        ],
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
    }
    */
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: ErrorContext['user'] | null): void {
    this.userContext = user;

    logger.info('Error tracking user context set', {
      hasUser: !!user,
      userId: user?.id,
    });

    // Example Sentry usage:
    // Sentry.setUser(user ? { id: user.id, email: user.email, username: user.username } : null);
  }

  /**
   * Set global tags that will be attached to all errors
   */
  setTags(tags: Record<string, string | number | boolean>): void {
    this.globalTags = { ...this.globalTags, ...tags };

    // Example Sentry usage:
    // Sentry.setTags(tags);
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: ErrorBreadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    logger.debug('Breadcrumb added', {
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level,
    });

    // Example Sentry usage:
    // Sentry.addBreadcrumb({
    //   message: breadcrumb.message,
    //   category: breadcrumb.category,
    //   level: breadcrumb.level,
    //   data: breadcrumb.data,
    // });
  }

  /**
   * Capture error with context
   */
  captureError(error: Error, context: ErrorContext = {}): void {
    const errorData = {
      user: context.user || this.userContext,
      tags: { ...this.globalTags, ...context.tags },
      extra: context.extra,
      level: context.level || 'error',
      breadcrumbs: context.breadcrumbs || this.breadcrumbs.slice(-10), // Last 10 breadcrumbs
      url: globalThis.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    logger.error('Error captured by error tracker', error, errorData);

    // Example Sentry usage:
    // Sentry.withScope((scope) => {
    //   if (context.user) scope.setUser(context.user);
    //   if (context.tags) scope.setTags(context.tags);
    //   if (context.extra) scope.setExtras(context.extra);
    //   if (context.level) scope.setLevel(context.level);
    //   Sentry.captureException(error);
    // });
  }

  /**
   * Capture message (non-error event)
   */
  captureMessage(message: string, context: ErrorContext = {}): void {
    const messageData = {
      message,
      user: context.user || this.userContext,
      tags: { ...this.globalTags, ...context.tags },
      extra: context.extra,
      level: context.level || 'info',
      url: globalThis.location.href,
      timestamp: new Date().toISOString(),
    };

    logger.info('Message captured by error tracker', messageData);

    // Example Sentry usage:
    // Sentry.withScope((scope) => {
    //   if (context.user) scope.setUser(context.user);
    //   if (context.tags) scope.setTags(context.tags);
    //   if (context.extra) scope.setExtras(context.extra);
    //   if (context.level) scope.setLevel(context.level);
    //   Sentry.captureMessage(message);
    // });
  }

  /**
   * Track performance transaction
   */
  startTransaction(name: string, operation: string): () => void {
    const startTime = performance.now();

    logger.info('Performance transaction started', {
      transaction: name,
      operation,
    });

    // Example Sentry usage:
    // const transaction = Sentry.startTransaction({ name, op: operation });

    return () => {
      const duration = performance.now() - startTime;

      logger.info('Performance transaction completed', {
        transaction: name,
        operation,
        durationMs: duration.toFixed(2),
      });

      // Example Sentry usage:
      // transaction.finish();
    };
  }

  /**
   * Get breadcrumbs for debugging
   */
  getBreadcrumbs(): ErrorBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
    logger.debug('Breadcrumbs cleared');
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

/**
 * Initialize error tracking
 * Call this early in your application bootstrap
 */
export function initErrorTracking(config: {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
}): void {
  errorTracker.init(config);

  // Set up global error handlers
  if (globalThis.window !== undefined) {
    // Unhandled promise rejections
    globalThis.addEventListener('unhandledrejection', (event) => {
      errorTracker.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          level: 'error',
          tags: {
            type: 'unhandledrejection',
          },
          extra: {
            reason: event.reason,
            promise: String(event.promise),
          },
        }
      );
    });

    // Global errors
    globalThis.addEventListener('error', (event) => {
      errorTracker.captureError(event.error || new Error(event.message), {
        level: 'error',
        tags: {
          type: 'global_error',
        },
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });
  }
}

/**
 * Helper to wrap async functions with error tracking
 */
export function withErrorTracking<TArguments extends unknown[], TReturn>(
  function_: (...arguments_: TArguments) => Promise<TReturn>,
  context: Omit<ErrorContext, 'user'> = {}
): (...arguments_: TArguments) => Promise<TReturn> {
  return async (...arguments_: TArguments): Promise<TReturn> => {
    try {
      return await function_(...arguments_);
    } catch (error) {
      if (error instanceof Error) {
        errorTracker.captureError(error, context);
      }
      throw error;
    }
  };
}

/**
 * Helper to wrap sync functions with error tracking
 */
export function withErrorTrackingSync<TArguments extends unknown[], TReturn>(
  function_: (...arguments_: TArguments) => TReturn,
  context: Omit<ErrorContext, 'user'> = {}
): (...arguments_: TArguments) => TReturn {
  return (...arguments_: TArguments): TReturn => {
    try {
      return function_(...arguments_);
    } catch (error) {
      if (error instanceof Error) {
        errorTracker.captureError(error, context);
      }
      throw error;
    }
  };
}

// Export convenience functions
export const setUser = errorTracker.setUser.bind(errorTracker);
export const setTags = errorTracker.setTags.bind(errorTracker);
export const addBreadcrumb = errorTracker.addBreadcrumb.bind(errorTracker);
export const captureError = errorTracker.captureError.bind(errorTracker);
export const captureMessage = errorTracker.captureMessage.bind(errorTracker);
export const startTransaction = errorTracker.startTransaction.bind(errorTracker);

export default errorTracker;
