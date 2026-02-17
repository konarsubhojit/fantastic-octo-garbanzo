# Microservices

This directory contains independently deployable microservices for the e-commerce platform. Each service is a standalone Next.js application that can be deployed separately to serverless platforms like Vercel, AWS Lambda, or Google Cloud Run.

## Architecture

The platform uses **Upstash QStash** for serverless event-driven communication between services:

```
Main App (checkout) → QStash → Orders Service → QStash → Email/Inventory/Analytics Services
```

## Services

### 1. **Orders Service** (`apps/orders-service`)
- **Port**: 3001
- **Purpose**: Processes checkout commands and creates orders
- **Events Consumed**: `command.checkout`
- **Events Published**: `order.created`, `notification.email`, `inventory.stock.updated`, `analytics.audit`

### 2. **Email Service** (`apps/email-service`)
- **Port**: 3002
- **Purpose**: Sends email notifications via SMTP
- **Events Consumed**: `notification.email`
- **Events Published**: `analytics.audit`

### 3. **Inventory Service** (`apps/inventory-service`)
- **Port**: 3003
- **Purpose**: Manages product inventory and stock levels
- **Events Consumed**: `inventory.stock.updated`
- **Events Published**: `analytics.audit`

### 4. **Analytics Service** (`apps/analytics-service`)
- **Port**: 3004
- **Purpose**: Centralized logging and monitoring for audit logs, metrics, and errors
- **Events Consumed**: `analytics.audit`, `analytics.metric`, `analytics.dlq`
- **Events Published**: None (logging only)

## Deployment

Each service can be deployed independently:

### Vercel Deployment

```bash
# Deploy orders service
cd apps/orders-service
vercel

# Deploy email service
cd apps/email-service
vercel

# Deploy inventory service
cd apps/inventory-service
vercel

# Deploy analytics service
cd apps/analytics-service
vercel
```

For additional services, follow the same deployment pattern.

### Environment Variables

Each service requires:
- Database credentials (shared with main app)
- QStash credentials (for authentication and publishing)
- Service URLs (for inter-service communication)
- CORS configuration (for cross-origin requests)

See individual `.env.example` files in each service directory.

## Local Development

Run all services locally:

```bash
# Terminal 1: Orders Service
cd apps/orders-service
npm install
npm run dev

# Terminal 2: Email Service
cd apps/email-service
npm install
npm run dev

# Terminal 3: Inventory Service
cd apps/inventory-service
npm install
npm run dev

# Terminal 4: Analytics Service
cd apps/analytics-service
npm install
npm run dev

# Terminal 5: Main App
cd ../..  # back to root
npm run dev
```

For additional services, add more terminals following the same pattern.

Or use a process manager like `concurrently` or `pm2`:

```bash
# Install concurrently
npm install -g concurrently

# Run all services
concurrently \
  "cd apps/orders-service && npm run dev" \
  "cd apps/email-service && npm run dev" \
  "cd apps/inventory-service && npm run dev" \
  "cd apps/analytics-service && npm run dev" \
  "npm run dev"
```

## Shared Code

Shared types and utilities are located in the repository root:
- `services/shared/types.ts` - Event type definitions
- `services/shared/qstash.ts` - QStash client configuration
- `services/shared/producer.ts` - Event publishing utilities
- `services/shared/cors.ts` - CORS configuration helper
- `lib/` - Database schema and utilities

Each service references these via TypeScript path aliases configured in `tsconfig.json`.

## Scaling Strategy

### Horizontal Scaling
Each service auto-scales independently based on load. Serverless platforms handle this automatically.

### Independent Updates
Deploy services independently without affecting others. QStash ensures reliable message delivery even during deployments.

### Cost Optimization
- **Orders Service**: High traffic during checkout - provision more resources
- **Email Service**: Burst traffic after orders - handle async
- **Inventory/Analytics**: Low traffic - minimal resources

## Monitoring

Add monitoring to each service:
- Health check endpoint: `GET /api/webhook`
- QStash dashboard: Monitor message delivery
- Service logs: Platform-specific (Vercel logs, CloudWatch, etc.)

## Security

- **QStash Signature Verification**: All services verify QStash signatures
- **CORS**: Configurable per service for API access
- **Environment Variables**: Keep credentials secure, never commit

## Testing

Test services independently:

```bash
# Test orders service webhook
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -H "Upstash-Signature: test" \
  -d '{"eventType":"command.checkout",...}'
```

For production testing, use QStash's test mode.
