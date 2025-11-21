/**
 * Health check endpoint for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/db';
import { getQueueMetrics } from '@/lib/queue';

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const dbHealthy = await testConnection();
    
    // Get queue metrics
    const queueMetrics = await getQueueMetrics();
    
    // Overall health status
    const healthy = dbHealthy;
    
    return NextResponse.json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        queue: 'healthy', // Queue is healthy if we can get metrics
      },
      metrics: {
        queue: queueMetrics,
      },
    }, {
      status: healthy ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503,
    });
  }
}
