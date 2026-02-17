# Orders Service

Standalone Next.js service for processing checkout commands and creating orders.

## Running the Service

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

The service will run on port 3001 by default.

## Deployment

Deploy this service independently to Vercel, AWS Lambda, or any serverless platform.

### Vercel Deployment

```bash
cd services/orders-service
vercel
```

### Environment Variables

See `.env.example` for required environment variables.

## API Endpoints

- `GET /api/webhook` - Health check
- `POST /api/webhook` - QStash webhook endpoint (handles checkout commands)
- `OPTIONS /api/webhook` - CORS preflight

## CORS Configuration

CORS is enabled and configurable through environment variables:

- `CORS_ALLOWED_ORIGINS` - Allowed origins (comma-separated)
- `CORS_ALLOWED_METHODS` - Allowed HTTP methods
- `CORS_ALLOWED_HEADERS` - Allowed headers
- `CORS_MAX_AGE` - Preflight cache duration
