param(
  [string]$SourceDir = "serverless/workspace-bridge",
  [string]$ZipPath = "serverless/workspace-bridge-package-py.zip",
  [string]$GatewaySpec = "",
  [switch]$SkipGatewayUpdate
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Require-Env {
  param([string]$Name)
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

Require-Command "yc"

$functionId = Require-Env "YC_FUNCTION_ID"
$serviceAccountId = Require-Env "YC_SERVICE_ACCOUNT_ID"
$deployBucket = Require-Env "YC_DEPLOY_BUCKET"
$workspaceBucket = Require-Env "WORKSPACE_BUCKET"
$awsAccessKeyId = Require-Env "AWS_ACCESS_KEY_ID"
$awsSecretAccessKey = Require-Env "AWS_SECRET_ACCESS_KEY"
$proxyUrl = Require-Env "PROXY_URL"

$s3Endpoint = [Environment]::GetEnvironmentVariable("S3_ENDPOINT")
if ([string]::IsNullOrWhiteSpace($s3Endpoint)) {
  $s3Endpoint = "https://storage.yandexcloud.net"
}

$deployObject = [Environment]::GetEnvironmentVariable("YC_DEPLOY_OBJECT")
if ([string]::IsNullOrWhiteSpace($deployObject)) {
  $deployObject = "deployments/clash-workspace-bridge-package-py.zip"
}

$gatewayId = [Environment]::GetEnvironmentVariable("YC_GATEWAY_ID")
if ([string]::IsNullOrWhiteSpace($GatewaySpec)) {
  $GatewaySpec = [Environment]::GetEnvironmentVariable("YC_GATEWAY_SPEC")
}
if ([string]::IsNullOrWhiteSpace($GatewaySpec)) {
  $GatewaySpec = "work/now/clash-site-public.openapi.yaml"
}

$root = Split-Path -Parent $PSScriptRoot
$resolvedSourceDir = Join-Path $root $SourceDir
$resolvedZipPath = Join-Path $root $ZipPath
$resolvedGatewaySpec = Join-Path $root $GatewaySpec

if (-not (Test-Path $resolvedSourceDir)) {
  throw "Source directory not found: $resolvedSourceDir"
}

if (Test-Path $resolvedZipPath) {
  Remove-Item $resolvedZipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($resolvedSourceDir, $resolvedZipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Write-Host "Created package: $resolvedZipPath"

& yc storage s3 cp $resolvedZipPath "s3://$deployBucket/$deployObject" --content-type "application/zip"

$environmentArgs = @(
  "AWS_ACCESS_KEY_ID=$awsAccessKeyId",
  "AWS_SECRET_ACCESS_KEY=$awsSecretAccessKey",
  "PROXY_URL=$proxyUrl",
  "S3_ENDPOINT=$s3Endpoint",
  "WORKSPACE_BUCKET=$workspaceBucket"
) -join ","

& yc serverless function version create `
  --function-id $functionId `
  --runtime "nodejs22" `
  --entrypoint "index.handler" `
  --memory "512MB" `
  --execution-timeout "120s" `
  --service-account-id $serviceAccountId `
  --package-bucket-name $deployBucket `
  --package-object-name $deployObject `
  --environment $environmentArgs `
  --tags '$latest'

if (-not $SkipGatewayUpdate -and -not [string]::IsNullOrWhiteSpace($gatewayId) -and (Test-Path $resolvedGatewaySpec)) {
  & yc serverless api-gateway update --id $gatewayId --spec $resolvedGatewaySpec
  Write-Host "Updated API gateway: $gatewayId"
} elseif (-not $SkipGatewayUpdate) {
  Write-Host "Skipped API gateway update because YC_GATEWAY_ID or spec path is missing."
}

Write-Host "Workspace bridge deploy completed."
