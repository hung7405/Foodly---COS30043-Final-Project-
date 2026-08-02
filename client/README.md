# Foodly Client — Vue 3 + TypeScript + Vite

Frontend của Foodly: map-based realtime food discovery, PWA installable.

## Tech Stack
- **Vue 3** (Composition API, `<script setup>`) + **TypeScript**
- **Vite** build tool
- **Pinia** state management (auth, deals, map, ui, analytics)
- **Vue Router 4** (routes: public / user / merchant / admin)
- **Bootstrap 5** + **Sass**
- **Leaflet + MarkerCluster** interactive map
- **Socket.IO client** realtime (order timeline, map, feed, analytics)
- **Chart.js + vue-chartjs** analytics/merchant charts
- **vite-plugin-pwa** service worker + manifest + install prompt

## Setup

```bash
npm install
```

```bash
# client/.env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (HMR), port 5173 |
| `npm run build` | Production build (includes PWA SW + manifest) |
| `npm run preview` | Preview production build (PWA active) |
| `npx vue-tsc -b --force` | Full TypeScript check |

## Structure

```
src/
├── router/            # Routes + auth guard (supports merchant/admin arrays)
├── stores/            # Pinia stores (auth.isMerchant, deals, map, ui, analytics)
├── services/api/      # Axios services (auth, deals, payments, merchant, ai, ...)
├── services/socket/   # Socket.IO connections
├── components/
│   ├── common/        # AppNavBar, RealtimeOrderTimeline, PwaInstallPrompt, ...
│   ├── map/           # MapContainer, DealMarker, MarkerCluster
│   ├── deals/         # DealCard, DealForm, DealFilters, ...
│   ├── reservation/   # ReservationButton, ReservationStatus
│   ├── comments/      # CommentSection, CommentItem, CommentForm
│   ├── merchant/      # MerchantNavBar
│   ├── dashboard/     # LiveEventChart, StatCard
│   └── admin/         # UserTable, DealModeration
└── views/             # HomeView, ExploreView, DealDetailView, merchant/*, ai-search, ...
```

## PWA
- Icons: `public/pwa/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- Config: `vite.config.ts` (registerType `autoUpdate`, runtime caching cho `/api/deals` và Unsplash images)
- `PwaInstallPrompt.vue` hiện banner install trên Chrome/Edge hỗ trợ

## Demo Accounts (seed)
- `admin@foodly.app` / `Admin@123` — admin
- `merchant@foodly.app` / `Password123!` — merchant (điều hướng: **Merchant Hub**)
- `demo@foodly.app` / `Password123!` — user
