"""AST parser built on tree-sitter.

Extracts the small, high-signal facts an LLM needs before editing code:

- imports (module names / relative paths)
- functions, classes, methods (with source line numbers)
- NestJS-style API routes (controller prefix + method decorators)
- TypeORM entity markers
- intra-file call relationships (best effort, symbol based)

Supported grammars: typescript, tsx, javascript, vue (SFC script blocks),
python. Everything else is left to the scanner as plain file metadata.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from tree_sitter_language_pack import get_parser

from config import PARSABLE_LANGUAGES, VUE_SCRIPT_LANGUAGE

METHOD_DECORATORS = {"Get", "Post", "Put", "Delete", "Patch", "All", "Options", "Head"}
CONTROLLER_DECORATORS = {"Controller"}
ENTITY_DECORATOR = "Entity"

_FUNC_NODE_TYPES = {"function_declaration", "method_definition", "arrow_function", "function_expression"}
_CLASS_NODE_TYPES = {"class_declaration", "abstract_class_declaration", "class_definition"}


@dataclass
class Symbol:
    name: str
    line: int
    kind: str  # function | class | method | api
    detail: str = ""


@dataclass
class FileAst:
    path: str
    language: str
    imports: list[str] = field(default_factory=list)
    symbols: list[Symbol] = field(default_factory=list)
    apis: list[dict] = field(default_factory=list)
    calls: list[tuple[str, str]] = field(default_factory=list)
    entity: bool = False


def _text(node) -> str:
    return node.text.decode("utf-8", "replace") if node else ""


def _find(node, types: set[str] | str, depth: int = 1000):
    """Yield descendant nodes matching one or more node types (BFS)."""
    wanted = {types} if isinstance(types, str) else set(types)
    stack = list(node.children)
    while stack and depth:
        child = stack.pop(0)
        if child.type in wanted:
            yield child
        stack.extend(child.children)
        depth -= 1


def _first(node, types):
    return next(_find(node, types), None)


def _line(node) -> int:
    return node.start_point[0] + 1


def _import_path(import_node) -> str | None:
    for child in _find(import_node, "string"):
        frag = _first(child, "string_fragment")
        if frag:
            return _text(frag)
    return None


def _named_imports(root) -> list[str]:
    imports: list[str] = []
    for node in _find(root, {"import_statement", "import_from_statement"}):
        path = _import_path(node)
        if path:
            imports.append(path)
    for node in _find(root, "export_statement"):
        if _first(node, "string") and _first(node, "from"):
            imports.append(_text(_first(node, "string_fragment")) or "")
    return [i for i in imports if i]


def _python_imports(root) -> list[str]:
    imports: list[str] = []
    for node in _find(root, "import_statement"):
        dotted = _first(node, "dotted_name")
        if dotted:
            imports.append(_text(dotted))
    for node in _find(root, "import_from_statement"):
        dotted = _first(node, "dotted_name")
        if dotted:
            imports.append(_text(dotted))
    return imports


def _decorator_info(decorator_node) -> tuple[str, str] | None:
    call = _first(decorator_node, "call_expression")
    if not call:
        return None
    callee = _first(call, {"identifier", "property_identifier", "member_expression"})
    name = (_text(callee).split(".")[-1]) if callee else ""
    if not name:
        return None
    args = _first(call, "arguments")
    path = ""
    if args:
        string_arg = _first(args, "string")
        if string_arg:
            frag = _first(string_arg, "string_fragment")
            path = _text(frag)
    return name, path


def _class_decorators(class_node) -> list[str]:
    """Decorators attached to a class declaration (siblings or on export stmt)."""
    names: list[str] = []
    parent = class_node.parent
    if parent and parent.type == "export_statement":
        for d in _find(parent, "decorator"):
            info = _decorator_info(d)
            if info:
                names.append(info[0])
    return names


def _controller_prefix(class_node) -> str:
    """Resolve the @Controller('x') path for a controller class."""
    parent = class_node.parent
    if not parent or parent.type != "export_statement":
        return ""
    for d in _find(parent, "decorator"):
        info = _decorator_info(d)
        if info and info[0] in CONTROLLER_DECORATORS:
            return info[1]
    return ""


def _join_path(prefix: str, path: str) -> str:
    prefix = prefix.strip().strip("/")
    path = path.strip().strip("/")
    if not prefix:
        return "/" + path if path else "/"
    if not path:
        return "/" + prefix
    return "/" + prefix + "/" + path


def _parse_js_ts(text: str, language: str) -> tuple[list[str], list[Symbol], list[dict], list[tuple[str, str]], bool]:
    parser = get_parser(language)
    tree = parser.parse(bytes(text, "utf-8"))
    root = tree.root_node

    imports = _named_imports(root)
    symbols: list[Symbol] = []
    apis: list[dict] = []
    calls: list[tuple[str, str]] = []
    entity = False

    defined: set[str] = set()

    for cls in _find(root, _CLASS_NODE_TYPES):
        name_node = _first(cls, {"type_identifier", "identifier"})
        name = _text(name_node)
        decorators = _class_decorators(cls)
        kind = "entity" if ENTITY_DECORATOR in decorators else "class"
        if kind == "entity":
            entity = True
        symbols.append(Symbol(name=name, line=_line(cls), kind=kind))
        defined.add(name)

        controller_path = _controller_prefix(cls)
        body = _first(cls, "class_body")
        if body:
            pending: list[tuple[str, str]] = []
            for child in body.children:
                if child.type == "decorator":
                    info = _decorator_info(child)
                    if info:
                        pending.append(info)
                elif child.type in {"method_definition", "public_field_definition"}:
                    mname = _text(_first(child, {"property_identifier", "identifier"}))
                    symbols.append(Symbol(name=mname, line=_line(child), kind="method", detail=name))
                    defined.add(mname)
                    for dec_name, dec_path in pending:
                        if dec_name in METHOD_DECORATORS:
                            apis.append({
                                "method": dec_name.upper(),
                                "path": _join_path(controller_path, dec_path),
                                "raw_path": dec_path,
                                "handler": mname,
                                "class": name,
                            })
                    pending = []

    for fn in _find(root, "function_declaration"):
        fname = _text(_first(fn, "identifier"))
        symbols.append(Symbol(name=fname, line=_line(fn), kind="function"))
        defined.add(fname)

    for decl in _find(root, {"lexical_declaration", "variable_declaration"}):
        for vd in _find(decl, "variable_declarator"):
            value = _first(vd, "arrow_function")
            if value:
                name_node = _first(vd, "identifier")
                if name_node:
                    fname = _text(name_node)
                    symbols.append(Symbol(name=fname, line=_line(vd), kind="function"))
                    defined.add(fname)

    for call in _find(root, "call_expression"):
        callee = _first(call, {"identifier", "property_identifier"})
        if not callee or callee.type == "property_identifier":
            continue
        callee_name = _text(callee)
        if callee_name not in defined:
            continue
        caller = _nearest_symbol(call, defined)
        if caller and caller != callee_name:
            calls.append((caller, callee_name))

    return imports, symbols, apis, calls, entity


def _nearest_symbol(node, defined: set[str]) -> str | None:
    parent = node.parent
    while parent is not None:
        if parent.type in {"function_declaration", "method_definition", "function_expression", "arrow_function"}:
            name = None
            if parent.type == "method_definition":
                name = _text(_first(parent, "property_identifier"))
            elif parent.type == "function_declaration":
                name = _text(_first(parent, "identifier"))
            else:
                decl = parent.parent
                if decl and decl.type in {"lexical_declaration", "variable_declaration"}:
                    name = _text(_first(decl, "identifier"))
            if name and name in defined:
                return name
        parent = parent.parent
    return None


def _parse_python(text: str) -> tuple[list[str], list[Symbol], list[dict], list[tuple[str, str]], bool]:
    parser = get_parser("python")
    root = parser.parse(bytes(text, "utf-8")).root_node

    imports = _python_imports(root)
    symbols: list[Symbol] = []
    calls: list[tuple[str, str]] = []
    defined: set[str] = set()

    for cls in _find(root, "class_definition"):
        cname = _text(_first(cls, "identifier"))
        symbols.append(Symbol(name=cname, line=_line(cls), kind="class"))
        defined.add(cname)
        for method in _find(_first(cls, "block") or cls, {"function_definition", "async_function_definition"}):
            mname = _text(_first(method, "identifier"))
            symbols.append(Symbol(name=mname, line=_line(method), kind="method", detail=cname))
            defined.add(mname)

    for fn in _find(root, {"function_definition", "async_function_definition"}):
        if _first(fn, "decorator"):
            continue
        if _is_method(fn):
            continue
        fname = _text(_first(fn, "identifier"))
        symbols.append(Symbol(name=fname, line=_line(fn), kind="function"))
        defined.add(fname)

    for call in _find(root, "call"):
        func = _first(call, "identifier")
        if not func:
            continue
        callee = _text(func)
        if callee not in defined:
            continue
        caller = _nearest_symbol(call, defined)
        if caller and caller != callee:
            calls.append((caller, callee))

    return imports, symbols, [], calls, False


def _is_method(fn) -> bool:
    parent = fn.parent
    return parent is not None and parent.type in {"class_definition", "block"} and _class_parent(fn) is not None


def _class_parent(node):
    parent = node.parent
    while parent is not None:
        if parent.type == "class_definition":
            return parent
        if parent.type in {"module", "file_input"}:
            return None
        parent = parent.parent
    return None


def _parse_vue(text: str, path: str) -> FileAst:
    parser = get_parser("vue")
    root = parser.parse(bytes(text, "utf-8")).root_node

    imports: list[str] = []
    symbols: list[Symbol] = []
    apis: list[dict] = []
    calls: list[tuple[str, str]] = []
    entity = False

    for script_el in _find(root, "script_element"):
        start_tag = _first(script_el, "start_tag")
        raw = _first(script_el, "raw_text")
        if not raw:
            continue
        lang_attr = re.search(r"lang\s*=\s*[\"'](\w+)[\"']", _text(start_tag)) if start_tag else None
        inner_lang = VUE_SCRIPT_LANGUAGE.get((lang_attr.group(1) if lang_attr else ""), "javascript")
        inner = _text(raw)
        if inner_lang == "typescript":
            im, sy, ap, ca, en = _parse_js_ts(inner, "typescript")
        else:
            im, sy, ap, ca, en = _parse_js_ts(inner, "javascript")
        imports.extend(im)
        symbols.extend(sy)
        apis.extend(ap)
        calls.extend(ca)
        entity = entity or en

    comp_name = Path(path).stem.replace("-", "").title()
    if not any(s.kind == "class" for s in symbols):
        symbols.append(Symbol(name=comp_name, line=1, kind="component", detail="SFC"))

    return FileAst(path=path, language="vue", imports=imports, symbols=symbols, apis=apis, calls=calls, entity=entity)


def parse_file(file_record: dict) -> FileAst:
    """Parse a single scanned file into a FileAst (metadata-only fallback)."""
    relpath = file_record["relpath"]
    language = file_record["language"]
    path = file_record["path"]

    try:
        text = Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError:
        text = ""

    if language == "vue":
        return _parse_vue(text, relpath)

    if language in {"typescript", "tsx", "javascript"}:
        imports, symbols, apis, calls, entity = _parse_js_ts(text, language)
        return FileAst(path=relpath, language=language, imports=imports,
                       symbols=symbols, apis=apis, calls=calls, entity=entity)

    if language == "python":
        imports, symbols, apis, calls, entity = _parse_python(text)
        return FileAst(path=relpath, language=language, imports=imports,
                       symbols=symbols, apis=apis, calls=calls, entity=entity)

    return FileAst(path=relpath, language=language)
