# Foodly — Codebase Analysis

> Maintained: run `tools/code-intelligence/generate-code-map.ps1` after structural changes
> to refresh the machine-readable output in `tools/code-intelligence/.ai-context/`. This
> document is a human/AI-friendly walkthrough of the repository as of 2026-08.

## 1. Repository structure

```
COS30043 final project/
├─ client/                     Vue 3 + Vite + TypeScript SPA
│  └─ src/
│     ├─ main.ts               app bootstrap (pinia, router, PWA, directives)
│     ├─ App.vue                root component (layout + nav)
│     ├─ router/index.ts        all routes + role/guard meta
│     ├─ stores/                Pinia: auth.store, ui.store
│     ├─ services/              axios API client, socket client, free APIs
│     ├─ composables/           useLocation, useDirections (Leaflet/OSRM)
│     ├─ components/            reusable UI + BannerCarousel
│     ├─ directives/            click-outside, focus, focus-trap
│     ├─ types/                 shared TS types (deal, news, …)
│     ├─ utils/                 currency, constants
│     └─ views/                 pages (Home, Explore, Deals, Payments, Admin,
│                               Merchant/*, AI Search, Spin, News, Profile…)
├─ server/                      NestJS 11 + TypeScript API
│  └─ src/
│     ├─ main.ts → app.module.ts  (20 feature modules registered)
│     ├─ supabase/               Supabase client wrapper
│     ├─ auth/                   register/login + JwtStrategy (passport-jwt)
│     ├─ users/ deals/ reservations/ comments/ stores/ merchant/
│     ├─ payment/ rewards/ interactions/ analytics/ admin/
│     ├─ ai/ embedding/         food recognition (Gemini/OpenAI/heuristic) + vectors
│     ├─ geo/ news/ recommendation/ health/ socket/
│     └─ common/                guards, decorators, global exception filter
├─ deploy/                      docker/nginx/vercel deployment config
├─ docs/                        project report, design specs, figures
└─ tools/code-intelligence/     Code Intelligence Layer:
   ├─ *.py                      scanner, AST parser, graph builder, exporter, query CLI
   ├─ generate-code-map.ps1     one-command regeneration script
   ├─ docs/                     this analysis + AI-CODE-INTELLIGENCE.md
   └─ .ai-context/              generated output (code-graph, repo map, architecture)
```

## 2. Detected languages & frameworks

| Layer    | Language        | Framework           | Notes |
|----------|-----------------|---------------------|-------|
| Frontend | TypeScript + Vue | Vue 3, Vite 8, Pinia, Vue-Router 4, Bootstrap 5, Leaflet, socket.io-client | PWA via vite-plugin-pwa |
| Backend  | TypeScript      | NestJS 11, TypeORM, Passport-JWT, Socket.IO, @nestjs/schedule/throttler | Supabase as data layer |
| AI       | TypeScript      | Gemini/OpenAI REST + heuristic fallback | server/src/ai + embedding |
| Tooling  | PowerShell      | tools/code-intelligence/generate-code-map.ps1 | regenerates code map |
| Analysis | Python 3.11     | tree-sitter + networkx (conda `ai-tools`) | tools/code-intelligence |

## 3. Entry points

**Frontend**
- `client/src/main.ts` — mounts `App`, installs Pinia + router + custom directives + PWA register.
- `client/src/router/index.ts` — route table with `requiresAuth` / `role` meta + `beforeEach` guard
  that hydrates the auth profile then enforces auth/role.

**Backend**
- `server/src/main.ts` — bootstraps Nest, global filters, throttler.
- `server/src/app.module.ts` — registers all 20 feature modules; global `ThrottlerGuard`.

## 4. Backend modules & API surface

Each feature module follows the NestJS `controller.service.module[.entity dto]` layout.
The authoritative list of modules, symbols and API routes is
`tools/code-intelligence/.ai-context/repository-map.json` → `modules[]` and `api_overview`.

Summary (route prefix → responsibilities):

| Module | Prefix / responsibilities |
|--------|---------------------------|
| auth | `POST /auth/register`, `POST /auth/login`, `GET|PUT /auth/me` (JWT) |
| users | user CRUD + profile |
| deals | create/list/detail/update deals, verification events, stock handling |
| reservations | reservation hold/claim, retry + stock compensation |
| payment | idempotent `confirmPayment`, `payment_status` enum `completed` |
| comments | comments on deals |
| stores | store CRUD (merchant) |
| merchant | merchant portal actions |
| rewards | daily spin, CAS redeem/award/like/bookmark |
| interactions | bookmarks/likes history |
| admin | admin analytics + moderation |
| analytics | dashboard metrics + realtime gateway events |
| news | news corpus feed |
| recommendation | scored suggestions |
| embedding | vector embeddings storage/similarity |
| ai | image → food recognition + deal matching |
| geo | geohash / store locations |
| socket | realtime order status via `SocketModule` |
| health | liveness/readiness |

## 5. Data models (TypeORM entities under `server/src/*/entities`)

- `user.entity.ts` — `User` + `UserRole` enum (`guest|user|moderator|admin`),
  relations to Deal, Reservation, Comment, VerificationEvent.
- `deal.entity.ts` — `Deal` + `DealStatus`, price fields, `latitude/longitude`,
  `tags`, `verified`; `VerificationEvent` entity.
- `reservation.entity.ts` — reservation flow + CAS counters.
- `payment.entity.ts` — payment + `payment_status`.
- `comment.entity.ts`, `interaction.entity.ts`, `store.entity.ts`.
- Runtime writes go through the **Supabase** client (`supabase.service.ts`) though
  TypeORM entities describe the schema for code navigation.

## 6. Authentication flow (end-to-end)

```
client LoginView → auth.store.login(email, password)
      → POST /auth/login
      → AuthService.login: bcrypt.compare → sign JWT ({id,email,role})
      → token stored in pinia (+ persistence) → router guard restores /profile
server Guards: PassportAuthGuard('jwt') + RolesGuard + OwnerGuard + ThrottlerGuard
```

## 7. Payment & reservation integrity

- Reservation is created/held; user pays; `PaymentService.confirmPayment` is
  **idempotent + CAS** — it never resurrects a completed payment; stock compensation
  runs on failed/expired reservations.
- Payment requires successful payment *before* confirm pickup (recent fix).

## 8. AI vision module (`server/src/ai/ai.service.ts`)

- `searchByImage(buffer, filename)`:
  1. `detectWithVision` → Gemini `generateContent` (if `GEMINI_API_KEY`),
     else OpenAI `chat/completions` (if `MODEL_API_KEY`/`OPENAI_API_KEY`);
  2. fallback heuristic keyword match on filename;
  3. maps detected tags→food category → `findMatchingDeals` (score + rank).
- Pure lib; also see `embedding/` for vector similarity.

## 9. Geo / realtime (`client` + `server`)

- `useLocation.ts` — `watchPosition` live tracking + permission fallback.
- `useDirections.ts` + `freeApis.ts` — OpenStreetMap/OSRM routing for the map.
- `ExploreView.vue` — Leaflet + marker clusters.
- `server/socket` + `analytics.gateway` — WebSocket realtime order status/dashboard.

## 10. High-value files for LLM context

**Frontend**
- `client/src/router/index.ts` — every route + guards; read first for flow mapping.
- `client/src/stores/auth.store.ts` — session state & API calls.
- `client/src/services/api/index.ts` (axios) & `socket/socket.ts` — network layer.
- `client/src/views/` — one view per feature.

**Backend**
- `server/src/app.module.ts` — module registry (key flows).
- `server/src/<feature>/*.controller.ts + *.service.ts` — where business rules live.
- `server/src/common/guards/*` — RBAC / ownership enforcement.
- `server/src/ai/ai.service.ts` — the multi-provider AI integration.