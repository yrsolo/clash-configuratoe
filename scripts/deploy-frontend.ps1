param([switch]$DryRun)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$bucket = [Environment]::GetEnvironmentVariable("YC_FRONTEND_BUCKET")
if ([string]::IsNullOrWhiteSpace($bucket) -or $bucket -match "replace-me") {
  throw "Set YC_FRONTEND_BUCKET to your static frontend bucket."
}
$dist = Join-Path $root "apps/web/dist"
if (-not (Test-Path -LiteralPath (Join-Path $dist "index.html"))) { throw "Run npm run build first." }
# Vite emits fingerprinted assets; upload them before the entrypoint.
$files = Get-ChildItem -LiteralPath $dist -Recurse -File | Where-Object { $_.Name -ne "index.html" }
foreach ($file in $files) {
  $key = $file.FullName.Substring($dist.Length + 1).Replace('\', '/')
  if ($DryRun) { Write-Host "Would upload: $key"; continue }
  $contentType = switch ($file.Extension.ToLowerInvariant()) {
    '.js' { 'application/javascript'; break }
    '.css' { 'text/css'; break }
    '.svg' { 'image/svg+xml'; break }
    '.png' { 'image/png'; break }
    '.ico' { 'image/x-icon'; break }
    '.json' { 'application/json'; break }
    '.map' { 'application/json'; break }
    '.woff2' { 'font/woff2'; break }
    default { 'application/octet-stream' }
  }
  $cacheControl = if ($key.StartsWith('assets/')) { 'public,max-age=31536000,immutable' } else { 'no-cache' }
  & yc storage s3 cp $file.FullName "s3://$bucket/$key" --content-type $contentType --cache-control $cacheControl
  if ($LASTEXITCODE -ne 0) { throw "Asset upload failed: $key" }
}
if ($DryRun) { Write-Host "Would upload index.html last (no-cache)."; return }
& yc storage s3 cp (Join-Path $dist "index.html") "s3://$bucket/index.html" --content-type "text/html; charset=utf-8" --cache-control "no-cache"
if ($LASTEXITCODE -ne 0) { throw "Entrypoint upload failed." }
Write-Host "Frontend deploy completed."
