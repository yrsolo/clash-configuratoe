param(
  [string]$SourceDir = "serverless/workspace-bridge",
  [string]$ZipPath = "artifacts/tmp/workspace-bridge.zip",
  [string]$GatewaySpec = "",
  [switch]$SkipGatewayUpdate,
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
function Require-Env {
  param([string]$Name)
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value) -or $value -match 'replace-me') { throw "Set environment variable: $Name" }
  return $value
}
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
function Workspace-Path {
  param([string]$Value)
  $resolved = [System.IO.Path]::GetFullPath((Join-Path $root $Value))
  if (-not $resolved.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Deployment paths must be inside this repository."
  }
  return $resolved
}
$source = Workspace-Path $SourceDir
$zip = Workspace-Path $ZipPath
$requiredFiles = @('index.js', 'package.json', 'package-lock.json', 'bin/sing-box')
foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $source $file) -PathType Leaf)) { throw "Missing function package file: $file" }
}
# Fail before any upload when a requested gateway update cannot succeed.
$gatewayId = [Environment]::GetEnvironmentVariable('YC_GATEWAY_ID')
if (-not $SkipGatewayUpdate) {
  if ([string]::IsNullOrWhiteSpace($gatewayId)) { throw "Set YC_GATEWAY_ID, or use -SkipGatewayUpdate for the first deployment." }
  if ([string]::IsNullOrWhiteSpace($GatewaySpec)) { $GatewaySpec = [Environment]::GetEnvironmentVariable('YC_GATEWAY_SPEC') }
  if ([string]::IsNullOrWhiteSpace($GatewaySpec)) { $GatewaySpec = 'deploy/yandex/gateway.local.yaml' }
  $spec = Workspace-Path $GatewaySpec
  if (-not (Test-Path -LiteralPath $spec)) { throw "Generate the gateway spec before deployment." }
  if ((Get-Content -Raw -LiteralPath $spec) -match '__[A-Z_]+__') { throw "Gateway spec contains unresolved placeholders." }
}
if (-not $DryRun) {
  if (-not (Get-Command yc -ErrorAction SilentlyContinue)) { throw 'Required command not found: yc' }
  $functionId = Require-Env 'YC_FUNCTION_ID'
  $serviceAccountId = Require-Env 'YC_SERVICE_ACCOUNT_ID'
  $deployBucket = Require-Env 'YC_DEPLOY_BUCKET'
  $environmentValues = [ordered]@{
    WORKSPACE_BUCKET = (Require-Env 'WORKSPACE_BUCKET')
    AWS_ACCESS_KEY_ID = (Require-Env 'AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = (Require-Env 'AWS_SECRET_ACCESS_KEY')
    S3_ENDPOINT = 'https://storage.yandexcloud.net'
  }
  foreach ($name in @('PROXY_URL', 'PUBLIC_APP_URL', 'S3_ENDPOINT')) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if (-not [string]::IsNullOrWhiteSpace($value)) { $environmentValues[$name] = $value }
  }
  foreach ($value in $environmentValues.Values) {
    if ($value.Contains(',')) { throw 'Function environment values must not contain commas; URL-encode them in URLs.' }
  }
}
New-Item -ItemType Directory -Path (Split-Path -Parent $zip) -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
# Package only runtime files. Cloud Functions installs dependencies from package.json;
# local node_modules, test fixtures, credentials and unrelated files must never enter the ZIP.
$stream = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $requiredFiles) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $source $file), $file, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $archive.Dispose(); $stream.Dispose() }
Write-Host 'Packaged index.js, package.json, package-lock.json and bin/sing-box.'
if ($DryRun) { Write-Host 'Dry run completed. No cloud commands were executed.'; return }
$deployObject = [Environment]::GetEnvironmentVariable('YC_DEPLOY_OBJECT')
if ([string]::IsNullOrWhiteSpace($deployObject)) { $deployObject = 'deployments/workspace-bridge.zip' }
& yc storage s3 cp $zip "s3://$deployBucket/$deployObject" --content-type 'application/zip'
if ($LASTEXITCODE -ne 0) { throw 'Function package upload failed.' }
$environmentArgs = ($environmentValues.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ','
# yc prints created version metadata, including its environment. Do not emit that JSON.
$versionOutput = & yc serverless function version create --function-id $functionId --runtime 'nodejs22' --entrypoint 'index.handler' --memory '512MB' --execution-timeout '120s' --service-account-id $serviceAccountId --package-bucket-name $deployBucket --package-object-name $deployObject --environment $environmentArgs --format json
if ($LASTEXITCODE -ne 0) { throw 'Function version creation failed.' }
$version = ($versionOutput -join "`n") | ConvertFrom-Json
Write-Host "Created function version: $($version.id)"
if (-not $SkipGatewayUpdate) {
  & yc serverless api-gateway update --id $gatewayId --spec $spec | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'API gateway update failed.' }
  Write-Host 'API gateway updated.'
}
Write-Host 'Workspace bridge deploy completed.'
