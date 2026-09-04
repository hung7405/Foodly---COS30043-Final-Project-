# Foodly — Real-Time Food Discovery & Community Intelligence Platform

[![Server Health](http://localhost:3000/api/health)](http://localhost:3000)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D)](https://vuejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E)](https://nestjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101)](https://socket.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6)](https://www.typescriptlang.org)

**COS30043 — Interface Design and Development | High Distinction Project**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Vision](#vision)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
  - [Server (NestJS)](#server-nestjs-backend)
  - [Client (Vue 3)](#client-vue-3-frontend)
- [User Roles & Permissions](#user-roles--permissions)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [WebSocket Events](#websocket-events)
- [Getting Started](#getting-started)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [Demo Accounts](#demo-accounts)
- [Proposal & Documentation](#proposal--documentation)

---

## Overview

Foodly is a **real-time geospatial platform** that connects communities with discounted and near-expiry food products. By combining live community intelligence, interactive map exploration, and transaction-safe reservation mechanics, the platform reduces food waste while helping users save money — all delivered through a premium, accessible interface. Project URL: https://client-swart-xi-75.vercel.app/

**Current Status: ✅ Fully Operational**
- Server: `http://localhost:3000` (NestJS 11)
- Client: `http://localhost:5173` (Vue 3 + Vite) — **PWA installable**
- Database: **Supabase (PostgreSQL 16)** via REST client
- Seed Data: **109 deals** · **33 stores** · **11 users** · **~40 reservations**
- Realtime: Socket.IO order timeline, live map, analytics, merchant pickup queue
- AI: OpenAI-compatible vision search + pgvector hybrid recommendations

---

## Problem Statement

### The Food Waste Crisis
- **1.3 billion tonnes** of food wasted globally each year (UN FAO)
- **30–40%** of food supply in developed nations goes unsold
- **$1 trillion** in annual economic losses
- **7.6 million tonnes** of food waste in Australia alone costs **$36.6 billion/year**

### The UX Gap
| Problem | Impact |
|---------|--------|
| Static deal listings | Users cannot trust freshness of information |
| No real-time reservation | Leads to disappointment and wasted trips |
| No community verification | Scams and expired deals erode trust |
| Poor mobile experience | Primary use case is on-the-go discovery |

### How Foodly Solves This
1. **Real-time map** — See deals as they are posted within your viewport
2. **Instant reservation** — Secure items before travelling with optimistic locking
3. **Community trust** — Verification badges, trust scores, and moderation
4. **AI-assisted discovery** — Upload a photo, find matching deals nearby
5. **Live analytics** — Real-time dashboard showing platform activity

---

## Vision

> *"The best interface is the one that disappears. Foodly prioritises content discovery over chrome, speed over features, and clarity over complexity."*

| Principle | Application |
|-----------|-------------|
| **Real-Time First** | Every interaction is live — deals, reservations, verifications, comments |
| **Community-Powered** | Users drive content quality through trust scoring and verification |
| **Geospatial-First** | Map-based discovery as the primary navigation paradigm |
| **Performance Obsession** | Virtual scrolling, viewport culling, optimistic updates |
| **Accessibility by Default** | WCAG 2.1 AA compliance across all states and interactions |

---

## Key Features

### Stage 1 — Foundation
- Landing page with hero banner, featured deals, live stats
- News articles with search, filter by category, pagination
- About page with dynamic greeting and image toggle
- Fully responsive (mobile, tablet, desktop)

### Stage 2 — Core Application
- User registration & JWT-based authentication
- Deal CRUD (create, edit, delete) with image upload
- Search, filter, sort deals by category, price, distance, expiry
- Like, bookmark, and comment on deals
- Role-based access control (Guest / User / Moderator / Admin)
- Admin dashboard with user & deal management

### Stage 3 — Advanced Features
- **Interactive Map** — Leaflet with marker clustering, viewport culling
- **Socket.IO Real-Time** — Live deal updates, reservation events, activity feed
- **Reservation Engine** — Optimistic locking with version column, 15-min hold, auto-expiry
- **Realtime Order Timeline** — Step-by-step pickup progress with live 15-min countdown, shared across user/merchant views
- **Live Analytics Dashboard** — Real-time metrics updated every 5 seconds
- **AI Image Search** — Upload food photo → Gemini/OpenAI vision → matching deals (keyword fallback without API key)
- **AI Vector Recommendations** — pgvector embeddings + heuristic hybrid scoring for personalized results
- **Merchant Hub** — Dashboard KPIs, 7-day revenue chart, pickup queue with live confirm, deal pause/activate
- **PWA (Installable)** — Service worker, offline cache, home-screen install prompt
- **Dark Mode** — Theme toggle with persisted preference
- **Trust Scoring** — Community reputation system

---

## Tech Stack

### Frontend (client/)
| Technology | Purpose |
|------------|---------|
| Vue 3 + Composition API | UI framework |
| TypeScript 6 | Type safety |
| Vite 8 | Build tool / HMR dev server |
| Pinia | State management |
| Vue Router 4 | Client-side routing |
| Bootstrap 5 | UI components & grid |
| Leaflet + MarkerCluster | Interactive map |
| Socket.IO Client | Real-time WebSocket communication |
| Axios | HTTP client |

### Backend (server/)
| Technology | Purpose |
|------------|---------|
| NestJS 11 | Node.js framework (controllers, services, modules) |
| TypeScript 6 | Type safety |
| @supabase/supabase-js | Supabase REST client (no ORM) |
| Passport + JWT | Authentication strategy |
| Socket.IO 4 | Real-time WebSocket gateway |
| bcrypt | Password hashing |
| class-validator + class-transformer | DTO validation |
| Helmet | Security headers |
| @nestjs/throttler | Rate limiting (100 req/min) |
| @nestjs/schedule | Cron (embedding backfill, reservation expiry) |
| OpenAI-compatible model API | AI vision search (env-gated) |
| pgvector | Embeddings + hybrid recommendation |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker + docker-compose | Container orchestration |
| Supabase (PostgreSQL 16) | Hosted database + REST API |
| Nginx | Client static file serving (Docker) |

---

## Architecture

```
┌──────────────┐     HTTP/REST     ┌──────────────────┐   REST/PostgREST   ┌──────────────┐
│   Vue 3      │ ◄──────────────►  │   NestJS Server  │ ◄───────────────►  │  Supabase    │
│   (Vite)     │                   │   Port 3000      │                    │  (Postgres)  │
│   Port 5173  │                   │                  │                    └──────────────┘
│  (+PWA/SW)   │    Socket.IO      │  ┌────────────┐  │
│              │ ◄──────────────►  │  │ Socket     │  │
│              │                   │  │ Gateway    │  │
└──────────────┘                   │  └────────────┘  │
                                   │                  │
                                   │  ┌────────────┐  │
                                   │  │ Analytics  │  │
                                   │  │ Gateway    │  │
                                   └──────────────────┘
```

### Module Dependency
```
app.module.ts
├── SupabaseModule            # REST client provider (SUPABASE_URL/SECRET_KEY)
├── AuthModule (JWT, Passport)
├── UsersModule
├── DealsModule ─────────────────┐
├── ReservationsModule ──────────┤
├── CommentsModule ──────────────┤
├── StoresModule                 │
├── AnalyticsModule ─────────────┤
├── SocketModule ────────────────┤
├── AiModule (vision search)     │
├── EmbeddingModule (pgvector)   │
├── PaymentModule                │
├── GeoModule (IP geolocation)   │
├── InteractionsModule           │
├── MerchantModule               │
├── AdminModule                  │
├── NewsModule                   │
├── HealthModule                 │
├── RecommendationModule         │
├── ThrottlerModule (global)     │
└── ScheduleModule (cron)        │
    ┌────────────────────────────┘
    ▼
SocketGateway (injected into Deals, Reservations, Merchant, Comments services)
AnalyticsService (records ActivityEvent + computeLiveMetrics)
EmbeddingService (cron backfill 10-min + on-demand)
```

---

## Project Structure

### Server (NestJS Backend)
```
server/
├── src/
│   ├── main.ts                 # Entry point, dotenv, global filter, CORS, Helmet
│   ├── app.module.ts           # Root module imports all feature modules
│   ├── config.ts               # Central env config with required() validation
│   ├── seed-supabase.ts        # Seed DB via Supabase REST (11 users, 33 stores, 109 deals)
│   ├── supabase/               # SupabaseModule — REST client provider
│   ├── auth/                   # JWT authentication, RegisterDto, LoginDto
│   ├── users/                  # User CRUD, role management
│   ├── deals/                  # Deal CRUD, DTOs, verify, like, bookmark
│   ├── reservations/           # Reservation with optimistic locking
│   ├── comments/               # Comment CRUD with pagination
│   ├── stores/                 # Store listing
│   ├── analytics/              # Live analytics service + gateway (5s tick)
│   ├── socket/                 # Socket.IO gateway + event emission
│   ├── ai/                     # AI vision search (Gemini/OpenAI, env-gated)
│   ├── embedding/              # pgvector embeddings + match_deals backfill
│   ├── payment/                # Mock payment flow + confirmation
│   ├── geo/                    # IP geolocation (free)
│   ├── interactions/           # Like/bookmark persistence
│   ├── merchant/               # Merchant dashboard, pickup queue, deal mgmt
│   ├── news/                   # News articles CRUD
│   ├── admin/                  # Admin user/deal management
│   ├── health/                 # GET /api/health endpoint
│   ├── recommendation/         # Hybrid recommendation (heuristic + vector)
│   ├── common/                 # GlobalExceptionFilter, shared utilities
├── test/
│   └── app.e2e-spec.ts         # 6 E2E integration tests
├── Dockerfile                  # Multi-stage build (node:22-alpine + tini)
├── .env                        # Environment variables
└── .env.example                # Template for .env
```

### Client (Vue 3 Frontend)
```
client/
├── src/
│   ├── main.ts                 # Vue app bootstrap (+ registerSW for PWA)
│   ├── App.vue                 # Root component (toast container, router-view, install prompt)
│   ├── router/index.ts         # Route definitions (public, protected, merchant, admin)
│   ├── stores/                 # Pinia stores
│   │   ├── auth.store.ts       # Authentication state (+ isMerchant)
│   │   ├── deals.store.ts      # Deals state
│   │   ├── map.store.ts        # Map viewport state
│   │   ├── ui.store.ts         # UI state (toasts, theme, modals)
│   │   └── analytics.store.ts  # Analytics state
│   ├── services/
│   │   ├── api/                # Axios services (auth, deals, merchant, analytics, etc.)
│   │   └── socket/             # Socket.IO client connections
│   ├── components/
│   │   ├── common/             # NavBar, Footer, ErrorBoundary, Toast, Modal, Timeline
│   │   ├── map/                # MapContainer, DealMarker, MarkerCluster
│   │   ├── deals/              # DealCard, DealList, DealForm, DealFilters
│   │   ├── reservation/        # ReservationButton, ReservationStatus
│   │   ├── comments/           # CommentSection, CommentItem, CommentForm
│   │   ├── dashboard/          # LiveEventChart, StatCard, MetricCard
│   │   ├── merchant/           # MerchantNavBar
│   │   └── admin/              # UserTable, DealModeration
│   ├── views/                  # HomeView, ExploreView, DealDetailView, merchant/*, etc.
│   ├── composables/            # useSocket, useCountdown, useDarkMode, etc.
│   ├── types/                  # TypeScript interfaces
│   └── assets/                 # Styles, images, icons
├── public/pwa/                 # PWA icons (192, 512, maskable)
├── Dockerfile                  # Multi-stage build (nginx:alpine)
├── vite.config.ts              # Vite config (+ vite-plugin-pwa)
└── .env                        # VITE_API_URL, VITE_SOCKET_URL
```

---

## User Roles & Permissions

| Feature | Guest | User | Merchant | Moderator | Admin |
|---------|-------|------|----------|-----------|-------|
| Browse deals (map/list) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View deal details | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register / Login | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reserve deal | ❌ | ✅ | ✅ | ✅ | ✅ |
| Like / Bookmark / Comment | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create / Edit own deal | ❌ | ✅ | ❌ | ✅ | ✅ |
| Verify deal (approve) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Delete any deal | ❌ | ❌ | ❌ | ✅ | ✅ |
| Merchant Dashboard (KPI, pickup queue, pause deals) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Admin Dashboard | ❌ | ❌ | ❌ | ❌ | ✅ |
| User management (role/ban) | ❌ | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ❌ | ✅ |

### Demo Accounts

| Email | Role | Password | Notes |
|-------|------|----------|-------|
| `admin@foodly.app` | **admin** | `Admin@123` | Full admin access |
| `binh@foodly.app` | **moderator** | `Password123!` | Deal verification |
| `merchant@foodly.app` | **merchant** | `Password123!` | Dashboard, 5 stores (e.g. Circle K Nguyễn Huệ) |
| `demo@foodly.app` | user | `Password123!` | Regular user |
| `lan@foodly.app` | user | `Password123!` | Regular user |
| `huy@foodly.app` | user | `Password123!` | Regular user |
| `mai@foodly.app` | user | `Password123!` | Regular user |

---

## Database Schema

### Entity Relationship

```
users ──┐
   │    ├── deals (creates) ──┐
   │    │                     ├── reservations (has)
   │    │                     ├── comments (has)
   │    │                     ├── likes (receives)
   │    │                     ├── bookmarks (receives)
   │    │                     ├── activity_events (triggers)
   │    │                     └── verification_events (undergoes)
   │    ├── reservations (makes)
   │    ├── comments (writes)
   │    ├── likes (gives)
   │    ├── bookmarks (saves)
   │    ├── activity_events (generates)
   │    └── verification_events (performs)
   │
   ├── stores (owns, merchant) ── deals (lists)
   │                                  └── deal_embeddings (1:1, pgvector)
   │
   └── reservations ── payments (has)
```

### Key Tables
- **user** — id, email, username, role (guest/user/merchant/moderator/admin), trustScore, reputationPoints
- **store** — id, name, address, lat/lng, avgTrustScore, userId (merchant owner)
- **deal** — id, title, description, originalPrice, discountPrice, remainingQuantity, expiresAt, status, verified, location (lat/lng), version (optimistic locking)
- **deal_embedding** — id, dealId, embedding vector(384), model, updatedAt (HNSW index, `match_deals()` RPC)
- **reservation** — id, dealId, userId, status (active/confirmed/cancelled/expired), expiresAt (15-min hold), reservationCode
- **payment** — id, reservationId, userId, amount, status, paymentMethod, paidAt
- **comment** — id, dealId, userId, content, parentId (replies), status
- **activity_event** — id, userId, dealId, eventType, metadata
- **analytics_snapshot** — id, activeUsers, reservationsPerMinute, dealsPerMinute
- **verification_event** — id, dealId, moderatorId, action, notes

> Schema is managed via `server/src/supabase-migration.sql` — apply the full file (base + incremental sections) in the Supabase SQL Editor for a fresh database.

---

## API Overview

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/deals` | List deals (paginated, searchable, filterable) |
| GET | `/api/deals/:id` | Deal detail |
| GET | `/api/deals/map?bounds=...` | Deals within viewport |
| GET | `/api/stores` | List stores |
| GET | `/api/news` | News articles (paginated) |
| GET | `/api/geo` | IP geolocation (free) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |

### Protected Endpoints (JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deals` | Create deal |
| PUT | `/api/deals/:id` | Update deal |
| DELETE | `/api/deals/:id` | Delete deal |
| POST | `/api/deals/:id/reserve` | Reserve deal (optimistic lock) |
| POST | `/api/deals/:id/comments` | Add comment |
| POST | `/api/deals/:id/like` | Toggle like |
| POST | `/api/deals/:id/bookmark` | Toggle bookmark |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/reservations` | My reservations |
| POST | `/api/ai/search` | AI vision search (multipart image, env-gated) |
| GET | `/api/recommendations?q=` | Hybrid recommendations (heuristic + vector) |
| POST | `/api/payments/reservations/:id/pay` | Create payment |
| PUT | `/api/payments/:id/complete-mock` | Complete mock payment |
| PUT | `/api/payments/:id/confirm` | Confirm payment |

### Merchant Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/merchant/dashboard` | Dashboard KPI, 7-day revenue trend, top products, low stock |
| GET | `/api/merchant/orders?status=` | Pickup queue (filterable) |
| PUT | `/api/merchant/orders/:id/confirm` | Confirm pickup (emits `reservation:confirmed`) |
| GET | `/api/merchant/deals` | Deals of owned stores |
| PUT | `/api/merchant/deals/:id/status` | Pause/activate deal |

### Moderator+ Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deals/:id/verify` | Verify deal |

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| PUT | `/api/admin/users/:id/role` | Change user role |
| PUT | `/api/admin/users/:id/ban` | Ban user |
| GET | `/api/admin/deals` | List all deals |
| GET | `/api/analytics/live` | Live metrics |
| GET | `/api/ai/embeddings/status` | Embedding status (Mod/Admin) |
| POST | `/api/ai/embeddings/backfill` | Backfill embeddings (Admin) |

### Full query parameters for `GET /api/deals`:
```
?page=1&limit=20&search=sandwich&category=fresh_food,dairy
&sort=created_at&order=desc&status=active&verified=true
&lat=-37.8136&lng=144.9631&radius=5000
```

---

## WebSocket Events

Socket.IO is used for real-time bidirectional communication.

### Server → Client Events

| Event | Scope | Description |
|-------|-------|-------------|
| `deal:created` | map/feed rooms | New deal posted |
| `deal:updated` | deal room | Deal changes (price, description, etc.) |
| `deal:quantity` | deal room | Live quantity remaining update |
| `deal:verified` | deal room | Deal verified by moderator |
| `reservation:created` | deal room | New reservation on deal |
| `reservation:confirmed` | global | Pickup confirmed by merchant |
| `reservation:expired` | deal room | 15-min hold expired |
| `comment:added` | deal room | New comment on deal |
| `analytics:tick` | dashboard room | Live metrics snapshot (every 5s) |
| `feed:activity` | feed room | Community activity event |

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `deal:join` | `{ dealId }` | Join deal-specific room |
| `deal:leave` | `{ dealId }` | Leave deal room |
| `map:viewport` | `{ bounds, zoom }` | Register viewport for live updates |
| `feed:join` | `{}` | Join community feed room |
| `dashboard:join` | `{}` | Join analytics dashboard room |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### 1. Clone & Install Dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment
```bash
# server/.env (create from .env.example)
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SECRET_KEY=<service_role_key>
JWT_SECRET=foodly-dev-secret-key-2026
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# Optional — AI vision search + embeddings (falls back to keyword/heuristic if unset)
MODEL_ID=gpt-5.4-nano
MODEL_BASE_URL=https://api.openai.com/v1
MODEL_API_KEY=...
OPENAI_API_KEY=...

# client/.env (already configured)
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 3. Prepare Database (Supabase)
1. Paste `server/src/supabase-migration.sql` (base + incremental sections) into the **Supabase SQL Editor** and run.
2. Copy your Project URL and `service_role` key into `server/.env`.

### 4. Seed Database
```bash
cd server && npx ts-node src/seed-supabase.ts
```
Creates **11 users, 33 stores, 109 deals, ~40 reservations** + assigns 5 stores to the merchant account.

> **Existing DB (seeded before the merchant platform)?** Run only the "Merchant Platform" section at the
> end of `supabase-migration.sql` in the Supabase SQL Editor, then run `npx ts-node src/seed-merchant.ts`
> to add `merchant@foodly.app` + orders. Do **not** re-run `seed-supabase.ts` on a populated DB — it uses
> plain `.insert()` (not idempotent).

### 5. Start Development Servers
```bash
# Terminal 1 — Backend
cd server && npm run start:dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 6. Open in Browser
- **Client:** http://localhost:5173
- **API Health:** http://localhost:3000/api/health

---

## Docker Deployment

```bash
# Create root .env with SUPABASE_URL, SUPABASE_SECRET_KEY, JWT_SECRET, AI keys
docker compose up --build

# Services:
# - NestJS Server (port 3000)
# - Vue Client via Nginx (port 80)
```

### Environment Variables for Docker
Edit `docker-compose.yml` or pass via root `.env`:
- `SUPABASE_URL` — Supabase project URL (required)
- `SUPABASE_SECRET_KEY` — Service role key (required)
- `JWT_SECRET` — Your production secret
- `CORS_ORIGINS` — Allowed origins (comma-separated)
- `MODEL_ID` / `MODEL_BASE_URL` / `MODEL_API_KEY` — Optional, enables AI vision + embeddings

---

## Testing

### E2E Tests (6 tests)
```bash
cd server && npm run test:e2e
```
Tests cover:
1. Register a new user
2. Login returns JWT token
3. Create a deal (authenticated)
4. Second user registration
5. Reserve deal (concurrent-safe)
6. List deals returns paginated results

### Unit Tests (16 tests)
```bash
cd server && npm test
```
Unit tests cover the recommendation scoring engine — deal freshness, popularity,
history matching, and haversine distance calculations.

### Concurrency Stress Test
Proves the optimistic-lock reservation guard: firing N simultaneous reservations
at a deal with stock Q results in at most Q successes and no oversell.

```bash
cd server
API_BASE=http://localhost:3000/api QTY=5 PARALLEL=20 CLEANUP=1 \
  npx ts-node scripts/stress-reserve.ts
# Expected: Success <= 5, remaining stock >= 0, no negative stock
```

---

## Proposal & Documentation

Detailed project documentation is available:
- **Project Proposal:** `FOODLY_PROJECT_PROPOSAL.md` — Full HD proposal with user stories, use cases, wireframes, ERD, API design, component hierarchy
- **Design Docs:** `docs/design/` — Product vision, problem statement, user personas
- **User Flows:** `FOODLY_USER_FLOW.md`, `FOODLY_USER_FLOW_DIAGRAM.md`
- **Word Documents:**
  - `Foodly_Proposal_HD.docx` — HD proposal (Word format)
  - `Foodly_Proposal_HD_v2.docx` — Updated HD proposal
  - `Foodly_Proposal_IEEE.docx` — IEEE-format proposal

---

## Security & Production Readiness

- ✅ JWT secret validated at startup via `config.ts` — crashes if missing
- ✅ CORS origins locked to environment variable
- ✅ Helmet security headers enabled
- ✅ Rate limiting: 100 requests/minute global
- ✅ Global exception filter with structured error responses
- ✅ Graceful shutdown (SIGTERM/SIGINT handlers)
- ✅ Input validation via class-validator DTOs
- ✅ Password hashing via bcrypt
- ✅ Parameterised queries via Supabase PostgREST client
- ✅ No secrets in code — all via `.env`

---

## Contributing

This is an academic project for COS30043 at Swinburne University of Technology.

---

## License

&copy; 2026 Foodly &mdash; COS30043 Interface Design & Development
