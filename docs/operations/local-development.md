# Local Development Guide

## Prerequisites

- Node.js v20+ (tested on Node v22.23.4)
- pnpm v9+
- Docker & Docker Compose (optional for offline synthetic development)

## Setup

```bash
# 1. Install dependencies across monorepo
pnpm install

# 2. Copy environment configuration
cp .env.example .env

# 3. Build all workspace packages
pnpm build

# 4. Run tests
pnpm test

# 5. Start development servers in parallel
pnpm dev
```

## Service Ports

- **Web Console**: `http://localhost:3000`
- **Fastify API & GraphQL**: `http://localhost:4000` (GraphQL Yoga at `/graphql`)
- **Processor Health**: `http://localhost:4001`
- **Investigator Health**: `http://localhost:4002`
- **Redpanda Console**: `http://localhost:8080` (when Docker daemon is running)
- **Grafana**: `http://localhost:3001` (when Docker daemon is running)
- **Prometheus**: `http://localhost:9090` (when Docker daemon is running)
