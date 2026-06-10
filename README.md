# DealMap AI — Real-Time Food Discovery & Community Intelligence Platform

[![Server Health](http://localhost:3000/api/health)](http://localhost:3000)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D)](https://vuejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E)](https://nestjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101)](https://socket.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6)](https://www.typescriptlang.org)
[![Mapbox](https://img.shields.io/badge/Mapbox-GL-000000)](https://www.mapbox.com)

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

DealMap AI is a **real-time geospatial platform** that connects communities with discounted and near-expiry food products. By combining live community intelligence, interactive map exploration, and transaction-safe reservation mechanics, the platform reduces food waste while helping users save money — all delivered through a premium, accessible interface.

**Current Status: ✅ Fully Operational**
- Server: `http://localhost:3000` (NestJS)
- Client: `http://localhost:5173` (Vue 3 + Vite)
- Database: SQLite (dev) / PostgreSQL 16 (Docker)
- Seed Data: **69 deals** · **27 stores** · **10 users** · **4 reservations**

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

### How DealMap AI Solves This
1. **Real-time map** — See deals as they are posted within your viewport
2. **Instant reservation** — Secure items before travelling with optimistic locking
3. **Community trust** — Verification badges, trust scores, and moderation
4. **AI-assisted discovery** — Upload a photo, find matching deals nearby
5. **Live analytics** — Real-time dashboard showing platform activity

---

## Vision

> *"The best interface is the one that disappears. DealMap AI prioritises content discovery over chrome, speed over features, and clarity over complexity."*

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
- **Live Analytics Dashboard** — Real-time metrics updated every 5 seconds
- **AI Image Search** — Upload food photo → AI identifies category → matching deals
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
| Chart.js + vue-chartjs | Analytics visualisation |
| Axios | HTTP client |
| vue-virtual-scroller | Virtualised deal lists |
| Sass | CSS preprocessing |

### Backend (server/)
| Technology | Purpose |
|------------|---------|
| NestJS 11 | Node.js framework (controllers, services, modules) |
| TypeScript 6 | Type safety |
| TypeORM | ORM with SQLite (dev) / PostgreSQL (prod) |
| Passport + JWT | Authentication strategy |
| Socket.IO 4 | Real-time WebSocket gateway |
| bcrypt | Password hashing |
| class-validator + class-transformer | DTO validation |
| Helmet | Security headers |
| @nestjs/throttler | Rate limiting (100 req/min) |
| better-sqlite3 | Dev database driver |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker + docker-compose | Container orchestration |
| PostgreSQL 16 | Production database |
| Nginx | Client static file serving (Docker) |

---

## Architecture

```
┌──────────────┐     HTTP/REST     ┌──────────────────┐      SQL       ┌──────────┐
│   Vue 3      │ ◄──────────────►  │   NestJS Server  │ ◄───────────►  │ SQLite / │
│   (Vite)     │                   │   Port 3000      │               │ Postgres │
│   Port 5173  │                   │                  │               └──────────┘
│              │    Socket.IO      │  ┌────────────┐  │
│              │ ◄──────────────►  │  │ Socket     │  │
│              │                   │  │ Gateway    │  │
└──────────────┘                   │  └────────────┘  │
                                   │                  │
                                   │  ┌────────────┐  │
                                   │  │ Analytics  │  │
                                   │  │ Gateway    │  │
                                   │  └────────────┘  │
                                   └──────────────────┘
```

### Module Dependency
```
app.module.ts
├── AuthModule (JWT, Passport)
├── UsersModule
├── DealsModule ─────────────┐
├── ReservationsModule ──────┤
├── CommentsModule ──────────┤
├── StoresModule             │
├── AnalyticsModule ─────────┤
├── SocketModule ────────────┤
├── AISearchModule           │
├── AdminModule              │
├── NewsModule               │
├── HealthModule             │
├── ThrottlerModule (global) │
└── RecommendationModule     │
    ┌────────────────────────┘
    ▼
SocketGateway (injected into Deals, Reservations, Comments services)
AnalyticsService (records ActivityEvent + computeLiveMetrics)
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
│   ├── seed.ts                 # Database seed (69 deals, 27 stores, 10 users)
│   ├── auth/                   # JWT authentication, RegisterDto, LoginDto
│   ├── users/                  # User CRUD, role management
│   ├── deals/                  # Deal CRUD, DTOs, verify, like, bookmark
│   ├── reservations/           # Reservation with optimistic locking
│   ├── comments/               # Comment CRUD with pagination
│   ├── stores/                 # Store listing
│   ├── analytics/              # Live analytics service + gateway (5s tick)
│   ├── socket/                 # Socket.IO gateway + event emission
│   ├── ai/                     # AI image search endpoint
│   ├── news/                   # News articles CRUD
│   ├── admin/                  # Admin user/deal management
│   ├── health/                 # GET /api/health endpoint
│   ├── recommendation/         # Deal recommendation engine
│   ├── common/                 # GlobalExceptionFilter, shared utilities
│   └── database/               # Database configuration
├── test/
│   └── app.e2e-spec.ts         # 6 E2E integration tests
├── data/
│   └── dealmap.db              # SQLite database (dev)
├── Dockerfile                  # Multi-stage build (node:20-alpine + tini)
├── .env                        # Environment variables
└── .env.example                # Template for .env
```

### Client (Vue 3 Frontend)
```
client/
├── src/
│   ├── main.ts                 # Vue app bootstrap
│   ├── App.vue                 # Root component (toast container, router-view)
│   ├── router/index.ts         # Route definitions (public, protected, admin)
│   ├── stores/                 # Pinia stores
│   │   ├── auth.store.ts       # Authentication state
│   │   ├── deals.store.ts      # Deals state
│   │   ├── map.store.ts        # Map viewport state
│   │   ├── ui.store.ts         # UI state (toasts, theme, modals)
│   │   └── analytics.store.ts  # Analytics state
│   ├── services/
│   │   ├── api/                # Axios services (auth, deals, analytics, etc.)
│   │   └── socket/             # Socket.IO client connections
│   ├── components/
│   │   ├── common/             # NavBar, Footer, ErrorBoundary, Toast, Modal, Skeleton
│   │   ├── map/                # MapContainer, DealMarker, MarkerCluster
│   │   ├── deals/              # DealCard, DealList, DealForm, DealFilters
│   │   ├── reservation/        # ReservationButton, ReservationStatus
│   │   ├── comments/           # CommentSection, CommentItem, CommentForm
│   │   ├── dashboard/          # LiveEventChart, StatCard, MetricCard
│   │   └── admin/              # UserTable, DealModeration
│   ├── views/                  # HomeView, ExploreView, DealDetailView, etc.
│   ├── composables/            # useSocket, useCountdown, useDarkMode, etc.
│   ├── types/                  # TypeScript interfaces
│   └── assets/                 # Styles, images, icons
├── Dockerfile                  # Multi-stage build (nginx:alpine)
├── vite.config.ts              # Vite config
└── .env                        # VITE_API_URL, VITE_SOCKET_URL
```

---

## User Roles & Permissions

| Feature | Guest | User | Moderator | Admin |
|---------|-------|------|-----------|-------|
| Browse deals (map/list) | ✅ | ✅ | ✅ | ✅ |
| View deal details | ✅ | ✅ | ✅ | ✅ |
| Register / Login | ✅ | ❌ | ❌ | ❌ |
| Reserve deal | ❌ | ✅ | ✅ | ✅ |
| Create / Edit own deal | ❌ | ✅ | ✅ | ✅ |
| Delete own deal | ❌ | ✅ | ✅ | ✅ |
| Like / Bookmark / Comment | ❌ | ✅ | ✅ | ✅ |
| Verify deal (approve) | ❌ | ❌ | ✅ | ✅ |
| Delete any deal | ❌ | ❌ | ✅ | ✅ |
| Admin Dashboard | ❌ | ❌ | ❌ | ✅ |
| User management (role/ban) | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |

### Demo Accounts

| Email | Role | Password | Trust Score |
|-------|------|----------|-------------|
| `admin@dealmap.ai` | **admin** | `password123` | 5.0 |
| `moderator@dealmap.ai` | **moderator** | `password123` | 4.8 |
| `demo@dealmap.ai` | **user** | `password123` | 4.6 |
| `lan@dealmap.ai` | user | `password123` | 4.3 |
| `huy@dealmap.ai` | user | `password123` | 4.7 |
| `mai@dealmap.ai` | user | `password123` | 4.0 |

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
stores ── deals (lists)
```

### Key Tables
- **user** — id, email, username, role (guest/user/moderator/admin), trustScore, reputationPoints
- **deal** — id, title, description, originalPrice, discountPrice, remainingQuantity, expiresAt, status, verified, location (lat/lng), version (optimistic locking)
- **reservation** — id, dealId, userId, status (active/confirmed/cancelled/expired), expiresAt (15-min hold), reservationCode
- **comment** — id, dealId, userId, content, parentId (replies), status
- **activity_event** — id, userId, dealId, eventType, metadata
- **analytics_snapshot** — id, activeUsers, reservationsPerMinute, dealsPerMinute
- **store** — id, name, address, lat/lng, avgTrustScore
- **verification_event** — id, dealId, moderatorId, action, notes

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
| GET | `/api/reservations` | My reservations |
| POST | `/api/auth/me` | Current user profile |

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

| Event | Description |
|-------|-------------|
| `deal:created` | New deal posted (to map/feed rooms) |
| `deal:updated` | Deal changes (quantity, price, etc.) |
| `deal:expired` | Deal has expired |
| `deal:verified` | Deal verified by moderator |
| `deal:quantity` | Live quantity remaining update |
| `reservation:created` | New reservation on deal |
| `reservation:cancelled` | Reservation cancelled |
| `reservation:confirmed` | Pickup confirmed |
| `reservation:expired` | 15-min hold expired |
| `comment:added` | New comment on deal |
| `analytics:tick` | Live metrics snapshot (every 5s) |
| `feed:activity` | Community activity event |

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
# server/.env (already configured for dev)
NODE_ENV=development
PORT=3000
DATABASE_PATH=./data/dealmap.db
TYPEORM_SYNC=true
JWT_SECRET=dealmap-ai-dev-secret-key-2026
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# client/.env (already configured)
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 3. Seed Database
```bash
cd server && npm run seed
```
Creates 69 deals, 27 stores, 10 users with sample data.

### 4. Start Development Servers
```bash
# Terminal 1 — Backend
cd server && npm run start:dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 5. Open in Browser
- **Client:** http://localhost:5173
- **API Health:** http://localhost:3000/api/health

---

## Docker Deployment

```bash
# Build and start all services
docker compose up --build

# Services:
# - PostgreSQL 16 (port 5432)
# - NestJS Server (port 3000)
# - Vue Client via Nginx (port 80)
```

### Environment Variables for Docker
Edit `docker-compose.yml` or pass via `.env`:
- `JWT_SECRET` — Your production secret
- `DATABASE_URL` — PostgreSQL connection string
- `CORS_ORIGINS` — Allowed origins (comma-separated)

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

### Unit Tests
```bash
cd server && npm test
```

---

## Proposal & Documentation

Detailed project documentation is available:
- **Project Proposal:** `DEALMAP_AI_PROJECT_PROPOSAL.md` — Full HD proposal with user stories, use cases, wireframes, ERD, API design, component hierarchy
- **Design Docs:** `docs/design/` — Product vision, problem statement, user personas
- **Technical Architecture:** `docs/architecture/`, `docs/database/`, `docs/websocket/`, `docs/websocket/`
- **Accessibility:** `docs/accessibility/`
- **Security:** `docs/security/`
- **Deployment:** `docs/deployment/`
- **Testing:** `docs/testing/`
- **Word Documents:**
  - `DealMap_AI_Proposal_HD.docx` — HD proposal (Word format)
  - `DealMap_AI_Proposal_HD_v2.docx` — Updated HD proposal
  - `DealMap_AI_Proposal_IEEE.docx` — IEEE-format proposal

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
- ✅ SQL injection protection via TypeORM parameterised queries
- ✅ No secrets in code — all via `.env`

---

## Contributing

This is an academic project for COS30043 at Swinburne University of Technology.

---

## License

© 2026 DealMap AI — COS30043 Interface Design & Development
