# Foodly — AI Code Intelligence Layer

## Why this exists

Coding agents (OpenCode / LLM) working on a large monorepo spend most of their context
budget just *finding* the right files. Reading the whole tree is slow, token-heavy, and
error prone. This layer pre-computes a compact map of the repository (modules, files,
functions, classes, APIs, dependencies) so the agent can fetch only what it needs.

**Biggest win: token reduction.** Instead of feeding the whole codebase (~7 MB of source)
into context, OpenCode reads a few hundred KB of index and queries focused subgraphs
that are a tiny fraction of that.

## Architecture

```
Foodly repository (server/, client/, …)
        │
        ▼
tools/code-intelligence/scanner.py       file discovery + language detection
        │
        ▼
tools/code-intelligence/ast_parser.py     tree-sitter AST (imports/functions/classes/APIs)
        │
        ▼
tools/code-intelligence/graph_builder.py  NetworkX graph (nodes + typed edges)
        │
        ▼
tools/code-intelligence/exporter.py       .ai-context/code-graph.json, repository-map.json,
                                          architecture.md (inside this folder)
        │
        ▼
context_query.py                          focused, compact context for the agent
        │
        ▼
OpenCode → LLM coding agent
```

## Installation

- Python 3.11 + conda env `ai-tools`: `tree-sitter`, `tree-sitter-language-pack`,
  `networkx` (all present in this repo's `ai-tools` environment).
- No build step; the tooling lives in `tools/code-intelligence/`.

## Usage

### 1. Generate (or regenerate) the map

```powershell
# or (from repo root)
conda run -n ai-tools python tools\code-intelligence\run.py
```

Writes to `.ai-context/` (inside `tools/code-intelligence/`):
- `code-graph.json` — all nodes (file/function/class/api/module) + edges (IMPORTS,
  CONTAINS, CALLS, API, MODULE_DEPENDS).
- `repository-map.json` — coarse modules with their files, symbols, APIs and
  cross-module dependencies; plus a global `api_overview`.
- `architecture.md` — readable system overview + key flows.
- `stats.json` — small build metrics.

### 2. Query focused context

```powershell
conda run -n ai-tools python tools\code-intelligence\context_query.py <term>
conda run -n ai-tools python tools\code-intelligence\context_query.py auth
conda run -n ai-tools python tools\code-intelligence\context_query.py payment --json
conda run -n ai-tools python tools\code-intelligence\context_query.py list
```

Example output (already small enough for context):

```
#### Module: server/auth
- files (6): server/src/auth/auth.controller.ts, ..., server/src/auth/jwt.strategy.ts
- classes: AuthController, AuthModule, AuthService, JwtStrategy, LoginDto, RegisterDto
- apis: POST /auth/register, POST /auth/login, GET /auth/me, PUT /auth/me
- depends on: server/app, server/common, server/supabase, server/users
```

## How OpenCode uses this

OpenCode remains the coding agent. Before editing a feature it should:

1. Read `tools/code-intelligence/.ai-context/architecture.md` for the system overview
   and key flows.
2. Run `context_query.py <feature>` to pull the minimal relevant module/API/dependency set.
3. Ideally read the 1–2 most relevant files fully (the map says *which* files).

Setup is declared in the repo-root `AGENTS.md` so any OpenCode session follows this
workflow automatically.

## When to regenerate

- New files/modules added or renamed.
- API routes or entities changed.
- Dependency structure changed (`import` graph).
- `AGENTS.md` and `tools/code-intelligence/docs/AI-CODE-INTELLIGENCE.md` reference this;
  keep near tip of main.

## Quality notes

- Clean, modular Python with no unnecessary dependencies.
- Parsing is shallow-on-purpose: it extracts the high-signal facts (imports, symbols,
  routes, relations) rather than deep semantic analysis, keeping it fast (~2 s) and robust.
- The `.ai-context/` artifacts are committed to the repo so agents always have them,
  even on a fresh checkout before scanning.