# QStash Migration Guide

This document explains the migration from Kafka to Upstash QStash and how to use the new event-driven architecture.

## Why QStash?

**Previous Architecture (Kafka):**
- ❌ Required Docker containers (Kafka + Zookeeper)
- ❌ Complex setup and maintenance
- ❌ Persistent connections not serverless-friendly
- ❌ Manual topic and consumer group management
- ❌ High operational overhead

**New Architecture (QStash):**
- ✅ Serverless HTTP-based message queue
- ✅ No infrastructure to manage
- ✅ Simple webhook-based consumption
- ✅ Built-in retries and DLQ
- ✅ At-least-once delivery guarantees
- ✅ Native HTTPS support
- ✅ Perfect for serverless platforms (Vercel, AWS Lambda, etc.)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Next.js Application                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │          API Routes (Producers)                   │  │
│  │  /api/checkout → publishCheckoutCommand()        │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
                      ▼
          ┌─────────────────────┐
          │   Upstash QStash    │
          │  (Message Queue)    │
          └─────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Commands │   │  Orders  │   │  Emails  │
│ Webhook  │   │ Webhook  │   │ Webhook  │
└──────────┘   └──────────┘   └──────────┘
```

## Topics (Webhook Endpoints)

QStash doesn't have native "topics" like Kafka, but we simulate them using different webhook URLs:

| Topic | Webhook URL | Purpose |
|-------|------------|---------|
| **commands** | `/api/webhooks/commands` | Checkout commands, inventory reservations |
| **orders** | `/api/webhooks/orders` | Order lifecycle events |
| **notifications** | `/api/webhooks/notifications` | Email, push, SMS notifications |
| **inventory** | `/api/webhooks/inventory` | Stock updates, low stock alerts |
| **analytics** | `/api/webhooks/analytics` | Audit logs, metrics, DLQ |

## Setup Instructions

### 1. Get QStash Credentials

1. Sign up at [Upstash Console](https://console.upstash.com/)
2. Navigate to QStash section
3. Copy your credentials:
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
# Upstash QStash
QSTASH_TOKEN=eyJxxx...
QSTASH_CURRENT_SIGNING_KEY=sig_xxx...
QSTASH_NEXT_SIGNING_KEY=sig_yyy...
QSTASH_WEBHOOK_BASE_URL=https://your-domain.com
```

**Development Setup:**
For local development, you'll need to expose your localhost to the internet:

```bash
# Using ngrok (recommended)
ngrok http 3000

# Then set QSTASH_WEBHOOK_BASE_URL to the ngrok URL
QSTASH_WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

### 3. Start the Application

```bash
npm run dev
```

No need to start Kafka containers! 🎉

## Publishing Events

### Basic Usage

```typescript
import { publishCheckoutCommand } from '@/lib/qstash-producer';

// Publish a checkout command
await publishCheckoutCommand({
  userId: 'user_123',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerAddress: '123 Main St',
  items: [
    { productId: 'prod_1', quantity: 2, price: 29.99 }
  ],
  totalAmount: 59.98,
  paymentId: 'pay_abc123',
}, 'correlation_id_optional');
```

### Available Publishers

All publishers are in `lib/qstash-producer.ts`:

```typescript
// Commands
publishCheckoutCommand(payload, correlationId?)

// Orders
publishOrderCreated(payload, correlationId?)

// Notifications
publishEmailNotification(payload, correlationId?)

// Inventory
publishStockUpdate(payload, correlationId?)

// Analytics
publishAuditLog(payload, correlationId?)
```

### Low-Level API

For custom events:

```typescript
import { publishEvent, TOPICS } from '@/lib/qstash-producer';

await publishEvent(TOPICS.COMMANDS, {
  eventId: 'evt_123',
  eventType: 'command.custom',
  timestamp: new Date().toISOString(),
  version: '1.0',
  source: 'my-service',
  payload: { /* your data */ }
}, {
  delay: 60, // Optional: delay in seconds
  retries: 5 // Optional: number of retries (default: 3)
});
```

## Consuming Events (Webhooks)

### Webhook Structure

All webhooks follow the same pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashSignature, getEventMetadata } from '@/lib/qstash-webhook';
import { processWithDeduplication } from '@/lib/deduplication';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify signature
    const event = await verifyQStashSignature<YourEventType>(request);
    const metadata = getEventMetadata(request);

    // 2. Process with deduplication
    const { processed } = await processWithDeduplication(event.eventId, async () => {
      // Your processing logic here
      await handleEvent(event);
    });

    // 3. Return success
    return NextResponse.json({
      success: true,
      eventId: event.eventId,
      duplicate: !processed,
    });
  } catch (error) {
    // 4. Return 500 to trigger retry
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}
```

### Signature Verification

QStash signs all webhook requests to prevent spoofing:

```typescript
import { verifyQStashSignature } from '@/lib/qstash-webhook';

// Automatically verifies signature using signing keys from env vars
const event = await verifyQStashSignature<MyEventType>(request);
// Throws error if signature is invalid
```

### Deduplication

QStash provides at-least-once delivery, so events may be delivered multiple times:

```typescript
import { processWithDeduplication } from '@/lib/deduplication';

const { processed } = await processWithDeduplication(event.eventId, async () => {
  // This code only runs once per eventId
  await createOrder(event.payload);
});

if (!processed) {
  console.log('Event already processed (duplicate)');
}
```

Deduplication uses Redis with 1-hour TTL. Events are tracked by `eventId`.

## Event Flow Example

### Checkout Flow

1. **User clicks "Checkout"**
   ```
   POST /api/checkout
   ```

2. **Checkout API validates and publishes command**
   ```typescript
   await publishCheckoutCommand({
     userId, items, totalAmount, paymentId
   });
   // Returns immediately (async processing)
   ```

3. **QStash delivers to Commands Webhook**
   ```
   POST /api/webhooks/commands
   Headers:
     upstash-signature: xxx
     x-event-type: command.checkout
   ```

4. **Commands Webhook processes checkout**
   - Creates order in database
   - Decrements stock
   - Publishes `order.created` event
   - Publishes `notification.email` event
   - Publishes `inventory.stock.updated` event

5. **QStash delivers to Notifications Webhook**
   ```
   POST /api/webhooks/notifications
   ```

6. **Notifications Webhook sends email**
   - Renders email template
   - Sends via SMTP
   - Publishes audit log

## Retry Logic

QStash automatically retries failed webhooks with exponential backoff:

- **Default retries:** 3 attempts
- **Backoff:** Exponential (1s, 2s, 4s, ...)
- **Max delay:** Configurable
- **DLQ:** Failed events after max retries go to analytics topic

To trigger a retry, return HTTP 500:

```typescript
return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
```

To prevent retries (permanent failure), return HTTP 200 or 400:

```typescript
return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
```

## Monitoring

### QStash Console

View real-time message delivery status in the [Upstash Console](https://console.upstash.com/):

- Message count and throughput
- Success/failure rates
- Retry attempts
- DLQ messages

### Application Logs

All webhooks log processing status:

```
[Commands Webhook] Received command.checkout (retry: 0)
[Commands Webhook] Processing checkout for user user_123, payment pay_abc
[Commands Webhook] Order ord_xyz created successfully
[Commands Webhook] Published order.created for order ord_xyz
```

### Deduplication Tracking

Duplicate events are logged:

```
[Deduplication] Event evt_123 already processed, skipping
[Commands Webhook] Event evt_123 was already processed (duplicate)
```

## Performance Optimizations

### 1. Async Event Publishing

Events are published asynchronously without blocking the API response:

```typescript
// Checkout API returns immediately
await publishCheckoutCommand(payload);
return apiSuccess({ paymentId });
// Order creation happens asynchronously via webhook
```

### 2. Parallel Webhooks

Multiple webhooks can process events in parallel:

```typescript
// These events are delivered concurrently
await Promise.all([
  publishOrderCreated(order),
  publishEmailNotification(email),
  publishStockUpdate(stock)
]);
```

### 3. Redis Deduplication

Uses Redis `EXISTS` (O(1)) for fast duplicate detection:

```typescript
const exists = await redis.exists(`webhook:dedup:${eventId}`);
// < 1ms latency for most cases
```

### 4. Database Transactions

Order creation uses transactions for consistency:

```typescript
await drizzleDb.transaction(async (tx) => {
  // Create order + items + update stock
  // All-or-nothing guarantee
});
```

## Testing

### Local Testing (without deployment)

Use [Requestin](https://requestin.com/) or similar service:

1. Install requestin: `npx requestin`
2. Get webhook URL: `https://xxx.requestin.com`
3. Set `QSTASH_WEBHOOK_BASE_URL` to that URL
4. View incoming webhooks in requestin dashboard

### Manual Event Triggering

For testing, you can bypass QStash and POST directly:

```bash
curl -X POST http://localhost:3000/api/webhooks/commands \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "test_123",
    "eventType": "command.checkout",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0",
    "source": "test",
    "payload": {
      "userId": "user_1",
      "customerName": "Test User",
      "customerEmail": "test@example.com",
      "customerAddress": "123 Test St",
      "items": [],
      "totalAmount": 0,
      "paymentId": "pay_test"
    }
  }'
```

**Note:** Signature verification will fail in development. Set `NODE_ENV=development` to skip verification.

## Migration from Kafka

### Changes Made

1. ✅ Removed Kafka + Zookeeper from `docker-compose.yml`
2. ✅ Removed service scripts from `package.json`
3. ✅ Created QStash client (`lib/qstash.ts`)
4. ✅ Created QStash producer (`lib/qstash-producer.ts`)
5. ✅ Created webhook verification (`lib/qstash-webhook.ts`)
6. ✅ Created deduplication logic (`lib/deduplication.ts`)
7. ✅ Converted services to webhooks (`app/api/webhooks/*`)
8. ✅ Updated checkout API to use QStash

### Backward Compatibility

Event types and payloads remain unchanged. Only the transport layer changed:

- ✅ Same event types (`command.checkout`, `order.created`, etc.)
- ✅ Same event payloads (TypeScript types in `services/shared/types.ts`)
- ✅ Same business logic (order creation, email sending, etc.)

### What to Remove

These files are no longer needed (kept for reference):

- `services/shared/kafka.ts`
- `services/shared/producer.ts`
- `services/shared/consumer.ts`
- `services/shared/admin.ts`
- `services/orders/index.ts`
- `services/email/index.ts`
- `services/logs/index.ts` (if exists)

You can safely delete the `services/` directory except `services/shared/types.ts`.

## Troubleshooting

### Webhook Not Receiving Events

1. Check `QSTASH_WEBHOOK_BASE_URL` is set correctly
2. Ensure your app is publicly accessible (use ngrok for local dev)
3. Verify webhook endpoint exists and returns 200
4. Check QStash console for delivery status

### Signature Verification Fails

1. Ensure `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` are set
2. Keys are rotated periodically - update from Upstash console
3. In development, set `NODE_ENV=development` to skip verification

### Duplicate Events

This is expected with at-least-once delivery. Deduplication handles it:

```typescript
const { processed } = await processWithDeduplication(event.eventId, async () => {
  // Idempotent processing
});
```

Ensure your processing logic is idempotent (safe to run multiple times).

### Redis Connection Issues

Deduplication requires Redis:

```bash
# Local development
docker-compose up redis

# Production
# Use Upstash Redis or similar managed service
```

On Redis failure, webhooks still process but may not detect duplicates.

## Best Practices

1. **Idempotent Processing**: Always use `processWithDeduplication()`
2. **Return 500 on Retry**: Return HTTP 500 for transient errors
3. **Return 400 on Invalid Data**: Return HTTP 400 to prevent retries
4. **Log Everything**: Use structured logging for debugging
5. **Monitor QStash Console**: Watch delivery metrics and DLQ
6. **Set Webhook Timeout**: Use `export const maxDuration = 30` in routes
7. **Use Transactions**: Wrap database operations in transactions
8. **Test Locally**: Use ngrok or requestin for local testing

## Further Reading

- [QStash Documentation](https://upstash.com/docs/qstash/overall/getstarted)
- [QStash SDK Reference](https://upstash.com/docs/qstash/sdks/typescript/overview)
- [Webhook Best Practices](https://upstash.com/docs/qstash/howto/signature)

## Support

- **QStash Issues**: [Upstash Discord](https://discord.gg/upstash)
- **Application Issues**: Check logs and QStash console
- **General Questions**: See main README.md
