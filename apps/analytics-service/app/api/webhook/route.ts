import { NextRequest } from 'next/server';
import { corsResponse, handleCorsPreflightRequest } from '@/services/shared/cors';

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

// GET handler for health check
export async function GET(request: NextRequest) {
  return corsResponse(
    { 
      status: 'healthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
    },
    200,
    request
  );
}

// POST handler for webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.eventType || request.headers.get('X-Event-Type');
    
    console.log('='.repeat(80));
    console.log('Analytics Event Received:', {
      eventType,
      timestamp: new Date().toISOString(),
      eventId: body.eventId || request.headers.get('X-Event-Id'),
      correlationId: body.correlationId || request.headers.get('X-Correlation-Id'),
    });

    // Handle different event types
    switch (eventType) {
      case 'analytics.audit':
        logAuditEntry(body);
        break;
      
      case 'analytics.metric':
        logMetric(body);
        break;
      
      case 'analytics.dlq':
        logDLQEvent(body);
        break;
      
      default:
        console.log('Unknown event type:', eventType);
        console.log('Event data:', JSON.stringify(body, null, 2));
    }

    console.log('='.repeat(80));

    return corsResponse(
      {
        success: true,
        message: 'Event logged successfully',
        eventType,
        timestamp: new Date().toISOString(),
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return corsResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
      request
    );
  }
}

// Type definitions
interface AuditEntry {
  action?: string;
  userId?: string;
  user?: string;
  resource?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MetricEntry {
  metric?: string;
  name?: string;
  value?: number | string;
  unit?: string;
  tags?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DLQEntry {
  originalEvent?: string;
  error?: string;
  attempts?: number;
  retryCount?: number;
  failedAt?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// Log audit entries
function logAuditEntry(body: AuditEntry) {
  console.log('📋 AUDIT LOG ENTRY');
  console.log('Action:', body.action || 'N/A');
  console.log('User:', body.userId || body.user || 'N/A');
  console.log('Resource:', body.resource || 'N/A');
  console.log('Details:', JSON.stringify(body.details || body, null, 2));
}

// Log business metrics
function logMetric(body: MetricEntry) {
  console.log('📊 BUSINESS METRIC');
  console.log('Metric:', body.metric || body.name || 'N/A');
  console.log('Value:', body.value || 'N/A');
  console.log('Unit:', body.unit || 'N/A');
  console.log('Tags:', JSON.stringify(body.tags || {}, null, 2));
  console.log('Data:', JSON.stringify(body, null, 2));
}

// Log dead letter queue events
function logDLQEvent(body: DLQEntry) {
  console.log('⚠️ DEAD LETTER QUEUE EVENT');
  console.log('Original Event:', body.originalEvent || 'N/A');
  console.log('Error:', body.error || 'N/A');
  console.log('Attempts:', body.attempts || body.retryCount || 'N/A');
  console.log('Failed At:', body.failedAt || body.timestamp || new Date().toISOString());
  console.log('Full Details:', JSON.stringify(body, null, 2));
}
