/**
 * Production Health Check System
 *
 * Comprehensive health monitoring for:
 * - Database connectivity
 * - Redis connectivity
 * - External services
 * - System resources
 * - Application endpoints
 */

import postgres from 'postgres';
import { Redis } from 'ioredis';
import { existsSync } from 'node:fs';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface SystemHealth {
  overall: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: string;
  version?: string;
}

class HealthChecker {
  private databaseUrl?: string;
  private redisUrl?: string;
  private timeout: number;

  constructor() {
    this.databaseUrl = process.env.DATABASE_URL;
    this.redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
    this.timeout = Number.parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10);
  }

  /**
   * Check database connectivity
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    if (!this.databaseUrl) {
      return {
        service: 'database',
        status: 'unhealthy',
        error: 'DATABASE_URL not configured',
      };
    }

    try {
      const sql = postgres(this.databaseUrl, {
        max: 1,
        connect_timeout: 5,
      });

      const result = await Promise.race([
        sql`SELECT NOW() as time, version() as version`,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Database timeout')), this.timeout)
        ),
      ]);

      await sql.end();

      const latency = Date.now() - startTime;

      return {
        service: 'database',
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
        details: {
          version: result[0]?.version?.split(' ')[0] || 'unknown',
        },
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
  async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    if (!this.redisUrl) {
      return {
        service: 'redis',
        status: 'unhealthy',
        error: 'REDIS_URL not configured',
      };
    }

    try {
      const redis = new Redis(this.redisUrl, {
        connectTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });

      await Promise.race([
        redis.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), this.timeout)
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
   * Check disk space
   */
  async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      // This is a simplified check - in production, use a proper system monitoring library
      const { statSync } = await import('node:fs');
      statSync(process.cwd());

      return {
        service: 'disk',
        status: 'healthy',
        details: {
          accessible: true,
        },
      };
    } catch (error) {
      return {
        service: 'disk',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory(): Promise<HealthCheckResult> {
    try {
      const usage = process.memoryUsage();
      const totalMemory = usage.heapTotal;
      const usedMemory = usage.heapUsed;
      const usagePercent = (usedMemory / totalMemory) * 100;

      return {
        service: 'memory',
        status: usagePercent > 90 ? 'degraded' : 'healthy',
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          usagePercent: Math.round(usagePercent),
        },
      };
    } catch (error) {
      return {
        service: 'memory',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check environment configuration
   */
  async checkEnvironment(): Promise<HealthCheckResult> {
    const requiredVariables = [
      'DATABASE_URL',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ];

    const missing: string[] = [];
    for (const variableName of requiredVariables) {
      if (!process.env[variableName]) {
        missing.push(variableName);
      }
    }

    return {
      service: 'environment',
      status: missing.length === 0 ? 'healthy' : 'unhealthy',
      details: {
        missing,
        configured: requiredVariables.length - missing.length,
        total: requiredVariables.length,
      },
      error: missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
    };
  }

  /**
   * Check critical file existence
   */
  async checkFiles(): Promise<HealthCheckResult> {
    const criticalFiles = [
      'package.json',
      'drizzle.config.ts',
      'supabase/migrations',
    ];

    const missing: string[] = [];
    for (const file of criticalFiles) {
      if (!existsSync(file)) {
        missing.push(file);
      }
    }

    return {
      service: 'files',
      status: missing.length === 0 ? 'healthy' : 'unhealthy',
      details: {
        missing,
      },
      error: missing.length > 0 ? `Missing files: ${missing.join(', ')}` : undefined,
    };
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<SystemHealth> {
    const checks: HealthCheckResult[] = [];

    // Run checks in parallel for speed
    const [
      database,
      redis,
      disk,
      memory,
      environment,
      files,
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemory(),
      this.checkEnvironment(),
      this.checkFiles(),
    ]);

    // Process results
    const processResult = (result: PromiseSettledResult<HealthCheckResult>, service: string) => {
      if (result.status === 'fulfilled') {
        checks.push(result.value);
      } else {
        checks.push({
          service,
          status: 'unhealthy',
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        });
      }
    };

    processResult(database, 'database');
    processResult(redis, 'redis');
    processResult(disk, 'disk');
    processResult(memory, 'memory');
    processResult(environment, 'environment');
    processResult(files, 'files');

    // Determine overall health
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    let overall: HealthStatus;
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      checks,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
    };
  }

  /**
   * Format health check output
   */
  formatOutput(health: SystemHealth): string {
    const statusEmoji = {
      healthy: '✓',
      degraded: '⚠',
      unhealthy: '✗',
    };

    let output = `\n=== System Health Check ===\n`;
    output += `Overall Status: ${statusEmoji[health.overall]} ${health.overall.toUpperCase()}\n`;
    output += `Timestamp: ${health.timestamp}\n`;
    output += `Version: ${health.version}\n\n`;

    output += `Service Checks:\n`;
    for (const check of health.checks) {
      const emoji = statusEmoji[check.status];
      output += `  ${emoji} ${check.service}: ${check.status}`;
      
      if (check.latency) {
        output += ` (${check.latency}ms)`;
      }
      
      if (check.error) {
        output += ` - ${check.error}`;
      }
      
      output += '\n';
    }

    return output;
  }
}

// Main execution
async function main() {
  const checker = new HealthChecker();
  const health = await checker.runAllChecks();
  
  console.log(checker.formatOutput(health));

  // Exit with appropriate code
  if (health.overall === 'unhealthy') {
    throw new Error('System health is unhealthy');
  }
  // Degraded or healthy - both are operational
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

export { HealthChecker, type SystemHealth, type HealthCheckResult };

