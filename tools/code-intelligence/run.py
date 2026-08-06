"""Pipeline orchestrator.

Usage:
    python tools/code-intelligence/run.py

Runs scanner -> AST parser -> graph builder -> exporter for the whole repo and
prints a short summary of what was produced.
"""
from __future__ import annotations

import sys
import time
from concurrent.futures import ProcessPoolExecutor

from config import PARSABLE_LANGUAGES, OUTPUT_DIR, REPO_ROOT
from exporter import export
from graph_builder import GraphBuilder
from scanner import scan, summary
from ast_parser import parse_file


def parse_many(files: list[dict], workers: int = 4) -> dict:
    """Parse all scannable files, returning {relpath: FileAst}."""
    scannable = [f for f in files if f["language"] in PARSABLE_LANGUAGES]
    parsed: dict = {}
    if workers > 1 and len(scannable) > 1:
        try:
            with ProcessPoolExecutor(max_workers=min(workers, len(scannable))) as ex:
                for rec, ast in zip(scannable, ex.map(parse_file, scannable)):
                    parsed[rec["relpath"]] = ast
            return parsed
        except (OSError, RuntimeError):
            pass
    for rec in scannable:
        parsed[rec["relpath"]] = parse_file(rec)
    return parsed


def main() -> int:
    t0 = time.time()
    print(f"[code-intelligence] scanning {REPO_ROOT}")

    files = scan(REPO_ROOT)
    stats = summary(files)
    print(f"  files={stats['total_files']} bytes={stats['total_bytes']}")

    print("  parsing ASTs ...")
    parsed = parse_many(files)
    print(f"  parsed {len(parsed)} files")

    print("  building graph ...")
    graph = GraphBuilder(files, parsed).build()

    print("  exporting artifacts ...")
    from exporter import export
    written = export(parsed, graph.to_records(), stats, OUTPUT_DIR)

    print(f"  done in {time.time() - t0:.2f}s")
    print("  wrote:")
    for p in written:
        rel = p.relative_to(REPO_ROOT)
        size = p.stat().st_size
        print(f"    {rel}  ({size:,} bytes)")

    print("  modules:", stats.get("by_language"))
    return 0


if __name__ == "__main__":
    sys.exit(main())