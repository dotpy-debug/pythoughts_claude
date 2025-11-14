/**
 * Readiness Probe Endpoint
 *
 * Checks if the application is ready to serve traffic
 * Verifies critical dependencies (database, Redis, etc.)
 */

import { NextResponse } from 'next/server';
import postgres from 'postgres';

export const dynamic = 'force-dynamic';

/**
 * Quick database connectivity check
 */
async function checkDatabaseReady(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return false;
  }

  try {
    const sql = postgres(databaseUrl, {
      max: 1,
      connect_timeout: 3,
    });

    await Promise.race([
      sql`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      ),
    ]);

    await sql.end();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check environment variables
 */
function checkEnvironmentReady(): boolean {
  const required = ['DATABASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  return required.every(v => !!process.env[v]);
}

export async function GET() {
  try {
    const [databaseReady, environmentReady] = await Promise.all([
      checkDatabaseReady(),
      Promise.resolve(checkEnvironmentReady()),
    ]);

    const criticalReady = databaseReady && environmentReady;

    if (!criticalReady) {
      return NextResponse.json(
        {
          status: 'not ready',
          reason: 'Critical services unavailable',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

