# E-Commerce Client

The main Next.js e-commerce UI application.

## Running the Client

```bash
# Install dependencies
npm install

# Development (runs on port 3000)
npm run dev

# Production build
npm run build
npm start
```

## Directory Structure

```
client/
├── app/              # Next.js App Router pages and API routes
├── components/       # React components
├── contexts/         # React context providers
├── lib/              # Shared utilities and database
├── types/            # TypeScript type definitions
└── drizzle/          # Database migrations
```

## Architecture

This client app is the user-facing e-commerce website. It handles:
- Product browsing and search
- Shopping cart management
- User authentication (Google OAuth)
- Checkout process
- Order history
- Admin panel

## Event Publishing

When users complete checkout, the client publishes events to the orders-service via QStash:
- `POST /api/checkout` → publishes `command.checkout` event

## Microservices Integration

The client communicates with backend microservices through QStash:
- **Orders Service**: Creates orders from checkout commands
- **Email Service**: Sends order confirmation emails
- **Inventory Service**: Tracks stock changes
- **Analytics Service**: Logs audit trails

Service URLs are configured via environment variables (see `.env.example`).

## Deployment

Deploy to Vercel:

```bash
cd client
vercel
```

Or any other Next.js-compatible platform.

## Environment Variables

See `.env.example` for all required configuration.

## Shared Code

The client references shared code from the parent directory:
- `../services/shared/types.ts` - Event type definitions
- `../services/shared/qstash.ts` - QStash configuration
- `../services/shared/producer.ts` - Event publishing utilities
