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
 * Validated environment configuration interface
 */
export interface EnvConfig {
  // Application
  NODE_ENV: Environment;
  MODE: string;

  // Supabase (required)
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;

  // Redis (optional with default)
  VITE_REDIS_URL: string;

  // Better Auth (required for production)
  VITE_BETTER_AUTH_URL?: string;
  VITE_BETTER_AUTH_SECRET?: string;

  // Resend Email (required for production)
  VITE_RESEND_API_KEY?: string;

  // Optional feature flags
  VITE_ENABLE_ANALYTICS?: string;
  VITE_ENABLE_DEBUG?: string;
}

/**
 * Custom error class for environment validation errors
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly missingVars?: string[],
    public readonly invalidVars?: Array<{ name: string; reason: string }>
  ) {
    super(message);
    this.name = 'EnvValidationError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnvValidationError);
    }
  }
}

/**
 * Validates a required environment variable
 */
function requireEnv(key: string, errorContext: string[] = []): string {
  const value = import.meta.env[key];

  if (!value || value.trim() === '') {
    errorContext.push(key);
    return '';
  }

  return value;
}

/**
 * Validates an optional environment variable with a default value
 */
function optionalEnv(key: string, defaultValue: string): string {
  const value = import.meta.env[key];
  return value && value.trim() !== '' ? value : defaultValue;
}

/**
 * Validates a URL format
 */
function validateUrl(url: string, varName: string, invalidVars: Array<{ name: string; reason: string }> = []): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    invalidVars.push({
      name: varName,
      reason: `Invalid URL format: ${url}`,
    });
    return false;
  }
}

/**
 * Validates environment variables and returns typed configuration
 *
 * @throws {EnvValidationError} If required variables are missing or invalid
 * @returns {EnvConfig} Validated environment configuration
 */
function validateEnv(): EnvConfig {
  const missingVars: string[] = [];
  const invalidVars: Array<{ name: string; reason: string }> = [];

  // Get environment
  const nodeEnv = import.meta.env.MODE || 'development';
  const isProd = nodeEnv === 'production';

  // Validate required variables
  const supabaseUrl = requireEnv('VITE_SUPABASE_URL', missingVars);
  const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY', missingVars);

  // Validate URLs if present
  if (supabaseUrl && !validateUrl(supabaseUrl, 'VITE_SUPABASE_URL', invalidVars)) {
    // URL validation already added to invalidVars
  }

  // Validate production-only required variables
  let betterAuthUrl: string | undefined;
  let betterAuthSecret: string | undefined;
  let resendApiKey: string | undefined;

  if (isProd) {
    betterAuthUrl = requireEnv('VITE_BETTER_AUTH_URL', missingVars);
    betterAuthSecret = requireEnv('VITE_BETTER_AUTH_SECRET', missingVars);
    resendApiKey = requireEnv('VITE_RESEND_API_KEY', missingVars);

    if (betterAuthUrl && !validateUrl(betterAuthUrl, 'VITE_BETTER_AUTH_URL', invalidVars)) {
      // URL validation already added to invalidVars
    }

    if (resendApiKey && !resendApiKey.startsWith('re_')) {
      invalidVars.push({
        name: 'VITE_RESEND_API_KEY',
        reason: 'API key must start with "re_"',
      });
    }
  } else {
    // Optional in development
    betterAuthUrl = import.meta.env.VITE_BETTER_AUTH_URL;
    betterAuthSecret = import.meta.env.VITE_BETTER_AUTH_SECRET;
    resendApiKey = import.meta.env.VITE_RESEND_API_KEY;
  }

  // Optional variables with defaults
  const redisUrl = optionalEnv('VITE_REDIS_URL', 'redis://localhost:6379');

  // Validate Redis URL if provided
  if (redisUrl !== 'redis://localhost:6379' && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    invalidVars.push({
      name: 'VITE_REDIS_URL',
      reason: 'Must start with redis:// or rediss://',
    });
  }

  // Check for validation errors
  if (missingVars.length > 0 || invalidVars.length > 0) {
    const errorParts: string[] = ['Environment validation failed:'];

    if (missingVars.length > 0) {
      errorParts.push('\n\nMissing required variables:');
      missingVars.forEach(v => {
        errorParts.push(`  - ${v}`);
      });

      errorParts.push('\n\nPlease set these variables in your .env file:');
      missingVars.forEach(v => {
        errorParts.push(`  ${v}=your_value_here`);
      });
    }

    if (invalidVars.length > 0) {
      errorParts.push('\n\nInvalid variable values:');
      invalidVars.forEach(({ name, reason }) => {
        errorParts.push(`  - ${name}: ${reason}`);
      });
    }

    if (isProd) {
      errorParts.push('\n\nNote: Running in PRODUCTION mode - all authentication and email variables are required.');
    }

    throw new EnvValidationError(
      errorParts.join('\n'),
      missingVars,
      invalidVars
    );
  }

  return {
    NODE_ENV: nodeEnv as Environment,
    MODE: nodeEnv,
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    VITE_REDIS_URL: redisUrl,
    VITE_BETTER_AUTH_URL: betterAuthUrl,
    VITE_BETTER_AUTH_SECRET: betterAuthSecret,
    VITE_RESEND_API_KEY: resendApiKey,
    VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
    VITE_ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG,
  };
}

/**
 * Validated and typed environment configuration
 *
 * This is initialized on module load and will throw an error if validation fails,
 * ensuring the application fails fast with clear error messages.
 */
export const env: EnvConfig = (() => {
  try {
    const config = validateEnv();

    // Log successful validation in development
    if (config.NODE_ENV === 'development') {
      logger.info('Environment variables validated successfully', {
        mode: config.MODE,
        supabaseUrl: config.VITE_SUPABASE_URL,
        redisUrl: config.VITE_REDIS_URL,
        hasAuth: !!config.VITE_BETTER_AUTH_URL,
        hasEmail: !!config.VITE_RESEND_API_KEY,
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
 * Gets a safe version of the environment config for logging
 * (sensitive values are masked)
 */
export function getSafeEnvConfig(): Record<string, string> {
  return {
    NODE_ENV: env.NODE_ENV,
    MODE: env.MODE,
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: maskSecret(env.VITE_SUPABASE_ANON_KEY),
    VITE_REDIS_URL: maskUrl(env.VITE_REDIS_URL),
    VITE_BETTER_AUTH_URL: env.VITE_BETTER_AUTH_URL || 'not set',
    VITE_BETTER_AUTH_SECRET: env.VITE_BETTER_AUTH_SECRET ? maskSecret(env.VITE_BETTER_AUTH_SECRET) : 'not set',
    VITE_RESEND_API_KEY: env.VITE_RESEND_API_KEY ? maskSecret(env.VITE_RESEND_API_KEY) : 'not set',
    VITE_ENABLE_ANALYTICS: env.VITE_ENABLE_ANALYTICS || 'false',
    VITE_ENABLE_DEBUG: env.VITE_ENABLE_DEBUG || 'false',
  };
}

/**
 * Masks a secret value for safe logging
 */
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) {
    return '***';
  }
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

/**
 * Masks credentials in a URL for safe logging
 */
function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    if (urlObj.username) {
      urlObj.username = '***';
    }
    return urlObj.toString();
  } catch {
    return url;
  }
}
