# Email Service

Email notification service for the e-commerce platform. Handles outgoing emails via SMTP using nodemailer.

## Overview

This service processes `notification.email` events from QStash and sends emails via SMTP. It supports multiple email templates and can run in mock mode if SMTP is not configured.

## Features

- **QStash Integration**: Receives events with signature verification
- **SMTP Support**: Sends emails via nodemailer with configurable SMTP settings
- **Mock Mode**: Falls back to logging when SMTP is not configured
- **Email Templates**: Extensible template system for different email types
- **Audit Logging**: Publishes audit events to analytics service
- **CORS Support**: Configurable CORS headers for cross-origin requests

## Port

Runs on port **3002** (both dev and production)

## Event Handling

### Incoming Events

- `notification.email` - Send email notification via SMTP

### Outgoing Events

- `analytics.audit` - Audit log for sent emails

## Email Templates

### order-confirmation

Sends order confirmation email with order details.

**Template Data:**
```typescript
{
  orderId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
}
```

## Environment Variables

See `.env.example` for all required environment variables:

- **QStash**: Token and signing keys for event verification
- **SMTP**: Email server configuration (host, port, user, password)
- **Service URLs**: Endpoints for publishing events
- **CORS**: Cross-origin configuration (optional)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Deployment

1. Create a new Vercel project for this service
2. Set all required environment variables in Vercel dashboard
3. Deploy the service
4. Configure QStash to route `notification.email` events to `/api/webhook`

## API Endpoints

### GET /api/webhook

Health check endpoint. Returns service status and configuration.

**Response:**
```json
{
  "status": "healthy",
  "service": "email",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "smtpConfigured": true,
  "mockMode": false
}
```

### POST /api/webhook

Main webhook endpoint for receiving QStash events.

**Headers:**
- `upstash-signature`: QStash signature for verification
- `x-event-type`: Event type identifier
- `x-event-id`: Unique event ID

**Body:**
```json
{
  "eventId": "uuid",
  "eventType": "notification.email",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0",
  "source": "orders-service",
  "correlationId": "uuid",
  "payload": {
    "to": "customer@example.com",
    "subject": "Order Confirmation",
    "templateId": "order-confirmation",
    "templateData": {
      "orderId": "uuid",
      "customerName": "John Doe",
      "items": [...],
      "totalAmount": 99.99
    },
    "priority": "high"
  }
}
```

## Adding New Templates

To add a new email template:

1. Add the template to the `emailTemplates` registry in `app/api/webhook/route.ts`
2. Create renderer functions for text and HTML versions
3. Define the subject line generator

Example:

```typescript
const emailTemplates = {
  'my-template': {
    subject: (data) => `Subject - ${data.field}`,
    text: renderMyTemplateText,
    html: renderMyTemplateHtml,
  },
};

function renderMyTemplateText(data: Record<string, unknown>): string {
  return `Plain text version of email`;
}

function renderMyTemplateHtml(data: Record<string, unknown>): string {
  return `<html>HTML version of email</html>`;
}
```

## Architecture

The service follows a serverless event-driven architecture:

1. QStash publishes `notification.email` events to the webhook
2. Service verifies QStash signature
3. Service renders email using appropriate template
4. Service sends email via SMTP (or logs in mock mode)
5. Service publishes audit event to analytics service

## Dependencies

- **@upstash/qstash**: QStash SDK for event handling
- **nodemailer**: SMTP client for sending emails
- **next**: Next.js framework
- **react**: React library
- **typescript**: TypeScript support

## Notes

- Service automatically detects mock mode if SMTP is not configured
- All events are logged with correlation IDs for tracing
- CORS headers are applied to all responses
- Email templates support both plain text and HTML formats
