# Build the frontend pointing at a deployed backend, then package it
# for a Mercury (WinSCP) upload.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File deploy/build-for-mercury.ps1 `
#     -BackendUrl "https://your-backend.example.com" `
#     -BasePath "/cos30043/s104775470/"
#
# The script:
#   1. backs up client/.env
#   2. writes VITE_API_URL / VITE_SOCKET_URL / VITE_ANALYTICS_SOCKET_URL
#      pointing at $BackendUrl
#   3. sets VITE_BASE_URL to $BasePath (must end with '/') so Vite emits
#      assets relative to the Mercury subpath
#   4. runs npm run build in client/
#   5. restores the original client/.env
#   6. zips client/dist into deploy/foodly-frontend.zip
param(
  [Parameter(Mandatory = $true)]
  [string]$BackendUrl,

  [string]$BasePath = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$client = Join-Path $root 'client'
$envFile = Join-Path $client '.env'
$backup = "$envFile.bak"
$dist = Join-Path $client 'dist'

$url = $BackendUrl.TrimEnd('/')
$base = $BasePath.Trim()
if ($base -ne '' -and -not $base.EndsWith('/')) { $base = "$base/" }

Write-Host "Backend URL: $url"
Write-Host "Base path:   '$base'"
Write-Host "Backing up $envFile ..."
Copy-Item $envFile $backup -Force

try {
  $apiUrl = if ($url -match '/api$') { $url } else { "$url/api" }
  $envContent = @(
    "VITE_API_URL=$apiUrl",
    "VITE_SOCKET_URL=$url",
    "VITE_ANALYTICS_SOCKET_URL=$url/analytics"
  ) -join "`n"
  Set-Content -Path $envFile -Value $envContent -NoNewline

  Write-Host "Building client ..."
  $env:VITE_BASE_URL = $base
  Push-Location $client
  npm run build
  Pop-Location
  Remove-Item Env:\VITE_BASE_URL -ErrorAction SilentlyContinue

  Write-Host "Packaging dist -> deploy/foodly-frontend.zip ..."
  if (Test-Path (Join-Path $root 'deploy\foodly-frontend.zip')) {
    Remove-Item (Join-Path $root 'deploy\foodly-frontend.zip') -Force
  }
  Compress-Archive -Path (Join-Path $dist '*') -DestinationPath (Join-Path $root 'deploy\foodly-frontend.zip') -Force

  Write-Host ""
  Write-Host "DONE. Upload the CONTENTS of deploy/foodly-frontend.zip via WinSCP."
  Write-Host "Frontend will call: $apiUrl"
  Write-Host "Site base URL:      $base"
}
finally {
  Write-Host "Restoring original $envFile ..."
  Move-Item -Path $backup -Destination $envFile -Force
}
