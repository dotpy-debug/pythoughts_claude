# Performance Monitoring & Observability

**Date**: 2025-10-16
**Phase**: Production Readiness Phase 3 - Performance & Optimization
**Status**: Implementation Ready

---

## Executive Summary

This document provides a comprehensive performance monitoring strategy for the Pythoughts application, covering query performance, cache metrics, application health, and production observability. The goal is to **proactively identify performance issues** before they impact users.

### Monitoring Pillars

1. **Database Performance**: Query execution times, slow query detection, index usage
2. **Cache Performance**: Hit rates, miss rates, invalidation patterns
3. **Application Performance**: Response times, error rates, throughput
4. **Infrastructure**: Redis health, PostgreSQL health, server resources
5. **User Experience**: Real user monitoring (RUM), Core Web Vitals

---

## Table of Contents

1. [Query Performance Monitoring](#1-query-performance-monitoring)
2. [Cache Performance Tracking](#2-cache-performance-tracking)
3. [Application Metrics](#3-application-metrics)
4. [Performance Dashboards](#4-performance-dashboards)
5. [Alerting Strategy](#5-alerting-strategy)
6. [Production Setup](#6-production-setup)

---

## 1. Query Performance Monitoring

### Query Logging Middleware

**Create**: `src/lib/query-monitor.ts`

```typescript
import { logger } from './logger';

export interface QueryMetrics {
  query: string;
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  executionTime: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  rowCount?: number;
}

class QueryMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 100; // ms
  private readonly MAX_METRICS = 1000; // Keep last 1000 queries

  logQuery(metric: QueryMetrics) {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow queries
    if (metric.executionTime > this.SLOW_QUERY_THRESHOLD) {
      logger.warn('Slow query detected', {
        table: metric.table,
        operation: metric.operation,
        executionTime: `${metric.executionTime}ms`,
        query: metric.query.substring(0, 200), // Truncate long queries
      });
    }

    // Log failed queries
    if (!metric.success) {
      logger.error('Query failed', {
        table: metric.table,
        operation: metric.operation,
        error: metric.error,
        query: metric.query.substring(0, 200),
      });
    }
  }

  getStats() {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;
    const slowQueries = this.metrics.filter(
      m => m.executionTime > this.SLOW_QUERY_THRESHOLD
    ).length;

    const avgExecutionTime = total > 0
      ? this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / total
      : 0;

    const byTable = this.metrics.reduce((acc, m) => {
      acc[m.table] = (acc[m.table] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byOperation = this.metrics.reduce((acc, m) => {
      acc[m.operation] = (acc[m.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalQueries: total,
      successfulQueries: successful,
      failedQueries: failed,
      slowQueries,
      avgExecutionTime: Math.round(avgExecutionTime),
      queriesByTable: byTable,
      queriesByOperation: byOperation,
      slowestQueries: this.getSlowestQueries(10),
    };
  }

  getSlowestQueries(limit: number = 10): QueryMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const queryMonitor = new QueryMonitor();

/**
 * Wrapper function to monitor Supabase queries
 */
export async function monitoredQuery<T>(
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  const startTime = performance.now();
  let result: { data: T | null; error: any };

  try {
    result = await queryFn();
    const executionTime = Math.round(performance.now() - startTime);

    queryMonitor.logQuery({
      query: `${operation} from ${table}`,
      table,
      operation,
      executionTime,
      timestamp: new Date(),
      success: !result.error,
      error: result.error?.message,
      rowCount: Array.isArray(result.data) ? result.data.length : undefined,
    });

    return result;
  } catch (error) {
    const executionTime = Math.round(performance.now() - startTime);

    queryMonitor.logQuery({
      query: `${operation} from ${table}`,
      table,
      operation,
      executionTime,
      timestamp: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
```

### Usage Example

**Before** (no monitoring):
```typescript
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('post_type', 'news');
```

**After** (with monitoring):
```typescript
import { monitoredQuery } from '@/lib/query-monitor';

const { data, error } = await monitoredQuery('posts', 'select', () =>
  supabase
    .from('posts')
    .select('*')
    .eq('post_type', 'news')
);
```

### Query Stats API

**Create**: `src/app/api/query-stats/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { queryMonitor } from '@/lib/query-monitor';

export async function GET() {
  const stats = queryMonitor.getStats();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    metrics: stats,
  });
}

export async function DELETE() {
  queryMonitor.clearMetrics();

  return NextResponse.json({
    message: 'Query metrics cleared',
    timestamp: new Date().toISOString(),
  });
}
```

**Access**: `GET /api/query-stats`

**Example Response**:
```json
{
  "timestamp": "2025-10-16T12:34:56.789Z",
  "metrics": {
    "totalQueries": 542,
    "successfulQueries": 538,
    "failedQueries": 4,
    "slowQueries": 23,
    "avgExecutionTime": 45,
    "queriesByTable": {
      "posts": 234,
      "comments": 156,
      "votes": 89,
      "reactions": 63
    },
    "queriesByOperation": {
      "select": 489,
      "insert": 32,
      "update": 15,
      "delete": 6
    },
    "slowestQueries": [
      {
        "query": "select from posts",
        "table": "posts",
        "operation": "select",
        "executionTime": 247,
        "timestamp": "2025-10-16T12:30:15.123Z",
        "success": true,
        "rowCount": 150
      }
    ]
  }
}
```

---

## 2. Cache Performance Tracking

### Enhanced Cache Metrics

**Update**: `src/lib/redis.ts` (already started in CACHING_STRATEGY.md)

```typescript
export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  totalRequests: number;
  hitsByKey: Record<string, number>;
  missesByKey: Record<string, number>;
  avgHitTime: number;
  avgMissTime: number;
}

class CacheMonitor {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalRequests: 0,
    hitsByKey: {},
    missesByKey: {},
    avgHitTime: 0,
    avgMissTime: 0,
  };

  private hitTimes: number[] = [];
  private missTimes: number[] = [];

  recordHit(key: string, time: number) {
    this.metrics.hits++;
    this.metrics.totalRequests++;
    this.metrics.hitsByKey[key] = (this.metrics.hitsByKey[key] || 0) + 1;

    this.hitTimes.push(time);
    if (this.hitTimes.length > 100) this.hitTimes.shift();

    this.metrics.avgHitTime = this.hitTimes.reduce((a, b) => a + b, 0) / this.hitTimes.length;
  }

  recordMiss(key: string, time: number) {
    this.metrics.misses++;
    this.metrics.totalRequests++;
    this.metrics.missesByKey[key] = (this.metrics.missesByKey[key] || 0) + 1;

    this.missTimes.push(time);
    if (this.missTimes.length > 100) this.missTimes.shift();

    this.metrics.avgMissTime = this.missTimes.reduce((a, b) => a + b, 0) / this.missTimes.length;
  }

  recordError(key: string) {
    this.metrics.errors++;
    this.metrics.totalRequests++;
  }

  getHitRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return Math.round((this.metrics.hits / this.metrics.totalRequests) * 100);
  }

  getStats(): CacheMetrics & { hitRate: number } {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
    };
  }

  getTopHitKeys(limit: number = 10): Array<{ key: string; hits: number }> {
    return Object.entries(this.metrics.hitsByKey)
      .map(([key, hits]) => ({ key, hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }

  getTopMissKeys(limit: number = 10): Array<{ key: string; misses: number }> {
    return Object.entries(this.metrics.missesByKey)
      .map(([key, misses]) => ({ key, misses }))
      .sort((a, b) => b.misses - a.misses)
      .slice(0, limit);
  }

  reset() {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
      hitsByKey: {},
      missesByKey: {},
      avgHitTime: 0,
      avgMissTime: 0,
    };
    this.hitTimes = [];
    this.missTimes = [];
  }
}

export const cacheMonitor = new CacheMonitor();

// Updated cacheGet with monitoring
export async function cacheGet<T>(key: string): Promise<T | null> {
  const startTime = performance.now();

  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    const executionTime = Math.round(performance.now() - startTime);

    if (cached) {
      cacheMonitor.recordHit(key, executionTime);
      logger.debug('[Cache] HIT', { key, time: `${executionTime}ms` });
      return JSON.parse(cached) as T;
    }

    cacheMonitor.recordMiss(key, executionTime);
    logger.debug('[Cache] MISS', { key, time: `${executionTime}ms` });
    return null;

  } catch (error) {
    cacheMonitor.recordError(key);
    logger.error('[Cache] ERROR', { key, error });
    return null;
  }
}
```

### Cache Stats API

**Create**: `src/app/api/cache-stats/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { cacheMonitor } from '@/lib/redis';

export async function GET() {
  const stats = cacheMonitor.getStats();
  const topHits = cacheMonitor.getTopHitKeys(10);
  const topMisses = cacheMonitor.getTopMissKeys(10);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    cache: {
      ...stats,
      topHitKeys: topHits,
      topMissKeys: topMisses,
    },
  });
}

export async function DELETE() {
  cacheMonitor.reset();

  return NextResponse.json({
    message: 'Cache metrics reset',
    timestamp: new Date().toISOString(),
  });
}
```

**Example Response**:
```json
{
  "timestamp": "2025-10-16T12:34:56.789Z",
  "cache": {
    "hits": 1842,
    "misses": 423,
    "errors": 3,
    "totalRequests": 2268,
    "avgHitTime": 2.4,
    "avgMissTime": 145.8,
    "hitRate": 81,
    "topHitKeys": [
      { "key": "posts:news:hot:1", "hits": 342 },
      { "key": "trending:posts:limit:20", "hits": 287 },
      { "key": "blogs:Tech:1", "hits": 156 }
    ],
    "topMissKeys": [
      { "key": "comments:thread:post-123", "misses": 89 },
      { "key": "reactions:post:post-456", "misses": 67 }
    ]
  }
}
```

---

## 3. Application Metrics

### Response Time Tracking

**Create**: `src/middleware/performance-monitor.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const SLOW_REQUEST_THRESHOLD = 1000; // ms

export interface RequestMetrics {
  path: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
}

class PerformanceMonitor {
  private metrics: RequestMetrics[] = [];
  private readonly MAX_METRICS = 500;

  recordRequest(metric: RequestMetrics) {
    this.metrics.push(metric);

    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    if (metric.duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        path: metric.path,
        method: metric.method,
        duration: `${metric.duration}ms`,
        statusCode: metric.statusCode,
      });
    }
  }

  getStats() {
    const total = this.metrics.length;
    const avgDuration = total > 0
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total
      : 0;

    const slowRequests = this.metrics.filter(
      m => m.duration > SLOW_REQUEST_THRESHOLD
    ).length;

    const byStatusCode = this.metrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const byPath = this.metrics.reduce((acc, m) => {
      acc[m.path] = (acc[m.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequests: total,
      avgDuration: Math.round(avgDuration),
      slowRequests,
      requestsByStatusCode: byStatusCode,
      requestsByPath: byPath,
      slowestRequests: this.getSlowestRequests(10),
    };
  }

  getSlowestRequests(limit: number = 10): RequestMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function performanceMiddleware(request: NextRequest) {
  const startTime = performance.now();

  return NextResponse.next({
    headers: {
      'X-Request-Start': startTime.toString(),
    },
  });
}

export function recordRequestMetrics(
  request: NextRequest,
  response: NextResponse,
  startTime: number
) {
  const duration = Math.round(performance.now() - startTime);

  performanceMonitor.recordRequest({
    path: request.nextUrl.pathname,
    method: request.method,
    duration,
    statusCode: response.status,
    timestamp: new Date(),
  });
}
```

**Update**: `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { performanceMiddleware, recordRequestMetrics } from './middleware/performance-monitor';

export function middleware(request: NextRequest) {
  const startTime = performance.now();
  const response = NextResponse.next();

  // Record performance metrics
  recordRequestMetrics(request, response, startTime);

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Performance Stats API

**Create**: `src/app/api/performance-stats/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/middleware/performance-monitor';

export async function GET() {
  const stats = performanceMonitor.getStats();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    performance: stats,
  });
}
```

---

## 4. Performance Dashboards

### Dashboard API Endpoint

**Create**: `src/app/api/dashboard/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { queryMonitor } from '@/lib/query-monitor';
import { cacheMonitor } from '@/lib/redis';
import { performanceMonitor } from '@/middleware/performance-monitor';

export async function GET() {
  const queryStats = queryMonitor.getStats();
  const cacheStats = cacheMonitor.getStats();
  const perfStats = performanceMonitor.getStats();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    queries: {
      total: queryStats.totalQueries,
      successful: queryStats.successfulQueries,
      failed: queryStats.failedQueries,
      slow: queryStats.slowQueries,
      avgExecutionTime: queryStats.avgExecutionTime,
    },
    cache: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      errors: cacheStats.errors,
      hitRate: cacheStats.hitRate,
      avgHitTime: Math.round(cacheStats.avgHitTime),
      avgMissTime: Math.round(cacheStats.avgMissTime),
    },
    requests: {
      total: perfStats.totalRequests,
      avgDuration: perfStats.avgDuration,
      slowRequests: perfStats.slowRequests,
    },
    health: {
      status: 'healthy',
      checks: {
        database: queryStats.failedQueries < 10,
        cache: cacheStats.errors < 5,
        performance: perfStats.slowRequests < 20,
      },
    },
  });
}
```

### Simple HTML Dashboard

**Create**: `src/app/dashboard/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  timestamp: string;
  uptime: number;
  queries: {
    total: number;
    successful: number;
    failed: number;
    slow: number;
    avgExecutionTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    errors: number;
    hitRate: number;
    avgHitTime: number;
    avgMissTime: number;
  };
  requests: {
    total: number;
    avgDuration: number;
    slowRequests: number;
  };
  health: {
    status: string;
    checks: {
      database: boolean;
      cache: boolean;
      performance: boolean;
    };
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  const getHealthColor = (healthy: boolean) =>
    healthy ? 'text-green-500' : 'text-red-500';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Performance Dashboard</h1>

      {/* Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Database Health</h3>
          <p className={`text-2xl font-bold ${getHealthColor(data.health.checks.database)}`}>
            {data.health.checks.database ? 'Healthy' : 'Degraded'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Failed queries: {data.queries.failed}
          </p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Cache Health</h3>
          <p className={`text-2xl font-bold ${getHealthColor(data.health.checks.cache)}`}>
            {data.health.checks.cache ? 'Healthy' : 'Degraded'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Hit rate: {data.cache.hitRate}%
          </p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Performance</h3>
          <p className={`text-2xl font-bold ${getHealthColor(data.health.checks.performance)}`}>
            {data.health.checks.performance ? 'Good' : 'Slow'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Avg response: {data.requests.avgDuration}ms
          </p>
        </div>
      </div>

      {/* Query Metrics */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">Database Queries</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Total Queries</p>
            <p className="text-2xl font-bold">{data.queries.total}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Successful</p>
            <p className="text-2xl font-bold text-green-500">{data.queries.successful}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Failed</p>
            <p className="text-2xl font-bold text-red-500">{data.queries.failed}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Slow Queries</p>
            <p className="text-2xl font-bold text-yellow-500">{data.queries.slow}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg Execution</p>
            <p className="text-2xl font-bold">{data.queries.avgExecutionTime}ms</p>
          </div>
        </div>
      </div>

      {/* Cache Metrics */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">Redis Cache</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Cache Hits</p>
            <p className="text-2xl font-bold text-green-500">{data.cache.hits}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Cache Misses</p>
            <p className="text-2xl font-bold text-yellow-500">{data.cache.misses}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Errors</p>
            <p className="text-2xl font-bold text-red-500">{data.cache.errors}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Hit Rate</p>
            <p className="text-2xl font-bold">{data.cache.hitRate}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg Hit Time</p>
            <p className="text-2xl font-bold">{data.cache.avgHitTime}ms</p>
          </div>
        </div>
      </div>

      {/* Request Metrics */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">HTTP Requests</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Total Requests</p>
            <p className="text-2xl font-bold">{data.requests.total}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Avg Duration</p>
            <p className="text-2xl font-bold">{data.requests.avgDuration}ms</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Slow Requests</p>
            <p className="text-2xl font-bold text-yellow-500">{data.requests.slowRequests}</p>
          </div>
        </div>
      </div>

      <p className="text-gray-500 text-sm mt-4">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </p>
    </div>
  );
}
```

**Access**: `http://localhost:3000/dashboard`

---

## 5. Alerting Strategy

### Alert Thresholds

```typescript
export const ALERT_THRESHOLDS = {
  // Database
  SLOW_QUERY_MS: 100,
  FAILED_QUERY_RATE: 0.05,  // 5%
  QUERY_RATE_PER_SECOND: 100,

  // Cache
  CACHE_HIT_RATE_MIN: 70,  // 70%
  CACHE_ERROR_RATE: 0.01,  // 1%

  // Performance
  SLOW_REQUEST_MS: 1000,
  ERROR_RATE: 0.02,  // 2%
  AVG_RESPONSE_MS: 500,

  // Infrastructure
  MEMORY_USAGE_MB: 500,
  CPU_USAGE_PERCENT: 80,
};
```

### Alert Handler

**Create**: `src/lib/alerts.ts`

```typescript
import { logger } from './logger';

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface Alert {
  level: AlertLevel;
  title: string;
  description: string;
  timestamp: Date;
  metrics?: Record<string, unknown>;
}

class AlertManager {
  private alerts: Alert[] = [];
  private readonly MAX_ALERTS = 100;

  trigger(alert: Alert) {
    this.alerts.push(alert);

    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.shift();
    }

    // Log based on severity
    switch (alert.level) {
      case 'critical':
        logger.error(alert.title, { ...alert, alerts: undefined });
        // TODO: Send to external monitoring service (Sentry, DataDog, etc.)
        break;
      case 'warning':
        logger.warn(alert.title, { ...alert, alerts: undefined });
        break;
      case 'info':
        logger.info(alert.title, { ...alert, alerts: undefined });
        break;
    }
  }

  getRecentAlerts(limit: number = 10): Alert[] {
    return this.alerts.slice(-limit).reverse();
  }

  clearAlerts() {
    this.alerts = [];
  }
}

export const alertManager = new AlertManager();

// Helper functions for common alerts
export function alertSlowQuery(table: string, executionTime: number) {
  alertManager.trigger({
    level: 'warning',
    title: 'Slow Query Detected',
    description: `Query on table "${table}" took ${executionTime}ms`,
    timestamp: new Date(),
    metrics: { table, executionTime },
  });
}

export function alertCacheMiss(key: string, missRate: number) {
  if (missRate > 50) {
    alertManager.trigger({
      level: 'warning',
      title: 'High Cache Miss Rate',
      description: `Cache key "${key}" has ${missRate}% miss rate`,
      timestamp: new Date(),
      metrics: { key, missRate },
    });
  }
}

export function alertLowCacheHitRate(hitRate: number) {
  if (hitRate < 70) {
    alertManager.trigger({
      level: 'critical',
      title: 'Low Cache Hit Rate',
      description: `Overall cache hit rate is ${hitRate}% (target: >70%)`,
      timestamp: new Date(),
      metrics: { hitRate },
    });
  }
}
```

---

## 6. Production Setup

### Environment Variables

**Add to `.env.production`**:

```bash
# Monitoring
ENABLE_QUERY_MONITORING=true
ENABLE_CACHE_MONITORING=true
ENABLE_PERFORMANCE_MONITORING=true
SLOW_QUERY_THRESHOLD_MS=100
SLOW_REQUEST_THRESHOLD_MS=1000

# External Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
LOGROCKET_APP_ID=your-logrocket-id
```

### Production Monitoring Checklist

- [ ] Enable query monitoring in production
- [ ] Set up cache hit rate tracking
- [ ] Configure slow query alerts
- [ ] Set up error tracking (Sentry/DataDog)
- [ ] Enable real user monitoring (LogRocket/FullStory)
- [ ] Create performance dashboard
- [ ] Configure alert thresholds
- [ ] Set up on-call rotation
- [ ] Document runbooks for common alerts
- [ ] Test alerting pipeline

### Recommended External Tools

1. **Sentry**: Error tracking and performance monitoring
2. **DataDog**: Infrastructure and APM monitoring
3. **LogRocket**: Session replay and frontend monitoring
4. **Vercel Analytics**: Next.js-specific metrics (if deploying to Vercel)
5. **Uptime Robot**: Uptime monitoring and alerting

---

## Summary

This monitoring setup provides:

- ✅ **Query Performance**: Track all database queries, identify slow queries
- ✅ **Cache Metrics**: Monitor hit rates, identify miss patterns
- ✅ **Application Performance**: Track request durations, error rates
- ✅ **Real-time Dashboard**: Visual overview of application health
- ✅ **Alerting**: Proactive notifications for performance issues

**Next Steps**:

1. Implement query monitoring wrapper
2. Enhance cache monitoring
3. Create performance dashboard
4. Set up alerting thresholds
5. Deploy to production with monitoring enabled

---

**Document Version**: 1.0
**Last Updated**: 2025-10-16
**Maintained By**: Performance & DevOps Team
