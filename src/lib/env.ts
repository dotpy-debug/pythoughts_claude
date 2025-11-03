/**
 * Environment Variable Validation and Configuration
 *
 * This module provides type-safe access to environment variables with runtime validation.
 * All environment variables are validated on application startup to fail fast and provide
 * clear error messages for missing or invalid configuration.
 *
 * @module env
 */

import { logger } from './logger';

/**
 * Environment types for runtime behavior
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Client-safe environment configuration (exposed via VITE_ prefix)
 */
export interface EnvironmentConfig {
  // Application
  NODE_ENV: Environment;
  MODE: string;

  // Supabase (required - client-safe)
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;

  // Better Auth URL (client-safe)
  VITE_BETTER_AUTH_URL?: string;

  // Pexels API (client-safe)
  VITE_PEXELS_API_KEY?: string;

  // Optional feature flags (client-safe)
  VITE_ENABLE_ANALYTICS?: string;
  VITE_ENABLE_DEBUG?: string;
}

/**
 * Server-only environment configuration (NOT exposed to client)
 * These variables do NOT have VITE_ prefix and are only available server-side
 */
export interface ServerEnvironmentConfig {
  // Redis (server-only)
  REDIS_URL: string;

  // Better Auth Secret (server-only)
  BETTER_AUTH_SECRET?: string;

  // Resend Email API Key (server-only)
  RESEND_API_KEY?: string;
}

/**
 * Custom error class for environment validation errors
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly missingVariables?: string[],
    public readonly invalidVariables?: Array<{ name: string; reason: string }>
  ) {
    super(message);
    this.name = 'EnvValidationError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {}
  }
}

/**
 * Validates a required environment variable from import.meta.env (client-safe)
 */
function requireEnvironment(key: string, errorContext: string[] = []): string {
  const value = import.meta.env[key];

  if (!value || value.trim() === '') {
    errorContext.push(key);
    return '';
  }

  return value;
}

/**
 * Validates a required environment variable from process.env (server-only)
 */
function requireServerEnvironment(key: string, errorContext: string[] = []): string {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    errorContext.push(key);
    return '';
  }

  return value;
}

/**
 * Validates an optional environment variable with a default value (server-only)
 */
function optionalServerEnvironment(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : defaultValue;
}

/**
 * Validates a URL format
 */
function validateUrl(url: string, variableName: string, invalidVariables: Array<{ name: string; reason: string }> = []): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    invalidVariables.push({
      name: variableName,
      reason: `Invalid URL format: ${url}`,
    });
    return false;
  }
}

/**
 * Masks a secret value for safe logging
 */
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) {
    return '***';
  }
  return `${secret.slice(0, 4)}...${secret.slice(Math.max(0, secret.length - 4))}`;
}

/**
 * Masks credentials in a URL for safe logging
 */
function maskUrl(url: string): string {
  try {
    const urlObject = new URL(url);
    if (urlObject.password) {
      urlObject.password = '***';
    }
    if (urlObject.username) {
      urlObject.username = '***';
    }
    return urlObject.toString();
  } catch {
    return url;
  }
}

/**
 * Validates client-safe environment variables
 *
 * @throws {EnvValidationError} If required variables are missing or invalid
 * @returns {EnvConfig} Validated environment configuration
 */
function validateEnvironment(): EnvironmentConfig {
  const missingVariables: string[] = [];
  const invalidVariables: Array<{ name: string; reason: string }> = [];

  // Get environment
  const nodeEnvironment = import.meta.env.MODE || 'development';
  const isProduction_ = nodeEnvironment === 'production';

  // Validate required client-safe variables
  const supabaseUrl = requireEnvironment('VITE_SUPABASE_URL', missingVariables);
  const supabaseAnonKey = requireEnvironment('VITE_SUPABASE_ANON_KEY', missingVariables);

  // Validate URLs if present
  if (supabaseUrl && !validateUrl(supabaseUrl, 'VITE_SUPABASE_URL', invalidVariables)) {
    // URL validation already added to invalidVars
  }

  // Validate production-only required variables
  let betterAuthUrl: string | undefined;

  if (isProduction_) {
    betterAuthUrl = requireEnvironment('VITE_BETTER_AUTH_URL', missingVariables);

    if (betterAuthUrl && !validateUrl(betterAuthUrl, 'VITE_BETTER_AUTH_URL', invalidVariables)) {
      // URL validation already added to invalidVars
    }
  } else {
    // Optional in development
    betterAuthUrl = import.meta.env.VITE_BETTER_AUTH_URL;
  }

  // Check for validation errors
  if (missingVariables.length > 0 || invalidVariables.length > 0) {
    const errorParts: string[] = ['Environment validation failed:'];

    if (missingVariables.length > 0) {
      errorParts.push('\n\nMissing required variables:');
      for (const v of missingVariables) {
        errorParts.push(`  - ${v}`);
      }

      errorParts.push('\n\nPlease set these variables in your .env file:');
      for (const v of missingVariables) {
        errorParts.push(`  ${v}=your_value_here`);
      }
    }

    if (invalidVariables.length > 0) {
      errorParts.push('\n\nInvalid variable values:');
      for (const { name, reason } of invalidVariables) {
        errorParts.push(`  - ${name}: ${reason}`);
      }
    }

    throw new EnvValidationError(
      errorParts.join('\n'),
      missingVariables,
      invalidVariables
    );
  }

  return {
    NODE_ENV: nodeEnvironment as Environment,
    MODE: nodeEnvironment,
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    VITE_BETTER_AUTH_URL: betterAuthUrl,
    VITE_PEXELS_API_KEY: import.meta.env.VITE_PEXELS_API_KEY,
    VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
    VITE_ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG,
  };
}

/**
 * Validates server-only environment variables
 *
 * @throws {EnvValidationError} If required variables are missing or invalid
 * @returns {ServerEnvConfig} Validated server environment configuration
 */
function validateServerEnvironment(): ServerEnvironmentConfig {
  const missingVariables: string[] = [];
  const invalidVariables: Array<{ name: string; reason: string }> = [];

  // Get environment
  const nodeEnvironment = process.env.NODE_ENV || 'development';
  const isProduction_ = nodeEnvironment === 'production';

  // Optional variables with defaults
  const redisUrl = optionalServerEnvironment('REDIS_URL', 'redis://localhost:6379');

  // Validate Redis URL if provided
  if (redisUrl !== 'redis://localhost:6379' && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    invalidVariables.push({
      name: 'REDIS_URL',
      reason: 'Must start with redis:// or rediss://',
    });
  }

  // Validate production-only required variables
  let betterAuthSecret: string | undefined;
  let resendApiKey: string | undefined;

  if (isProduction_) {
    betterAuthSecret = requireServerEnvironment('BETTER_AUTH_SECRET', missingVariables);
    resendApiKey = requireServerEnvironment('RESEND_API_KEY', missingVariables);

    if (resendApiKey && !resendApiKey.startsWith('re_')) {
      invalidVariables.push({
        name: 'RESEND_API_KEY',
        reason: 'API key must start with "re_"',
      });
    }
  } else {
    // Optional in development
    betterAuthSecret = process.env.BETTER_AUTH_SECRET;
    resendApiKey = process.env.RESEND_API_KEY;
  }

  // Check for validation errors
  if (missingVariables.length > 0 || invalidVariables.length > 0) {
    const errorParts: string[] = ['Server environment validation failed:'];

    if (missingVariables.length > 0) {
      errorParts.push('\n\nMissing required server variables:');
      for (const v of missingVariables) {
        errorParts.push(`  - ${v}`);
      }

      errorParts.push('\n\nPlease set these variables in your .env file:');
      for (const v of missingVariables) {
        errorParts.push(`  ${v}=your_value_here`);
      }
    }

    if (invalidVariables.length > 0) {
      errorParts.push('\n\nInvalid variable values:');
      for (const { name, reason } of invalidVariables) {
        errorParts.push(`  - ${name}: ${reason}`);
      }
    }

    if (isProduction_) {
      errorParts.push('\n\nNote: Running in PRODUCTION mode - all authentication and email variables are required.');
    }

    throw new EnvValidationError(
      errorParts.join('\n'),
      missingVariables,
      invalidVariables
    );
  }

  return {
    REDIS_URL: redisUrl,
    BETTER_AUTH_SECRET: betterAuthSecret,
    RESEND_API_KEY: resendApiKey,
  };
}

/**
 * Validated and typed client-safe environment configuration
 *
 * This is initialized on module load and will throw an error if validation fails,
 * ensuring the application fails fast with clear error messages.
 */
export const env: EnvironmentConfig = (() => {
  try {
    const config = validateEnvironment();

    // Log successful validation in development
    if (config.NODE_ENV === 'development') {
      logger.info('Client environment variables validated successfully', {
        mode: config.MODE,
        supabaseUrl: config.VITE_SUPABASE_URL,
        hasAuth: !!config.VITE_BETTER_AUTH_URL,
      });
    }

    return config;
  } catch (error) {
    if (error instanceof EnvValidationError) {
      // Log the error with full details
      console.error('\n' + '='.repeat(80));
      console.error('FATAL: Environment Validation Error');
      console.error('='.repeat(80));
      console.error(error.message);
      console.error('='.repeat(80) + '\n');

      // Re-throw to prevent application startup
      throw error;
    }

    // Unknown error during validation
    console.error('Unexpected error during environment validation:', error);
    throw error;
  }
})();

/**
 * Validated and typed server-only environment configuration
 *
 * IMPORTANT: This should only be accessed in server-side code (Server Components, Server Actions, API routes).
 * Never import this in client components as it will fail.
 *
 * This is initialized on module load in server contexts and will throw an error if validation fails.
 */
export const serverEnv: ServerEnvironmentConfig = (() => {
  // Only validate server env in Node.js/Bun environment (not in browser)
  if (typeof process === 'undefined') {
    // Return empty config for client-side (should never be accessed)
    return {
      REDIS_URL: '',
      BETTER_AUTH_SECRET: undefined,
      RESEND_API_KEY: undefined,
    };
  }

  try {
    const config = validateServerEnvironment();

    // Log successful validation in development
    if (process.env.NODE_ENV === 'development') {
      logger.info('Server environment variables validated successfully', {
        redisUrl: maskUrl(config.REDIS_URL),
        hasAuthSecret: !!config.BETTER_AUTH_SECRET,
        hasEmailKey: !!config.RESEND_API_KEY,
      });
    }

    return config;
  } catch (error) {
    if (error instanceof EnvValidationError) {
      // Log the error with full details
      console.error('\n' + '='.repeat(80));
      console.error('FATAL: Server Environment Validation Error');
      console.error('='.repeat(80));
      console.error(error.message);
      console.error('='.repeat(80) + '\n');

      // Re-throw to prevent application startup
      throw error;
    }

    // Unknown error during validation
    console.error('Unexpected error during server environment validation:', error);
    throw error;
  }
})();

/**
 * Helper function to check if running in production
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Helper function to check if running in development
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Helper function to check if running in test mode
 */
export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

/**
 * Helper function to check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return env.VITE_ENABLE_ANALYTICS === 'true';
}

/**
 * Helper function to check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return env.VITE_ENABLE_DEBUG === 'true' || env.NODE_ENV === 'development';
}

/**
 * Gets a safe version of the client environment config for logging
 * (sensitive values are masked)
 */
export function getSafeEnvConfig(): Record<string, string> {
  return {
    NODE_ENV: env.NODE_ENV,
    MODE: env.MODE,
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: maskSecret(env.VITE_SUPABASE_ANON_KEY),
    VITE_BETTER_AUTH_URL: env.VITE_BETTER_AUTH_URL || 'not set',
    VITE_PEXELS_API_KEY: env.VITE_PEXELS_API_KEY ? maskSecret(env.VITE_PEXELS_API_KEY) : 'not set',
    VITE_ENABLE_ANALYTICS: env.VITE_ENABLE_ANALYTICS || 'false',
    VITE_ENABLE_DEBUG: env.VITE_ENABLE_DEBUG || 'false',
  };
}

/**
 * Gets a safe version of the server environment config for logging
 * (sensitive values are masked)
 * Only call this in server-side code!
 */
export function getSafeServerEnvConfig(): Record<string, string> {
  return {
    REDIS_URL: maskUrl(serverEnv.REDIS_URL),
    BETTER_AUTH_SECRET: serverEnv.BETTER_AUTH_SECRET ? maskSecret(serverEnv.BETTER_AUTH_SECRET) : 'not set',
    RESEND_API_KEY: serverEnv.RESEND_API_KEY ? maskSecret(serverEnv.RESEND_API_KEY) : 'not set',
  };
}
