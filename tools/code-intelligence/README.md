# Foodly Code Intelligence Layer

A lightweight **Code Graph + Repository Intelligence** system that produces a compact,
machine-readable map of the codebase so LLM coding agents (OpenCode) can resolve
structure, dependencies and code flows without reading every file.

## Pipeline

```
server/  client/  ...
    │  scanner.py            (fast file discovery + language detection)
    ▼
    │  ast_parser.py         (tree-sitter: imports, functions, classes, APIs)
    ▼
    │  graph_builder.py      (NetworkX: typed nodes + IMPORTS/CONTAINS/CALLS/API edges)
    ▼
    │  exporter.py           (code-graph.json, repository-map.json, architecture.md)
    ▼
   .ai-context/   ← consumed by OpenCode (output lives here)
```

## Requirements

- Python 3.11 (conda env `ai-tools` provided)
- `tree-sitter`, `tree-sitter-language-pack`, `networkx`

```bash
conda run -n ai-tools pip install tree-sitter tree-sitter-language-pack networkx
```

## Usage

```bash
# 1. Generate the code map (whole repo)
.\generate-code-map.ps1                   # PowerShell (Windows)
conda run -n ai-tools python run.py

# 2. Query compact context for a topic
conda run -n ai-tools python context_query.py auth
conda run -n ai-tools python context_query.py payment --json
conda run -n ai-tools python context_query.py list        # list modules
```

## File layout

| File | Responsibility |
|------|----------------|
| `config.py` | repo root, language map, ignore rules, entry points, curated flows |
| `scanner.py` | walk the tree, emit file metadata |
| `ast_parser.py` | tree-sitter extraction (ts/tsx/js/vue/python) |
| `graph_builder.py` | NetworkX graph + import resolution + module deps |
| `exporter.py` | write `.ai-context/` artifacts |
| `context_query.py` | CLI for OpenCode to fetch focused context |
| `run.py` | one-command pipeline orchestrator |
| `generate-code-map.ps1` | one-command PowerShell wrapper |
| `docs/` | codebase analysis + how-to guides |

## Extending

- **New language**: add an extension → grammar entry in `config.LANGUAGE_MAP` and a
  branch in `ast_parser.parse_file` (language pack already ships most grammars).
- **New node/edge type**: extend `graph_builder.GraphBuilder.build` and add the
  relation constant to `RELATIONS`.
- **New query modes**: add argparse subcommands in `context_query.py`.
