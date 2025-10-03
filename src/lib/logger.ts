/**
 * Structured Logging Utility
 *
 * Provides a centralized logging system with support for different log levels,
 * structured metadata, and environment-aware output formatting.
 *
 * @module logger
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * String representation of log levels
 */
export type LogLevelString = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Metadata that can be attached to log messages
 */
export interface LogMetadata {
  [key: string]: any;
  error?: Error;
  stack?: string;
  timestamp?: string;
  context?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevelString;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  prettyPrint: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
}

/**
 * Default logger configuration based on environment
 */
function getDefaultConfig(): LoggerConfig {
  const isDevelopment = import.meta.env.MODE === 'development';

  return {
    minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
    prettyPrint: isDevelopment,
    includeTimestamp: true,
    includeContext: isDevelopment,
  };
}

/**
 * Logger class for structured logging
 */
class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      ...getDefaultConfig(),
      ...config,
    };
  }

  /**
   * Updates logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Gets current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Logs a debug message
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Logs an info message
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Logs an error message
   */
  error(message: string, metadata?: LogMetadata): void;
  error(message: string, error: Error, metadata?: LogMetadata): void;
  error(message: string, errorOrMetadata?: Error | LogMetadata, metadata?: LogMetadata): void {
    let finalMetadata: LogMetadata = {};

    if (errorOrMetadata instanceof Error) {
      finalMetadata = {
        ...metadata,
        error: errorOrMetadata,
        stack: errorOrMetadata.stack,
        errorName: errorOrMetadata.name,
        errorMessage: errorOrMetadata.message,
      };
    } else {
      finalMetadata = errorOrMetadata || {};
    }

    this.log(LogLevel.ERROR, message, finalMetadata);
  }

  /**
   * Logs a fatal error message
   */
  fatal(message: string, metadata?: LogMetadata): void;
  fatal(message: string, error: Error, metadata?: LogMetadata): void;
  fatal(message: string, errorOrMetadata?: Error | LogMetadata, metadata?: LogMetadata): void {
    let finalMetadata: LogMetadata = {};

    if (errorOrMetadata instanceof Error) {
      finalMetadata = {
        ...metadata,
        error: errorOrMetadata,
        stack: errorOrMetadata.stack,
        errorName: errorOrMetadata.name,
        errorMessage: errorOrMetadata.message,
      };
    } else {
      finalMetadata = errorOrMetadata || {};
    }

    this.log(LogLevel.FATAL, message, finalMetadata);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    // Check if this log level should be output
    if (level < this.config.minLevel) {
      return;
    }

    const levelString = this.getLevelString(level);
    const timestamp = new Date().toISOString();

    const entry: LogEntry = {
      level: levelString,
      message,
      timestamp,
      metadata: metadata ? { ...metadata, timestamp } : { timestamp },
    };

    // Output the log
    this.output(level, entry);
  }

  /**
   * Outputs the log entry to console
   */
  private output(level: LogLevel, entry: LogEntry): void {
    const consoleMethod = this.getConsoleMethod(level);

    if (this.config.prettyPrint) {
      this.prettyPrint(consoleMethod, level, entry);
    } else {
      this.structuredPrint(consoleMethod, entry);
    }
  }

  /**
   * Pretty prints log entry for development
   */
  private prettyPrint(
    consoleMethod: (...args: any[]) => void,
    level: LogLevel,
    entry: LogEntry
  ): void {
    const levelColor = this.getLevelColor(level);
    const levelBadge = this.getLevelBadge(entry.level);
    const timestamp = this.config.includeTimestamp
      ? `[${new Date(entry.timestamp).toLocaleTimeString()}]`
      : '';

    // Build the message
    const parts: string[] = [];

    if (timestamp) {
      parts.push(`\x1b[90m${timestamp}\x1b[0m`);
    }

    parts.push(`${levelColor}${levelBadge}\x1b[0m`);
    parts.push(entry.message);

    consoleMethod(parts.join(' '));

    // Log metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 1) { // > 1 because timestamp is always there
      const { timestamp: _, error, stack, ...restMetadata } = entry.metadata;

      if (Object.keys(restMetadata).length > 0) {
        console.log('  Metadata:', restMetadata);
      }

      if (error instanceof Error) {
        console.error('  Error:', error);
      }

      if (stack && this.config.includeContext) {
        console.log('  Stack:', stack);
      }
    }
  }

  /**
   * Prints structured JSON log entry for production
   */
  private structuredPrint(consoleMethod: (...args: any[]) => void, entry: LogEntry): void {
    // Serialize error objects properly
    const serializedEntry = {
      ...entry,
      metadata: entry.metadata ? this.serializeMetadata(entry.metadata) : undefined,
    };

    consoleMethod(JSON.stringify(serializedEntry));
  }

  /**
   * Serializes metadata, handling Error objects
   */
  private serializeMetadata(metadata: LogMetadata): Record<string, any> {
    const serialized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value instanceof Error) {
        serialized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
          ...(value as any), // Include any custom properties
        };
      } else if (value !== undefined) {
        serialized[key] = value;
      }
    }

    return serialized;
  }

  /**
   * Gets the console method for a log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Gets the string representation of a log level
   */
  private getLevelString(level: LogLevel): LogLevelString {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.FATAL:
        return 'fatal';
      default:
        return 'info';
    }
  }

  /**
   * Gets the ANSI color code for a log level
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      case LogLevel.FATAL:
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m'; // Reset
    }
  }

  /**
   * Gets the badge text for a log level
   */
  private getLevelBadge(level: LogLevelString): string {
    return `[${level.toUpperCase()}]`;
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: string | LogMetadata): Logger {
    const childLogger = new Logger(this.config);
    const baseMetadata = typeof context === 'string' ? { context } : context;

    // Override log method to include base metadata
    const originalLog = childLogger['log'].bind(childLogger);
    childLogger['log'] = (level: LogLevel, message: string, metadata?: LogMetadata) => {
      originalLog(level, message, { ...baseMetadata, ...metadata });
    };

    return childLogger;
  }

  /**
   * Measures execution time of a function
   */
  async measureTime<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: LogMetadata
  ): Promise<T> {
    const startTime = performance.now();
    this.debug(`Starting: ${name}`, metadata);

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.info(`Completed: ${name}`, {
        ...metadata,
        duration: Math.round(duration),
        durationMs: `${duration.toFixed(2)}ms`,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.error(`Failed: ${name}`, error as Error, {
        ...metadata,
        duration: Math.round(duration),
        durationMs: `${duration.toFixed(2)}ms`,
      });

      throw error;
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Creates a new logger instance with custom configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safely extracts error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unknown error occurred';
}

/**
 * Safely extracts error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }

  return undefined;
}
