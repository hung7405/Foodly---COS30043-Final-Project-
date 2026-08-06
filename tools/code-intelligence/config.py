"""Central configuration for the Foodly Code Intelligence Layer.

Resolution rules:
- The repository root is derived from this file's location so the tools run
  correctly from any working directory: `<repo>/tools/code-intelligence/`.
- Output artifacts are written to `<repo>/tools/code-intelligence/.ai-context/`.
- Human documentation lives in `<repo>/tools/code-intelligence/docs/`.
"""
from __future__ import annotations

from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parents[1]

OUTPUT_DIR = TOOLS_DIR / ".ai-context"
DOCS_DIR = TOOLS_DIR / "docs"

PROJECT_NAME = "Foodly"

# Language mapping: file extension -> tree-sitter grammar name.
# Only grammars available in `tree_sitter_language_pack` are used for deep
# parsing; everything else is captured as plain file metadata.
LANGUAGE_MAP: dict[str, str] = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".jsx": "javascript",
    ".vue": "vue",
    ".py": "python",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".json": "json",
    ".md": "markdown",
    ".sql": "sql",
    ".yml": "yaml",
    ".yaml": "yaml",
}

# File extensions the AST parser understands deeply.
PARSABLE_LANGUAGES = {"typescript", "tsx", "javascript", "vue", "python"}

# Script block language <-> parser used for `.vue` files.
VUE_SCRIPT_LANGUAGE = {
    "ts": "typescript",
    "tsx": "typescript",
    "js": "javascript",
    "jsx": "javascript",
    "": "javascript",
}

# Directory / file name fragments that are never scanned.
IGNORED_DIRS = {
    "node_modules", "dist", "build", "coverage", ".git", ".svn",
    ".hg", ".opencode", ".vercel", ".next", ".nuxt", "target",
    "__pycache__", ".venv", "venv", ".pytest_cache", "data", ".idea",
    ".vscode", "migrations", "static", "tmp", ".agents", ".ai-context",
    "foodly-frontend",
}

IGNORED_FILES = {".env", ".env.*", "*.log", "*.tsbuildinfo", "package-lock.json",
                 "*.png", "*.jpg", "*.jpeg", "*.gif", "*.svg", "*.ico", "*.webp",
                 "*.docx", "*.db", "*.map", "*.woff", "*.woff2", "*.ttf"}

# Entry points surfaced to the LLM in architecture.md / repository-map.json.
ENTRYPOINTS = {
    "server": ["server/src/main.ts", "server/src/app.module.ts"],
    "client": ["client/src/main.ts", "client/src/router/index.ts", "client/src/App.vue"],
}

# Curated high-signal flows described in architecture.md. These pronouns point
# to modules and are not extracted automatically.
KEY_FLOWS = [
    {
        "name": "Authentication",
        "modules": ["server/auth", "client/stores"],
        "summary": "JWT-based register/login. AuthService hashes with bcrypt and "
                   "signs a JWT via JwtService; Passport JwtStrategy reading the "
                   "Authorization header guards protected routes. Client pinia "
                   "store persists token and restores profile on boot.",
    },
    {
        "name": "Payment",
        "modules": ["server/payment", "server/reservations"],
        "summary": "Reservation hold -> payment -> confirm pickup. Uses a CAS/idempotent "
                   "confirmPayment that never resurrects completed payments; "
                   "payment_status enum 'completed'.",
    },
    {
        "name": "AI Vision Search",
        "modules": ["server/ai", "server/embedding"],
        "summary": "searchByImage runs Gemini/OpenAI vision (fallback heuristic) to "
                   "recognise food, maps tags to categories and scores active deals "
                   "in Supabase.",
    },
    {
        "name": "Geo / Explore (realtime)",
        "modules": ["client/views-ex", "client/composables", "server/geo", "server/socket"],
        "summary": "ExploreView uses a leaflet map with useLocation watchPosition for "
                   "live tracking and OSRM routing; WebSocket gateway pushes realtime "
                   "order status.",
    },
]