"""Code graph builder.

Assembles the AST facts into a NetworkX MultiDiGraph with typed nodes and
edges, resolves relative imports to real files, and derives cross-module
dependency edges. The graph is then exported to compact JSON.
"""
from __future__ import annotations

import os
from pathlib import Path

import networkx as nx

from ast_parser import FileAst, parse_file
from config import REPO_ROOT

IMPORT_EXTENSIONS = (".ts", ".tsx", ".js", ".jsx", ".vue", ".py")

RELATIONS = {"IMPORTS", "CONTAINS", "CALLS", "API", "MODULE_DEPENDS"}


def module_of(relpath: str) -> str:
    """Map a repo-relative path to its coarse-grained module name.

    server/src/<mod>/...   -> server/<mod>
    server/src/*.ts        -> server/app
    client/src/views/...   -> client/views (split out map/merchant subfolders)
    client/src/stores      -> client/stores
    """
    parts = relpath.split("/")
    if parts[0] == "server" and len(parts) >= 4 and parts[1] == "src" and parts[3] != "common":
        return f"server/{parts[2]}"
    if parts[0] == "server" and len(parts) >= 4 and parts[1] == "src" and parts[2] == "common":
        return f"server/{parts[2]}"
    if parts[0] == "server" and len(parts) >= 3 and parts[1] == "src":
        return "server/app"
    if parts[0] == "client" and len(parts) >= 4 and parts[1] == "src":
        if parts[2] == "views":
            if len(parts) >= 5:
                return f"client/views-{parts[3]}"
            return "client/views"
        if parts[2] == "stores":
            return "client/stores"
        if parts[2] == "router":
            return "client/router"
        if parts[2] == "services":
            return "client/services"
        if parts[2] == "composables":
            return "client/composables"
        if parts[2] == "components":
            return "client/components"
        return f"client/{parts[2]}"
    if parts[0] == "client":
        return "client/app"
    if parts[0] in {"scripts", "tools", "docs", "deploy"}:
        return parts[0]
    return parts[0]


class GraphBuilder:
    def __init__(self, files: list[dict], parsed: dict[str, FileAst] | None = None):
        self.files = files
        self.parsed = parsed if parsed is not None else {}
        self.file_index: dict[str, str] = {}
        for f in files:
            self.file_index[self._norm(f["relpath"])] = f["relpath"]
        self.graph = nx.MultiDiGraph()

    @staticmethod
    def _norm(relpath: str) -> str:
        return relpath.removesuffix(".vue").removesuffix(".ts").removesuffix(".tsx").removesuffix(".js").removesuffix(".jsx").removesuffix(".py")

    def _resolve_import(self, import_path: str, from_relpath: str) -> str | None:
        if import_path.startswith(("@/", "~/")):
            import_path = import_path[2:]
        elif import_path.startswith("./") or import_path.startswith("../"):
            base = os.path.dirname(from_relpath)
            import_path = os.path.normpath(os.path.join(base, import_path)).replace("\\", "/")

        def _real(key: str | None) -> str | None:
            return self.file_index[key] if key in self.file_index else None

        if import_path in self.file_index:
            return _real(import_path)
        for root_part in ("src", "server/src", "client/src"):
            found = _real(f"{root_part}/{import_path}")
            if found:
                return found

        for candidate in [f"{import_path}{e}" for e in IMPORT_EXTENSIONS]:
            found = _real(candidate)
            if found:
                return found
        for ext in IMPORT_EXTENSIONS:
            found = _real(f"{import_path}/index{ext}")
            if found:
                return found
        return _real(import_path)

    def build(self) -> "GraphBuilder":
        for f in self.files:
            relpath = f["relpath"]
            self.graph.add_node(
                f"file:{relpath}",
                id=f"file:{relpath}",
                type="file",
                name=relpath,
                language=f["language"],
                size=f["size"],
                module=module_of(relpath),
            )

        for relpath, ast in self.parsed.items():
            file_node = f"file:{relpath}"
            self.graph.nodes[file_node].setdefault("imports", len(ast.imports))

            for imp in ast.imports:
                target = self._resolve_import(imp, relpath)
                if target:
                    self.graph.add_edge(file_node, f"file:{target}", relation="IMPORTS")
                    self.graph.add_edge(
                        module_of(relpath), module_of(target), relation="MODULE_DEPENDS"
                    )

            symbol_ids = {}
            for sym in ast.symbols:
                sid = f"{sym.kind}:{relpath}:{sym.name}"
                if sym.kind == "method":
                    sid = f"method:{relpath}:{sym.detail}.{sym.name}"
                self.graph.add_node(
                    sid,
                    id=sid,
                    type=sym.kind,
                    name=sym.name,
                    file=relpath,
                    line=sym.line,
                    detail=sym.detail,
                )
                symbol_ids[sym.name] = sid
                self.graph.add_edge(file_node, sid, relation="CONTAINS")

            for api in ast.apis:
                api_id = f"api:{relpath}:{api['method']}:{api['path']}"
                self.graph.add_node(
                    api_id,
                    id=api_id,
                    type="api",
                    name=f"{api['method']} {api['path']}",
                    method=api["method"],
                    path=api["path"],
                    handler=api["handler"],
                    class_name=api["class"],
                    file=relpath,
                )
                self.graph.add_edge(file_node, api_id, relation="CONTAINS")
                handler_sid = symbol_ids.get(api["handler"])
                if handler_sid:
                    self.graph.add_edge(api_id, handler_sid, relation="API")

            for caller, callee in ast.calls:
                caller_sid = symbol_ids.get(caller)
                callee_sid = symbol_ids.get(callee)
                if caller_sid and callee_sid and caller_sid != callee_sid:
                    self.graph.add_edge(caller_sid, callee_sid, relation="CALLS")

        for f in self.files:
            mod = module_of(f["relpath"])
            self.graph.add_node(mod, id=mod, type="module", name=mod)

        return self

    def to_records(self) -> dict:
        nodes = []
        for node, data in self.graph.nodes(data=True):
            nodes.append(data)
        edges = [
            {"source": u, "target": v, "relation": d.get("relation", "CONTAINS")}
            for u, v, d in self.graph.edges(data=True)
        ]
        return {"nodes": nodes, "edges": edges}
