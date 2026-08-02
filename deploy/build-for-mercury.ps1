# Build the frontend pointing at a deployed backend, then package it
# for a Mercury (WinSCP) upload.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File deploy/build-for-mercury.ps1 -BackendUrl "https://your-backend.example.com"
#
# The script:
#   1. backs up client/.env
#   2. writes VITE_API_URL / VITE_SOCKET_URL / VITE_ANALYTICS_SOCKET_URL
#      pointing at $BackendUrl
#   3. runs npm run build in client/
#   4. restores the original client/.env
#   5. zips client/dist into deploy/foodly-frontend.zip
param(
  [Parameter(Mandatory = $true)]
  [string]$BackendUrl
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$client = Join-Path $root 'client'
$envFile = Join-Path $client '.env'
$backup = "$envFile.bak"
$dist = Join-Path $client 'dist'

$url = $BackendUrl.TrimEnd('/')

Write-Host "Backend URL: $url"
Write-Host "Backing up $envFile ..."
Copy-Item $envFile $backup -Force

try {
  $apiUrl = if ($url -match '/api$') { $url } else { "$url/api" }
  $envContent = @(
    "VITE_API_URL=$apiUrl",
    "VITE_SOCKET_URL=$url",
    "VITE_ANALYTICS_SOCKET_URL=$url:3001"
  ) -join "`n"
  Set-Content -Path $envFile -Value $envContent -NoNewline

  Write-Host "Building client ..."
  Push-Location $client
  npm run build
  Pop-Location

  Write-Host "Packaging dist -> deploy/foodly-frontend.zip ..."
  if (Test-Path (Join-Path $root 'deploy\foodly-frontend.zip')) {
    Remove-Item (Join-Path $root 'deploy\foodly-frontend.zip') -Force
  }
  Compress-Archive -Path (Join-Path $dist '*') -DestinationPath (Join-Path $root 'deploy\foodly-frontend.zip') -Force

  Write-Host ""
  Write-Host "DONE. Upload deploy/foodly-frontend.zip contents via WinSCP."
  Write-Host "Frontend will call: $apiUrl"
}
finally {
  Write-Host "Restoring original $envFile ..."
  Move-Item -Path $backup -Destination $envFile -Force
}
