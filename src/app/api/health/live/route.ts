/**
 * Liveness Probe Endpoint
 *
 * Simple endpoint for Kubernetes/container liveness checks
 * Returns 200 if the application is running
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

