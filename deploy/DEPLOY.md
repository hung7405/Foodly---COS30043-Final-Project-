# Deploy Foodly — Vercel (frontend) + Render (backend) + Supabase

## Architecture

```
Browser ──> Vercel (static/PWA, client/dist) ──> Render (NestJS API + Socket.IO) ──> Supabase (PostgreSQL + pgvector)
```

- **Vercel** hosts the built frontend (`client/` → `dist/`). SPA rewrites and cache
  headers are configured in `client/vercel.json`.
- **Render** hosts the NestJS backend (`server/`). It is a **persistent** Node host, so
  Socket.IO rooms and the 5-second analytics tick stay alive (no serverless polling).
- **Supabase** is the database: PostgreSQL + PostgREST + pgvector (HNSW) for the AI search.

## Files

| File | Purpose |
|------|---------|
| `client/vercel.json` | Vercel build config: `vite` framework, `npm run build`, `dist`, SPA rewrite, `sw.js`/`assets` cache headers |
| `client/.env` | Build-time API/socket URLs (`VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_ANALYTICS_SOCKET_URL`) — override on Vercel too |
| `deploy/build-for-mercury.ps1` | Optional utility that builds the client with a sub-path base for a static/mercury-style host |
| `server/src/config.ts` | Fail-fast env validation (throws on missing vars unless `NODE_ENV=test`) |

## How to deploy

### 1. Backend → Render

1. Push `server/` to a Render service (web service, Node).
2. Set env vars: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and AI model keys.
3. Render start command: `npm run start:prod` (or `npm run build && npm run start`).
4. Health check: `https://<service>.onrender.com/api/health`.

### 2. Database → Supabase

1. Run `supabase-migration.sql` against the target project.
2. Run the seed scripts to load users, stores, deals, and comments.

### 3. Frontend → Vercel

1. In `client/`, point `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_ANALYTICS_SOCKET_URL`
   at the Render host (`.env` or Vercel project env).
2. `npm run build` — type-checks with `vue-tsc` and bundles to `dist/`.
3. `vercel --prod` (or push to the Vercel-connected repo). `vercel.json` handles the
   SPA rewrite `/(.*)` → `/index.html` and immutable cache headers for `assets/`.

### 4. Verify

- Home loads, the map shows seeded deals, login works.
- WebSocket events flow: create a deal in window A and confirm the marker appears in
  window B without a refresh; watch the merchant dashboard KPI update within 5 s.
- PWA: install prompt appears; `sw.js` revalidates on each deploy.

## Notes

- The backend CORS policy reflects the request origin (`server/src/config.ts`), so
  Vercel preview URLs need no per-deploy edits.
- For a pure static host (e.g., a Mercury-style folder), use
  `deploy/build-for-mercury.ps1` to emit a sub-path build — but realtime features
  require the persistent backend above.
