import { NextResponse } from 'next/server';

/**
 * CORS Configuration for Services
 * 
 * Configurable through environment variables:
 * - CORS_ALLOWED_ORIGINS: Comma-separated list of allowed origins (default: *)
 * - CORS_ALLOWED_METHODS: Comma-separated list of allowed methods (default: GET,POST,PUT,DELETE,OPTIONS)
 * - CORS_ALLOWED_HEADERS: Comma-separated list of allowed headers
 * - CORS_MAX_AGE: Preflight cache duration in seconds (default: 86400)
 */

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  maxAge: number;
}

export function getCorsConfig(): CorsConfig {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['*'];

  const allowedMethods = process.env.CORS_ALLOWED_METHODS
    ? process.env.CORS_ALLOWED_METHODS.split(',').map(m => m.trim())
    : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

  const allowedHeaders = process.env.CORS_ALLOWED_HEADERS
    ? process.env.CORS_ALLOWED_HEADERS.split(',').map(h => h.trim())
    : [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Upstash-Signature',
        'X-Event-Type',
        'X-Event-Id',
        'X-Correlation-Id',
      ];

  const maxAge = process.env.CORS_MAX_AGE
    ? parseInt(process.env.CORS_MAX_AGE, 10)
    : 86400; // 24 hours

  return {
    allowedOrigins,
    allowedMethods,
    allowedHeaders,
    maxAge,
  };
}

/**
 * Apply CORS headers to a response
 */
export function applyCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  const config = getCorsConfig();

  // Check if origin is allowed
  const allowedOrigin = config.allowedOrigins.includes('*')
    ? '*'
    : config.allowedOrigins.find(o => o === origin) || config.allowedOrigins[0];

  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightRequest(request: Request): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(response, origin);
}

/**
 * Wrap a response with CORS headers
 */
export function corsResponse(data: unknown, status: number, request: Request): NextResponse {
  const origin = request.headers.get('origin');
  const response = NextResponse.json(data, { status });
  return applyCorsHeaders(response, origin);
}
