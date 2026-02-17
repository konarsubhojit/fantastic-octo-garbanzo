# GitHub Copilot Instructions for E-commerce Project

## Project Overview
This is a highly scalable e-commerce website built with Next.js 16, TypeScript, PostgreSQL, Redis, and NextAuth for authentication. It's designed to run as serverless on-demand functions.

## Technology Stack
- **Framework**: Next.js 16 with App Router (TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: Redux Toolkit (cart, orders, admin slices)
- **Currency**: CurrencyContext with INR default, `useCurrency()` hook
- **Cache**: Redis (ioredis) with stampede prevention
- **Authentication**: NextAuth.js v5 with Google OAuth
- **Styling**: Tailwind CSS v4
- **Validation**: Zod for runtime type checking

## Code Style Guidelines

### TypeScript
- Use strict TypeScript everywhere
- Prefer type inference over explicit types when obvious
- Use Zod schemas for runtime validation
- Define types in `lib/types.ts` or `lib/validations.ts`
- Use modern TypeScript features (satisfies, const assertions, template literals)

```typescript
// Good
const config = {
  timeout: 5000,
  retries: 3,
} as const satisfies ConfigType;

// Use Zod for validation
const schema = z.object({ name: z.string() });
type Input = z.infer<typeof schema>;
```

### React & Next.js
- Use Server Components by default
- Add 'use client' only when necessary (hooks, browser APIs, interactivity)
- Use Server Actions for mutations
- Implement proper error boundaries
- Use Suspense for loading states

```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component (when needed)
'use client';
export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### API Routes
- Use `lib/api-utils.ts` helpers for responses
- Always validate input with Zod schemas
- Use proper HTTP status codes
- Handle errors with `handleApiError`
- Return type-safe responses with `apiSuccess`/`apiError`

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = MySchema.parse(body);
    const result = await processData(validated);
    return apiSuccess({ result });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Database (Prisma)
- Always use Prisma client from `lib/db.ts`
- Use transactions for multi-step operations
- Include relations when needed with `include`
- Use proper indexing in schema
- Convert DateTime to ISO string for API responses

```typescript
const result = await prisma.product.findMany({
  include: { orderItems: true },
  where: { stock: { gt: 0 } },
});
```

#### Database Migrations
- Use Prisma Migrate for all database schema changes
- Never modify the schema without creating a migration
- Always create descriptive migration names
- Test migrations in development before deploying

**Creating a Migration:**
```bash
# After modifying prisma/schema.prisma, create a migration
npm run db:migrate -- --name descriptive_migration_name

# This will:
# 1. Generate SQL migration files in prisma/migrations/
# 2. Apply the migration to your database
# 3. Update Prisma Client
```

**Migration Workflow:**
1. Modify `prisma/schema.prisma` with your changes
2. Run `npm run db:migrate -- --name your_change_description`
3. Review the generated SQL in `prisma/migrations/`
4. Test the migration in development
5. Commit both schema.prisma and migration files
6. In production, run `npx prisma migrate deploy`

**Important Notes:**
- Migrations are applied in order based on timestamp
- Never edit existing migration files after they've been applied
- Use normalized relational tables with proper foreign keys
- Add indexes for frequently queried fields
- Use `@@index` for single fields, `@@unique` for constraints

### Caching Strategy
- Use `getCachedData` from `lib/redis.ts` for read-heavy endpoints
- Set appropriate TTL (60s for products)
- Invalidate cache on writes with `invalidateCache`
- Use stale-while-revalidate pattern
- Always implement stampede prevention

```typescript
const data = await getCachedData(
  'cache:key',
  60, // TTL in seconds
  async () => await fetchFromDB(),
  10  // Stale time
);
```

### Authentication
- Use `auth()` from `lib/auth.ts` to get session
- Check user role for admin routes
- Use `ProtectedRoute` component for protected pages
- Never expose sensitive data in client components

```typescript
import { auth } from '@/lib/auth';

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    redirect('/');
  }
  // Admin content
}
```

## File Structure
```
app/
  ├── api/              # API routes
  │   ├── coupons/      # Coupon management (admin + validation)
  │   ├── price-alerts/ # Price drop alerts
  │   ├── recently-viewed/ # Track viewed products
  │   └── notifications/ # User notification preferences
  ├── account/          # User account pages
  │   ├── settings/     # Notification preferences
  │   ├── price-alerts/ # Manage price alerts
  │   └── recently-viewed/ # View history
  ├── auth/             # Authentication pages
  ├── admin/            # Admin panel
  ├── products/         # Product pages
  └── page.tsx          # Home page
lib/
  ├── db.ts             # Drizzle client
  ├── schema.ts         # Drizzle schema
  ├── redis.ts          # Redis utilities
  ├── auth.ts           # NextAuth config
  ├── types.ts          # Type definitions
  ├── validations.ts    # Zod schemas
  ├── api-utils.ts      # API helpers
  ├── store.ts          # Redux store (cart, orders, admin)
  ├── hooks.ts          # Custom React hooks
  └── features/
      ├── cart/cartSlice.ts     # Cart state
      ├── orders/ordersSlice.ts # Orders state
      └── admin/adminSlice.ts   # Admin state (products, orders, users)
contexts/
  └── CurrencyContext.tsx # Currency context (INR default)
components/
  ├── layout/           # Layout components (Header, Footer, CartIcon)
  ├── ui/               # UI components (CurrencySelector, NewsletterForm, ErrorBoundary)
  ├── providers/        # StoreProvider, SessionProvider
  └── sections/         # Page sections (Hero, ProductGrid)
drizzle/
  └── *.sql             # Migration files
scripts/
services/
  shared/
    kafka.ts           # Kafka client config
    types.ts           # Event types
    producer.ts        # Kafka producer
    consumer.ts        # Kafka consumer factory  
    admin.ts           # Topic management
    setup-topics.ts    # Standalone topic setup
  orders/
    index.ts           # Order creation service
  email/
    index.ts           # Email notification service
  logs/
    index.ts           # Audit logging service
```

## Modern Features

### Recently Viewed Products
- Tracks products viewed by authenticated users
- API: GET/POST `/api/recently-viewed`
- UI: `/account/recently-viewed` - View history page
- Auto-tracked via useEffect on product page

### Promotional Coupons
- Admin creates/manages coupons at `/api/coupons`
- Coupon types: PERCENTAGE or FIXED discount
- Validation: date range, max uses, min order amount
- Applied at checkout via cart page coupon input
- API: GET/POST `/api/coupons`, GET `/api/coupons/[code]`, POST `/api/coupons/apply`

### Price Drop Alerts
- Users set target price for products
- Bell icon on product page opens alert modal
- API: GET/POST `/api/price-alerts`, PATCH/DELETE `/api/price-alerts/[id]`
- UI: `/account/price-alerts` - Manage alerts

### Notification Preferences
- Users control email/push notification settings
- API: GET/PUT `/api/notifications/preferences`
- UI: `/account/settings` - Toggle notifications
- Settings: emailOrderUpdates, emailPromotions, emailPriceAlerts, pushEnabled

### Database Tables
- `recentlyViewed` - User product view history
- `coupons` - Promotional codes with discounts
- `couponUsage` - Track coupon redemptions
- `priceAlerts` - User price alert subscriptions
- `notificationPreferences` - User notification settings

## Common Patterns

### Creating a New API Endpoint
1. Define Zod schema in `lib/validations.ts`
2. Create route in `app/api/[name]/route.ts`
3. Validate input with schema
4. Use Drizzle for database operations
5. Handle errors properly
6. Return type-safe response

### Adding a New Feature
1. Update Drizzle schema in `lib/schema.ts` if needed
2. Run `npx drizzle-kit generate` and `npx drizzle-kit migrate`
3. Create types/validations
4. Add Redux slice if state is shared across pages
5. Implement API routes or Server Actions
6. Create UI components
7. Test thoroughly

### Currency Formatting
- Use `useCurrency()` from `@/contexts/CurrencyContext` in all client components
- Call `formatPrice(amountInUSD)` — never use raw `$` or `.toFixed(2)`
- Prices stored in DB are in USD; conversion happens at display time
- CurrencySelector in Header lets users switch between INR/USD/EUR/GBP

### State Management (Redux)
- Cart state: `lib/features/cart/cartSlice.ts`
- Orders state: `lib/features/orders/ordersSlice.ts`
- Admin state: `lib/features/admin/adminSlice.ts` (products, orders, users)
- Use `useSelector` + `useDispatch<AppDispatch>()` in client components
- Keep UI-only state (modals, forms) as local `useState`
- Use Redux for data shared across pages or fetched from APIs

### Component Best Practices
- **Organized folder structure**: Place components in appropriate folders
  - `components/layout/` - Reusable layout components (Header, Footer, CartIcon)
  - `components/ui/` - Generic UI components (forms, buttons, error boundaries)
  - `components/sections/` - Page-specific sections (Hero, ProductGrid)
- Use Server Components by default, add 'use client' only when needed
- Keep components focused and single-purpose
- Extract shared logic into hooks or utilities

### Performance Best Practices
- Cache frequently accessed data
- Use connection pooling (already configured)
- Minimize database queries
- Optimize images with Next.js Image
- Use proper indexes in Prisma schema
- Implement pagination for large datasets

## Performance Optimizations

This project implements several Next.js 15+ performance optimizations:

### Static Generation with ISR
- **Removed `force-dynamic`**: Pages use Incremental Static Regeneration (ISR) instead of dynamic rendering
- **Revalidation timing**: Static pages revalidate every 60 seconds
- **Benefits**: Faster page loads, reduced database load, better caching

### Direct Database Access
- **No HTTP fetches in Server Components**: Database queries happen directly in components
- **Eliminates roundtrip overhead**: No network latency between server component and API route
- **Simplified architecture**: Fewer layers, easier debugging

### API Route Optimizations
- **Cache headers**: All API routes include proper Cache-Control headers
- **Stale-while-revalidate**: Responses can be cached while background revalidation occurs
- **Redis caching**: Frequently accessed data cached with stampede prevention

### Static Params Generation
- **`generateStaticParams`**: Pre-generates pages for top 20 products at build time
- **Incremental builds**: Additional product pages generated on-demand and cached
- **SEO benefits**: Core product pages indexed immediately

### Implementation Examples
```typescript
// ISR with revalidation
export const revalidate = 60;

// Direct database queries in Server Components
const products = await prisma.product.findMany();

// API routes with cache headers
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
  },
});

// Static params generation
export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    take: 20,
    orderBy: { id: 'asc' },
  });
  return products.map((product) => ({ id: product.id.toString() }));
}
```

## Commands Reference
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
```

## Testing Checklist
- [ ] API validation with invalid data
- [ ] Authentication flows
- [ ] Cache invalidation
- [ ] Error boundaries
- [ ] TypeScript type checking
- [ ] Database transactions
- [ ] Edge cases (out of stock, etc.)

## Security Considerations
- Validate all user input with Zod
- Use parameterized queries (Prisma does this)
- Check authentication for protected routes
- Sanitize data before display
- Use HTTPS in production
- Rotate secrets regularly
- Implement rate limiting

## Deployment Notes
- Designed for serverless (Vercel, AWS Lambda, etc.)
- Requires PostgreSQL and Redis instances
- Requires Upstash QStash for event processing
- Set all environment variables
- Run migrations before first deploy
- Configure Google OAuth credentials
- Configure QStash webhook URLs
- Use production-grade secrets

## Event-Driven Architecture (QStash)

This project uses Upstash QStash for serverless event-driven architecture.

### Why QStash?
- ✅ Serverless HTTP-based message queue
- ✅ No infrastructure management (no Kafka/Zookeeper)
- ✅ Simple webhook-based consumption
- ✅ Built-in retries and DLQ
- ✅ At-least-once delivery guarantees
- ✅ Perfect for serverless platforms

### Architecture Overview
```
API Routes → QStash → Webhooks
/api/checkout → publishes events → /api/webhooks/*
```

### Topics (Webhook Endpoints)
| Topic | Webhook URL | Purpose |
|-------|------------|---------|
| commands | `/api/webhooks/commands` | Checkout, reservations |
| orders | `/api/webhooks/orders` | Order lifecycle |
| notifications | `/api/webhooks/notifications` | Email, push, SMS |
| inventory | `/api/webhooks/inventory` | Stock updates |
| analytics | `/api/webhooks/analytics` | Audit logs, metrics |

### Publishing Events
```typescript
import { publishCheckoutCommand } from '@/lib/qstash-producer';

await publishCheckoutCommand({
  userId, items, totalAmount, paymentId
});
```

### Consuming Events (Webhooks)
```typescript
import { verifyQStashSignature } from '@/lib/qstash-webhook';
import { processWithDeduplication } from '@/lib/deduplication';

export async function POST(request: NextRequest) {
  const event = await verifyQStashSignature<EventType>(request);
  
  const { processed } = await processWithDeduplication(event.eventId, async () => {
    await handleEvent(event);
  });
  
  return NextResponse.json({ success: true, duplicate: !processed });
}
```

### Key Features
- **Signature Verification**: All webhooks verify QStash signatures
- **Deduplication**: Redis-based duplicate event detection (1-hour TTL)
- **Retries**: Automatic retries with exponential backoff
- **DLQ**: Failed events routed to analytics topic

### Environment Variables
```bash
QSTASH_TOKEN=your-token
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_yyy
QSTASH_WEBHOOK_BASE_URL=https://your-domain.com
```

### Development Setup
Use ngrok for local webhook testing:
```bash
ngrok http 3000
# Set QSTASH_WEBHOOK_BASE_URL to ngrok URL
```

See [QSTASH_MIGRATION.md](./QSTASH_MIGRATION.md) for detailed documentation.
npm run services:all
```

# Or start all services together
npm run services:all
```

### Event Types Reference

**Commands Topic (`ecom.commands`)**
- `command.checkout` — Checkout request with payment info
- `command.inventory.reserve` — Reserve stock for order
- `command.inventory.release` — Release reserved stock

**Orders Topic (`ecom.orders`)**
- `order.created` — New order created
- `order.confirmed` — Order confirmed
- `order.shipped` — Order shipped
- `order.delivered` — Order delivered
- `order.cancelled` — Order cancelled

**Notifications Topic (`ecom.notifications`)**
- `notification.email` — Email notification request
- `notification.push` — Push notification request
- `notification.sms` — SMS notification request

**Inventory Topic (`ecom.inventory`)**
- `inventory.stock.updated` — Stock level changed
- `inventory.stock.low` — Low stock alert
- `inventory.stock.reserved` — Stock reserved for order

**Analytics Topic (`ecom.analytics`)**
- `analytics.audit` — Audit log entry
- `analytics.metric` — Business metric
- `analytics.dlq` — Dead letter queue event

### Environment Variables
- `KAFKA_BROKERS` — Kafka broker addresses (default: `localhost:9092`)
- `KAFKA_CLIENT_ID` — Kafka client identifier (default: `ecommerce-app`)

### Email Service Configuration
- `SMTP_HOST` — SMTP server (e.g., smtp.gmail.com)
- `SMTP_PORT` — SMTP port (default: 587)
- `SMTP_SECURE` — Use TLS (default: false)
- `SMTP_USER` — SMTP username
- `SMTP_PASS` — SMTP password
- `EMAIL_FROM` — Sender address (default: noreply@ecommerce-store.com)

### Performance Optimizations
- **GZIP compression** on all messages
- **Idempotent producer** for exactly-once semantics
- **Typed consumers** with built-in event filtering
- **Graceful shutdown** handling
- **Correlation IDs** for distributed tracing
- **DLQ support** without additional topics

## When Adding New Dependencies
1. Check if similar functionality exists
2. Prefer well-maintained packages
3. Consider bundle size impact
4. Update documentation
5. Run security audit

## Copilot Preferences
- Suggest modern TypeScript patterns
- Prioritize type safety
- Follow existing code structure
- Include proper error handling
- Add meaningful comments for complex logic
- Suggest performance optimizations
- Consider serverless constraints

## UI/UX Testing Requirements
**MANDATORY**: Always test UI/UX changes with Playwright before completing tasks.

### Testing Process
1. **Start dev server** with mock data if database is unavailable
2. **Use Playwright** to navigate and interact with changed UI
3. **Take screenshots** of all modified pages/components
4. **Verify**:
   - Tailwind CSS classes rendering correctly
   - Responsive design working
   - Interactive elements functional
   - Error states display properly
   - Loading states work
5. **Include screenshots** in PR description
6. **Revert temporary mock code** after testing

### Mock Data Pattern
```typescript
// Temporary mock for testing - ALWAYS REVERT
const MOCK_DATA = [...];
export async function GET() {
  return NextResponse.json({ data: MOCK_DATA });
}
```

### Example Testing Flow
```bash
# 1. Create mock data temporarily
# 2. Start server: npm run dev
# 3. Test with Playwright
# 4. Take screenshots
# 5. Restore original code
# 6. Commit real changes only
```
## Error Handling & Loading States

This project uses Next.js App Router conventions for error boundaries and loading states:

### Error Boundaries
- `app/error.tsx` - Global error boundary
- `app/products/error.tsx` - Products section error handling
- `app/orders/error.tsx` - Orders section error handling
- `app/cart/error.tsx` - Cart section error handling
- `app/admin/error.tsx` - Admin section error handling

### Loading States
- `app/loading.tsx` - Global loading skeleton
- `app/products/loading.tsx` - Products listing skeleton
- `app/products/[id]/loading.tsx` - Product detail skeleton

### Component Props Pattern
Always use readonly interfaces for component props:
```typescript
interface MyComponentProps {
  readonly data: Data;
  readonly onAction?: () => void;
}

export default function MyComponent({ data, onAction }: MyComponentProps) {
  // ...
}
```

## Environment Variable Validation

Environment variables are validated at startup using `lib/env.ts`:
- `DATABASE_URL` - Required PostgreSQL connection string
- `REDIS_URL` - Optional Redis URL (defaults to localhost:6379)
- `NODE_ENV` - Optional (development/production/test)

Import validated env vars:
```typescript
import { env } from '@/lib/env';
console.log(env.DATABASE_URL); // Typed and validated
```

## API Route Patterns

### Auth Status Codes
- `401 Unauthorized` - User is not authenticated (no session)
- `403 Forbidden` - User is authenticated but lacks permission

### Input Validation
Always use Zod schemas for request body validation:
```typescript
import { AddToCartSchema } from '@/lib/validations';
import { apiError, handleValidationError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = AddToCartSchema.safeParse(body);
  if (!parseResult.success) {
    return handleValidationError(parseResult.error);
  }
  const validated = parseResult.data;
  // ...
}
```

## Accessibility Requirements

All components must include:
- `aria-expanded` on dropdown triggers
- `aria-haspopup="menu"` on menu triggers
- `role="menu"` on dropdown containers
- `role="menuitem"` on menu items
- `aria-hidden="true"` on decorative elements
- `rel="noopener noreferrer"` on external links
- `htmlFor` and `id` on label/input pairs