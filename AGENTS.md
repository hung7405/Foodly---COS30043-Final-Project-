# AGENTS.md — For AI coding agents working on Foodly

This project ships a **Code Intelligence Layer** (`tools/code-intelligence/`) so agents can
navigate the monorepo without scanning every file. Follow this workflow.

## Repository at a glance

- `client/` — Vue 3 + Vite + TypeScript SPA (Pinia, Vue-Router, Bootstrap 5, Leaflet).
- `server/` — NestJS 11 + TypeScript API (TypeORM entities, Passport-JWT, Socket.IO,
  Supabase as data layer).
- `deploy/`, `docs/`, `docker-compose.yml` — deployment and documentation.
- `tools/code-intelligence/` — the analyzer, its docs, the regeneration script and the
  generated `.ai-context/` output (all in one self-contained folder).

## MUST DO before editing code

1. **Read the map** — `tools/code-intelligence/.ai-context/architecture.md` for the
   system overview + key flows.
2. **Query focused context** for the feature you are touching:
   ```
   conda run -n ai-tools python tools/code-intelligence/context_query.py <term>
   # e.g. auth, payment, deals, ai, geo, merchant
   ```
   Prefer this over searching the whole tree.
3. **Open only the relevant files** identified by the query (returned `files`, `apis`,
   `dependencies`). Read them fully.

## Infrastructure

- Conda env `ai-tools` (Python 3.11) holds tree-sitter + networkx used by the analyzer.
- Regenerate the map after structural changes:
  ```
   .\tools\code-intelligence\generate-code-map.ps1
  ```
- If the map is stale (unknown module/file names), regenerate rather than guessing.
- Docs: `tools/code-intelligence/docs/codebase-analysis.md` and
  `tools/code-intelligence/docs/AI-CODE-INTELLIGENCE.md`.

## Conventions

- Frontend: Vue SFCs in `client/src/views/**`, Pinia stores in `client/src/stores`,
  API access through `client/src/services/api/`.
- Backend: one NestJS module per feature under `server/src/<feature>/`
  (`*.controller.ts`, `*.service.ts`, `*.module.ts`, `entities/`, `dto/`).
- Auth is JWT (Passport) via `server/src/auth`; guard work lives in `server/src/common`.
- Preserve existing patterns; keep changes minimal and consistent with the modules
  you were pointed to.