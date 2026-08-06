"""Repository scanner.

Walks the repository tree (respecting ignore rules) and produces a flat list of
file metadata records. This is the first stage of the pipeline: cheap, language
agnostic and fast.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from config import IGNORED_DIRS, IGNORED_FILES, LANGUAGE_MAP, REPO_ROOT


def _matches_any(name: str, patterns: Iterable[str]) -> bool:
    for pattern in patterns:
        if pattern.endswith("*"):
            if name.startswith(pattern[:-1]):
                return True
        elif name == pattern:
            return True
    return False


def scan(root: Path | None = None) -> list[dict]:
    """Return a list of file records: {path, relpath, language, size, mtime}."""
    root = Path(root or REPO_ROOT)
    records: list[dict] = []

    for dirpath, dirnames, filenames in os.walk(root):
        dirpath_p = Path(dirpath)
        rel_dir = dirpath_p.relative_to(root)
        dirnames[:] = sorted(
            d for d in dirnames
            if not _matches_any(d, IGNORED_DIRS)
            and not rel_dir.parts[:1] == (".git",)
        )
        for filename in sorted(filenames):
            if _matches_any(filename, IGNORED_FILES):
                continue
            path = dirpath_p / filename
            relpath = path.relative_to(root).as_posix()
            try:
                stat = path.stat()
                size, mtime = stat.st_size, int(stat.st_mtime)
            except OSError:
                size, mtime = 0, 0
            ext = path.suffix.lower()
            records.append({
                "path": str(path),
                "relpath": relpath,
                "language": LANGUAGE_MAP.get(ext, ext.lstrip(".") or "text"),
                "size": size,
                "mtime": mtime,
            })

    return records


def summary(records: list[dict]) -> dict:
    """Aggregate quick stats about the scan for reporting."""
    counts: dict[str, int] = {}
    for r in records:
        counts[r["language"]] = counts.get(r["language"], 0) + 1
    return {
        "total_files": len(records),
        "by_language": dict(sorted(counts.items(), key=lambda kv: -kv[1])),
        "total_bytes": sum(r["size"] for r in records),
    }
