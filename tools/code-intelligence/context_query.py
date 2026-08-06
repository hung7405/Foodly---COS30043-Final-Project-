"""Context query CLI for OpenCode / LLM agents.

Loads `tools/code-intelligence/.ai-context/repository-map.json` and
`tools/code-intelligence/.ai-context/code-graph.json`, then returns a compact
(token-efficient) summary of everything relevant to the query.

Usage:
    python tools/code-intelligence/context_query.py <term> [--module|--api|--file]
    python tools/code-intelligence/context_query.py authentication --json
    python tools/code-intelligence/context_query.py deals --api

The output is intentionally small — designed to feed a coding agent's context
window instead of reading the whole repository.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from config import OUTPUT_DIR, REPO_ROOT, PROJECT_NAME


def load_map() -> dict:
    with (OUTPUT_DIR / "repository-map.json").open(encoding="utf-8") as fh:
        return json.load(fh)


def load_graph() -> dict:
    with (OUTPUT_DIR / "code-graph.json").open(encoding="utf-8") as fh:
        return json.load(fh)


def _matches(text: str, term: str) -> bool:
    return term.lower() in text.lower()


def query(term: str, scope: str = "all", as_json: bool = False) -> dict:
    repo = load_map() if _map_exists() else {"modules": [], "api_overview": []}
    graph = load_graph() if _graph_exists() else {"nodes": [], "edges": []}
    mterm = term.strip()

    matched_modules = []
    for mod in repo.get("modules", []):
        # Match modules on their own signal (name/symbols/apis) — NOT file names.
        # File-name hits are reported separately below, keeping module results small.
        haystax = " ".join([
            mod["name"], " ".join(mod["functions"]), " ".join(mod["classes"]),
            " ".join(mod["apis"]),
        ])
        if not mterm or _matches(haystax, mterm):
            matched_modules.append(mod)

    matched_files = []
    for n in graph.get("nodes", []):
        if n.get("type") == "file" and (not mterm or _matches(n.get("name", ""), mterm)):
            matched_files.append(n.get("name"))

    matched_apis = [a for a in repo.get("api_overview", [])
                    if not mterm or _matches(f"{a['method']} {a['path']} {a['implemented_in']}", mterm)]

    matches = []
    if scope in {"all", "module"}:
        for m in matched_modules:
            matches.append("#### Module: " + m["name"])
            if mterm:
                hit_files = [f for f in m["files"] if mterm.lower() in f.lower()]
                hit_funcs = [f for f in m["functions"] if mterm.lower() in f.lower()]
                hit_apis = [a for a in m["apis"] if mterm.lower() in a.lower()]
                if hit_files:
                    matches.append(f"- files ({len(hit_files)}): {', '.join(hit_files)}")
                if hit_funcs:
                    matches.append(f"- functions: {', '.join(hit_funcs[:40])}")
                if hit_apis:
                    matches.append(f"- apis: {', '.join(hit_apis[:40])}")
            else:
                matches.append(f"- files ({m['file_count']}): {', '.join(m['files'])}")
                if m["functions"]:
                    matches.append(f"- functions: {', '.join(m['functions'][:40])}")
                if m["classes"]:
                    matches.append(f"- classes: {', '.join(m['classes'])}")
                if m["apis"]:
                    matches.append(f"- apis: {', '.join(m['apis'][:40])}")
            if m["dependencies"]:
                matches.append(f"- depends on: {', '.join(m['dependencies'])}")
            matches.append("")
    if scope in {"all", "file"} and matched_files:
        matches.append("**Files matching:**")
        matches += ["- " + f for f in matched_files]
        matches.append("")
    if scope in {"all", "api"} and matched_apis:
        matches.append("**API routes:**")
        matches += [f"- {a['method']} {a['path']} ({', '.join(a['implemented_in'])})" for a in matched_apis]

    if as_json:
        return {
            "project": PROJECT_NAME,
            "query": mterm,
            "modules": matched_modules,
            "files": matched_files,
            "apis": matched_apis,
        }
    return {"text": "\n".join(matches).strip() or "No matches found in repository map."}


def _map_exists() -> bool:
    return (OUTPUT_DIR / "repository-map.json").exists()


def _graph_exists() -> bool:
    return (OUTPUT_DIR / "code-graph.json").exists()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Query the Foodly code graph.")
    parser.add_argument("term", nargs="?", default="", help="search term (module, file, api, class)")
    parser.add_argument("--module", action="store_const", const="module", dest="scope", help="only modules")
    parser.add_argument("--file", action="store_const", const="file", dest="scope", help="only files")
    parser.add_argument("--api", action="store_const", const="api", dest="scope", help="only api routes")
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args(argv)
    if args.scope is None:
        args.scope = "all"

    if args.term.lower() in {"list", "ls", "modules"}:
        view = {"modules": [m["name"] for m in load_map().get("modules", [])]}
        if args.json:
            print(json.dumps(view, indent=2))
        else:
            print("\n".join(view["modules"]))
        return 0

    result = query(args.term, args.scope, args.json)
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(result["text"])
    return 0


if __name__ == "__main__":
    sys.exit(main())