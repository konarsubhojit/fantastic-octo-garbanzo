# Analytics Service

A logging and monitoring service that receives and processes analytics events for business intelligence, auditing, and error tracking.

## Overview

The Analytics Service is a centralized logging service that handles:
- **Audit Logs** - Track user actions and system changes for compliance
- **Business Metrics** - Monitor KPIs and performance indicators
- **Dead Letter Queue Events** - Capture and analyze failed event processing

## Features

- ✅ Real-time event logging
- ✅ Multiple event type support
- ✅ CORS-enabled webhook endpoint
- ✅ Health check endpoint
- ✅ Structured logging for analysis

## Supported Events

### `analytics.audit`
Logs audit entries for compliance and security tracking.

**Payload Example:**
```json
{
  "eventType": "analytics.audit",
  "action": "user.login",
  "userId": "user-123",
  "resource": "authentication",
  "details": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### `analytics.metric`
Logs business metrics for performance monitoring.

**Payload Example:**
```json
{
  "eventType": "analytics.metric",
  "metric": "order.revenue",
  "value": 129.99,
  "unit": "USD",
  "tags": {
    "category": "electronics",
    "region": "US"
  }
}
```

### `analytics.dlq`
Logs dead letter queue events for error tracking.

**Payload Example:**
```json
{
  "eventType": "analytics.dlq",
  "originalEvent": "order.created",
  "error": "Database connection timeout",
  "attempts": 3,
  "failedAt": "2024-01-15T10:30:00Z"
}
```

## API Endpoints

### POST /api/webhook
Receives and logs analytics events.

**Headers:**
- `Content-Type: application/json`
- `X-Event-Type: analytics.*` (optional, can be in body)
- `Upstash-Signature: ...` (for QStash verification)

**Response:**
```json
{
  "success": true,
  "message": "Event logged successfully",
  "eventType": "analytics.audit",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/webhook
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Environment Variables

```env
# QStash Configuration (for signature verification)
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-current-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key

# Service URLs
QSTASH_ANALYTICS_URL=https://analytics-service.vercel.app/api/webhook

# CORS Configuration
CORS_ALLOWED_ORIGINS=*
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,Upstash-Signature
CORS_MAX_AGE=86400
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

The service runs on port **3004** by default.

## Architecture

### Event Flow
1. Event received at `/api/webhook`
2. CORS headers applied
3. Event type identified
4. Event logged with structured format
5. Success response returned

### Logging Strategy
- All events logged to console with structured format
- Each event type has dedicated logging function
- Timestamps and correlation IDs included
- Visual separators for readability

## Integration

Send events to the Analytics Service from other services:

```typescript
import { publishEvent } from '@/services/qstash/publisher';

// Log an audit entry
await publishEvent('analytics.audit', {
  action: 'order.created',
  userId: 'user-123',
  resource: 'orders',
  details: { orderId: 'order-456' }
});

// Log a business metric
await publishEvent('analytics.metric', {
  metric: 'order.total',
  value: 299.99,
  unit: 'USD',
  tags: { category: 'premium' }
});

// Log a DLQ event
await publishEvent('analytics.dlq', {
  originalEvent: 'order.created',
  error: 'Validation failed',
  attempts: 3
});
```

## Future Enhancements

- Database persistence for historical analysis
- Dashboard UI for real-time monitoring
- Alert system for critical events
- Data aggregation and reporting
- Export functionality (CSV, JSON)
- Integration with external analytics platforms

## License

MIT
