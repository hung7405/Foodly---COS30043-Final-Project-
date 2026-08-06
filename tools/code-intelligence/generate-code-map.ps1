<#
.SYNOPSIS
  Regenerates the Foodly Code Intelligence Layer output (.ai-context/).

.DESCRIPTION
  Runs the full pipeline: scanner -> tree-sitter AST parse -> NetworkX graph
  build -> export of code-graph.json, repository-map.json and architecture.md
  into tools/code-intelligence/.ai-context/.

  It auto-detects the conda environment containing tree-sitter (tree-sitter +
  tree-sitter-language-pack + networkx). Re-run after significant code changes
  so OpenCode always works against a fresh map.

.EXAMPLE
  .\tools\code-intelligence\generate-code-map.ps1
  .\tools\code-intelligence\generate-code-map.ps1 -EnvName ai-tools
#>
[CmdletBinding()]
param(
    # Conda environment holding the python tooling.
    [string]$EnvName = "ai-tools",
    # Optional direct path to a python.exe; overrides auto-detection.
    [string]$PythonPath = ""
)

$ErrorActionPreference = "Stop"
# Script now lives inside the consolidated tools/code-intelligence folder.
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

Write-Host "[code-map] repo root: $RepoRoot" -ForegroundColor Cyan

function Find-EnvPython {
    param([string]$Name)
    $bases = @(
        "$env:USERPROFILE\anaconda3",
        "$env:USERPROFILE\miniconda3",
        "C:\ProgramData\anaconda3",
        "C:\ProgramData\miniconda3"
    )
    foreach ($base in $bases) {
        $candidate = Join-Path $base "envs\$Name\python.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

$python = $null
if (-not [string]::IsNullOrEmpty($PythonPath)) {
    if (-not (Test-Path $PythonPath)) { Write-Error "PythonPath not found: $PythonPath" }
    $python = $PythonPath
}
if (-not $python) {
    $python = Find-EnvPython -Name $EnvName
}
if (-not $python) {
    Write-Warning "Could not find conda env '$EnvName' python. Falling back to 'python'."
    $python = "python"
}

Write-Host "[code-map] python: $python" -ForegroundColor Cyan
& $python (Join-Path $PSScriptRoot "run.py")
if ($LASTEXITCODE -ne 0) {
    Write-Error "Code map generation failed (exit $LASTEXITCODE)."
    exit $LASTEXITCODE
}

Write-Host "[code-map] done -> tools\code-intelligence\.ai-context\" -ForegroundColor Green
Write-Host "[code-map] query example: python tools\code-intelligence\context_query.py auth" -ForegroundColor Yellow