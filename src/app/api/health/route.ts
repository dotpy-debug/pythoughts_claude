/**
 * Health Check API Endpoint
 *
 * Provides system health status for monitoring and load balancers
 */

import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { Redis } from 'ioredis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface SystemHealth {
  overall: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return {
      service: 'database',
      status: 'unhealthy',
      error: 'DATABASE_URL not configured',
    };
  }

  try {
    const sql = postgres(databaseUrl, {
      max: 1,
      connect_timeout: 5,
    });

    await Promise.race([
      sql`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      ),
    ]);

    await sql.end();
    const latency = Date.now() - startTime;

    return {
      service: 'database',
      status: latency < 1000 ? 'healthy' : 'degraded',
      latency,
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;

  if (!redisUrl) {
    return {
      service: 'redis',
      status: 'unhealthy',
      error: 'REDIS_URL not configured',
    };
  }

  try {
    const redis = new Redis(redisUrl, {
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 5000)
      ),
    ]);

    redis.disconnect();
    const latency = Date.now() - startTime;

    return {
      service: 'redis',
      status: latency < 500 ? 'healthy' : 'degraded',
      latency,
    };
  } catch (error) {
    return {
      service: 'redis',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Check environment configuration
 */
async function checkEnvironment(): Promise<HealthCheckResult> {
  const requiredVariables = [
    'DATABASE_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVariables.filter(v => !process.env[v]);

  return {
    service: 'environment',
    status: missing.length === 0 ? 'healthy' : 'unhealthy',
    error: missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
    details: {
      missing,
      configured: requiredVariables.length - missing.length,
      total: requiredVariables.length,
    },
  };
}

/**
 * GET /api/health
 *
 * Returns comprehensive system health status
 */
export async function GET() {
  try {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkEnvironment(),
    ]);

    const results: HealthCheckResult[] = checks.map((result, index) => {
      const services = ['database', 'redis', 'environment'];
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        service: services[index],
        status: 'unhealthy',
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      };
    });

    const unhealthyCount = results.filter(c => c.status === 'unhealthy').length;
    const degradedCount = results.filter(c => c.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const health: SystemHealth = {
      overall,
      checks: results,
      timestamp: new Date().toISOString(),
    };

    // Determine HTTP status code
    const statusCode = health.overall === 'healthy' ? 200 : (health.overall === 'degraded' ? 200 : 503);

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    // If health check itself fails, return unhealthy status
    const errorHealth: SystemHealth = {
      overall: 'unhealthy',
      checks: [
        {
          service: 'health-check',
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorHealth, { status: 503 });
  }
}

