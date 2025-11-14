/**
 * Health Check System for Pythoughts Platform
 *
 * Provides comprehensive health checks for monitoring and orchestration.
 * Implements Kubernetes-style readiness and liveness probes.
 *
 * @module health
 */

import { supabase } from './supabase';
import { getRedisClient } from './redis';
import { logger } from './logger';
import { env as environment } from './env';

/**
 * Health check status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Individual component health
 */
export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  latency?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Overall system health
 */
export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: ComponentHealth[];
}

// Application start time for uptime calculation
const APP_START_TIME = Date.now();

/**
 * Check database connectivity and health
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    // Execute simple query to test connection
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    const latency = Date.now() - startTime;

    if (error) {
      logger.error('Database health check failed', error as Error);
      return {
        name: 'database',
        status: 'unhealthy',
        message: 'Query failed',
        latency,
      };
    }

    // Check if latency is acceptable (< 1000ms)
    if (latency > 1000) {
      return {
        name: 'database',
        status: 'degraded',
        message: 'High latency',
        latency,
      };
    }

    return {
      name: 'database',
      status: 'healthy',
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error('Database health check error', error as Error);

    return {
      name: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      latency,
    };
  }
}

/**
 * Check Redis connectivity and health
 */
async function checkRedis(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    const redis = await getRedisClient();

    // Test connection with PING command
    const pong = await redis.ping();
    const latency = Date.now() - startTime;

    if (pong !== 'PONG') {
      return {
        name: 'redis',
        status: 'unhealthy',
        message: 'Invalid PING response',
        latency,
      };
    }

    // Check if latency is acceptable (< 100ms)
    if (latency > 100) {
      return {
        name: 'redis',
        status: 'degraded',
        message: 'High latency',
        latency,
      };
    }

    // Get Redis info
    const info = await redis.info('server');
    const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);

    return {
      name: 'redis',
      status: 'healthy',
      latency,
      metadata: {
        version: versionMatch ? versionMatch[1] : 'unknown',
        uptime: uptimeMatch ? Number.parseInt(uptimeMatch[1]) : 0,
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error('Redis health check error', error as Error);

    return {
      name: 'redis',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      latency,
    };
  }
}

/**
 * Check Supabase authentication service
 */
async function checkAuth(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    // Test Supabase auth endpoint
    const { error } = await supabase.auth.getSession();
    const latency = Date.now() - startTime;

    if (error) {
      return {
        name: 'auth',
        status: 'degraded',
        message: 'Session check failed',
        latency,
      };
    }

    return {
      name: 'auth',
      status: 'healthy',
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error('Auth health check error', error as Error);

    return {
      name: 'auth',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Service unavailable',
      latency,
    };
  }
}

/**
 * Check external dependencies
 */
async function checkExternalServices(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    // Check if Supabase URL is reachable
    const response = await fetch(environment.VITE_SUPABASE_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        name: 'external_services',
        status: 'degraded',
        message: `HTTP ${response.status}`,
        latency,
      };
    }

    return {
      name: 'external_services',
      status: 'healthy',
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      name: 'external_services',
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Unreachable',
      latency,
    };
  }
}

/**
 * Determine overall system health based on component health
 */
function determineOverallHealth(components: ComponentHealth[]): HealthStatus {
  const unhealthyComponents = components.filter(c => c.status === 'unhealthy');
  const degradedComponents = components.filter(c => c.status === 'degraded');

  // If any critical component (database, redis) is unhealthy, system is unhealthy
  const criticalUnhealthy = unhealthyComponents.some(
    c => c.name === 'database' || c.name === 'redis'
  );

  if (criticalUnhealthy || unhealthyComponents.length > 1) {
    return 'unhealthy';
  }

  // If any component is degraded or one non-critical is unhealthy
  if (degradedComponents.length > 0 || unhealthyComponents.length > 0) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Perform comprehensive health check
 *
 * @returns System health status
 */
export async function performHealthCheck(): Promise<SystemHealth> {
  const startTime = Date.now();

  try {
    // Run all health checks in parallel
    const [database, redis, auth, external] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkAuth(),
      checkExternalServices(),
    ]);

    const components = [database, redis, auth, external];
    const status = determineOverallHealth(components);
    const uptime = Math.floor((Date.now() - APP_START_TIME) / 1000);

    const health: SystemHealth = {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.APP_VERSION || '1.0.0',
      environment: environment.NODE_ENV,
      components,
    };

    // Log health check results
    const duration = Date.now() - startTime;
    logger.info('Health check completed', {
      status,
      duration,
      unhealthy: components.filter(c => c.status === 'unhealthy').length,
      degraded: components.filter(c => c.status === 'degraded').length,
    });

    return health;
  } catch (error) {
    logger.error('Health check failed', error as Error);

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - APP_START_TIME) / 1000),
      version: process.env.APP_VERSION || '1.0.0',
      environment: environment.NODE_ENV,
      components: [
        {
          name: 'system',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

/**
 * Readiness probe - checks if application is ready to receive traffic
 *
 * Readiness indicates whether the application should receive traffic.
 * If readiness fails, the application should be removed from load balancer.
 *
 * @returns true if application is ready
 */
export async function isReady(): Promise<boolean> {
  try {
    const health = await performHealthCheck();

    // Application is ready if status is not unhealthy
    // Degraded state still accepts traffic
    return health.status !== 'unhealthy';
  } catch (error) {
    logger.error('Readiness probe failed', error as Error);
    return false;
  }
}

/**
 * Liveness probe - checks if application is alive
 *
 * Liveness indicates whether the application is running properly.
 * If liveness fails, the application should be restarted.
 *
 * @returns true if application is alive
 */
export async function isAlive(): Promise<boolean> {
  try {
    // Simple check - if we can execute this code, we're alive
    // Can be extended with more sophisticated checks
    const startTime = Date.now();

    // Test basic functionality
    const testValue = Math.random();
    const result = testValue * 2;

    const latency = Date.now() - startTime;

    // If basic operations are extremely slow, something is wrong
    if (latency > 1000) {
      logger.warn('Liveness probe detected high latency', { latency });
      return false;
    }

    return result > 0; // Always true, but prevents optimization
  } catch (error) {
    logger.error('Liveness probe failed', error as Error);
    return false;
  }
}

/**
 * Startup probe - checks if application has started successfully
 *
 * Startup probe is used for slow-starting applications.
 * Once startup succeeds, liveness and readiness probes take over.
 *
 * @returns true if application has started
 */
export async function hasStarted(): Promise<boolean> {
  try {
    // Check if critical dependencies are available
    const [databaseHealth, redisHealth] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    // Application has started if both database and redis are reachable
    return (
      databaseHealth.status !== 'unhealthy' &&
      redisHealth.status !== 'unhealthy'
    );
  } catch (error) {
    logger.error('Startup probe failed', error as Error);
    return false;
  }
}

/**
 * Get application metrics for monitoring
 */
export function getMetrics(): Record<string, unknown> {
  const uptime = Math.floor((Date.now() - APP_START_TIME) / 1000);
  const memoryUsage = process.memoryUsage();

  return {
    uptime,
    timestamp: new Date().toISOString(),
    environment: environment.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

/**
 * Format health check response for HTTP
 */
export function formatHealthResponse(
  health: SystemHealth,
  includeDetails = false
): {
  status: number;
  body: unknown;
} {
  const statusCode = health.status === 'healthy' ? 200 :
                     (health.status === 'degraded' ? 200 : 503);

  if (!includeDetails) {
    return {
      status: statusCode,
      body: {
        status: health.status,
        timestamp: health.timestamp,
      },
    };
  }

  return {
    status: statusCode,
    body: health,
  };
}
