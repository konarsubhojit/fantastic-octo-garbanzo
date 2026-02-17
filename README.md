# E-Commerce Platform - Monorepo

> 🚀 **Modernized Architecture**: This repository has been restructured into a monorepo with separate client and microservices. See [PROJECT_README.md](./PROJECT_README.md) for the full documentation.

## Quick Links

- **[📖 Full Documentation](./PROJECT_README.md)** - Complete project documentation
- **[💻 Client App](./client/README.md)** - Main e-commerce UI
- **[🔧 Microservices](./apps/README.md)** - Backend services

## Repository Structure

```
/
├── client/          # Next.js e-commerce UI (port 3000)
├── apps/            # Microservices (ports 3001-3004)
├── services/shared/ # Shared types & utilities
└── lib/             # Database & shared code
```

## Quick Start

```bash
# Install and run all services
npm install -g concurrently

concurrently \
  "cd client && npm install && npm run dev" \
  "cd apps/orders-service && npm install && npm run dev" \
  "cd apps/email-service && npm install && npm run dev" \
  "cd apps/inventory-service && npm install && npm run dev" \
  "cd apps/analytics-service && npm install && npm run dev"
```

Or run each service in a separate terminal - see [PROJECT_README.md](./PROJECT_README.md) for details.

## Architecture

Event-driven microservices using **Upstash QStash**:

```
Client (UI) → Checkout → QStash → Orders Service → Email/Inventory/Analytics Services
```

Each service is independently deployable to Vercel, AWS Lambda, or any serverless platform.

## Key Features

- 🛒 **Full E-Commerce**: Products, cart, orders, checkout
- 🔐 **Google OAuth**: Secure authentication
- ⚡ **Redis Caching**: Smart caching with stampede prevention
- 🚀 **Serverless**: Optimized for Vercel and serverless platforms
- 📊 **Event-Driven**: Microservices with QStash message queue
- 🎨 **Modern UI**: Tailwind CSS v4
- ✅ **Type-Safe**: Full TypeScript with Zod validation

## Documentation

- **[Full Project README](./PROJECT_README.md)** - Complete documentation
- **[Client Documentation](./client/README.md)** - UI app details
- **[Services Overview](./apps/README.md)** - Microservices architecture
- **[Architecture Guide](./docs/architecture.md)** - System design
- **[API Reference](./docs/api-reference.md)** - API endpoints
- **[Deployment Guide](./docs/deployment.md)** - Deployment instructions

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Client** | Next.js 16, TypeScript, Tailwind CSS v4 |
| **Services** | Next.js 16 (serverless) |
| **Database** | PostgreSQL + Drizzle ORM |
| **Cache** | Redis (Upstash) |
| **Queue** | Upstash QStash |
| **Auth** | NextAuth.js v5 |
| **Deploy** | Vercel |

## License

ISC

---

**Built with ❤️ using Next.js and serverless technologies**
