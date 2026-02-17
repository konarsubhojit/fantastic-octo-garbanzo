# Inventory Service

A lightweight Next.js service that receives and logs inventory-related events from QStash. This service is part of the event-driven microservices architecture.

## Purpose

The Inventory Service receives inventory events via QStash webhooks and logs them for monitoring and debugging. Unlike other services, it does not write to a database or publish events - it simply logs incoming inventory events.

## Supported Events

The service handles the following event types:

- **`inventory.stock.updated`** - Logs stock level changes
- **`inventory.stock.low`** - Logs low stock alerts
- **`inventory.stock.reserved`** - Logs stock reservations

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
# QStash Configuration (required)
QSTASH_TOKEN=your_qstash_token_here
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
QSTASH_URL=https://qstash.upstash.io/v2/publish

# CORS Configuration (optional)
ALLOWED_ORIGINS=*

# Public URLs
NEXT_PUBLIC_INVENTORY_SERVICE_URL=https://your-inventory-service.vercel.app
```

### Required Variables

- **`QSTASH_CURRENT_SIGNING_KEY`** - Current QStash signature verification key
- **`QSTASH_NEXT_SIGNING_KEY`** - Next QStash signature verification key (for key rotation)

### Optional Variables

- **`ALLOWED_ORIGINS`** - CORS allowed origins (default: `*`)
- **`NEXT_PUBLIC_INVENTORY_SERVICE_URL`** - Public URL of the service (for display)

## Running the Service

### Development Mode

```bash
npm run dev
```

The service runs on **port 3003** by default.

### Production Build

```bash
npm run build
npm run start
```

## API Endpoints

### Webhook Endpoint

**`POST /api/webhook`**

Receives inventory events from QStash and logs them.

**Headers:**
- `upstash-signature` - QStash signature for verification

**Response:**
```json
{
  "success": true,
  "message": "Stock update processed"
}
```

### Health Check

**`GET /api/webhook`**

Returns service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "inventory",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

## Architecture

This service is intentionally simple:
- Receives events via QStash webhooks
- Verifies QStash signatures for security
- Logs event details to console
- No database writes
- No event publishing

## Development

The service follows the same patterns as other services in the monorepo:
- Uses shared types from `@/services/shared/types`
- Uses shared CORS utilities from `@/services/shared/cors`
- Integrates with QStash for event delivery
- Supports CORS for cross-origin requests

## Logging

All events are logged with structured data including:
- Event ID
- Event type
- Timestamp
- Correlation ID
- Full payload

View logs during development:
```bash
npm run dev
```

Watch for log entries prefixed with `[Inventory Service]`.
